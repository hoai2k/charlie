"""Build a fixed-head puppet from imagegen art, without workbench offsets.

Requires Pillow, numpy, opencv-python. Run from any directory:
    python3 dollpuppets/tools/registered-rig/build.py claudia
The small spec describes the master once. SIFT/RANSAC registers every generated
expression; the build fails on weak registration rather than exporting guesses.
"""
import json
import hashlib
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent
GAME = ROOT.parent.parent


def rgba(path, size=None):
    im = Image.open(path).convert("RGBA")
    if size:
        im = im.resize((size, size), Image.Resampling.LANCZOS)
    return np.array(im)


def pixels(box, size):
    return tuple(round(v * size) for v in box)


def save(path, array):
    Image.fromarray(array.astype(np.uint8)).save(path, lossless=True, method=6)


def feather_box(box, size, inset=0.12):
    x1, y1, x2, y2 = pixels(box, size)
    yy, xx = np.mgrid[:size, :size]
    dx = np.minimum(xx - x1, x2 - xx) / max(1, (x2 - x1) * inset)
    dy = np.minimum(yy - y1, y2 - yy) / max(1, (y2 - y1) * inset)
    a = np.clip(np.minimum(dx, dy), 0, 1)
    return a * a * (3 - 2 * a)


def gray(im):
    rgb = im[:, :, :3].copy()
    rgb[im[:, :, 3] < 80] = 0
    return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)


def similarity(source, target, mask, ratio=0.78, contrast=0.025, threshold=3, max_error=2):
    """SIFT + RANSAC similarity transform from source to target inside mask."""
    sift = cv2.SIFT_create(nfeatures=4000, contrastThreshold=contrast)
    ka, da = sift.detectAndCompute(gray(source), mask)
    kb, db = sift.detectAndCompute(gray(target), mask)
    if da is None or db is None:
        raise ValueError("No registration features")
    pairs = cv2.BFMatcher().knnMatch(da, db, k=2)
    good = [a for a, b in pairs if a.distance < ratio * b.distance]
    if len(good) < 8:
        raise ValueError(f"Too few registration matches: {len(good)}")
    src = np.float32([ka[m.queryIdx].pt for m in good])
    dst = np.float32([kb[m.trainIdx].pt for m in good])
    matrix, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=threshold)
    if matrix is None or int(inliers.sum()) < 8:
        raise ValueError("Unreliable registration")
    residual = np.linalg.norm(cv2.transform(src[None], matrix)[0] - dst, axis=1)[inliers.ravel() > 0]
    if float(np.median(residual)) > max_error:
        raise ValueError("Registration exceeds two-pixel error")
    return matrix, {"matches": len(good), "inliers": int(inliers.sum()),
                    "medianErrorPx": round(float(np.median(residual)), 3), "matrix": matrix.round(5).tolist()}


def box_mask(size, include, exclude=()):
    mask = np.zeros((size, size), np.uint8)
    for box in include:
        x1, y1, x2, y2 = pixels(box, size)
        mask[max(0, y1):y2, max(0, x1):x2] = 255
    for box in exclude:
        x1, y1, x2, y2 = pixels(box, size)
        mask[max(0, y1):y2, max(0, x1):x2] = 0
    return mask


def compose(outer, inner):
    """Affine matrix applying inner first, then outer."""
    return (np.vstack([outer, [0, 0, 1]]) @ np.vstack([inner, [0, 0, 1]]))[:2]


def warp(image, matrix, size):
    return cv2.warpAffine(image, matrix, (size, size), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def lab(image):
    return cv2.cvtColor(np.ascontiguousarray(image[:, :, :3]), cv2.COLOR_RGB2LAB).astype(np.float32)


def match_skin(art, master, ring):
    """Shift the generated art's Lab statistics to the master skin in a ring."""
    a, m = lab(art), lab(master)
    sel = ring > 0
    mean_a, std_a = a[sel].mean(0), a[sel].std(0) + 1e-3
    mean_m, std_m = m[sel].mean(0), m[sel].std(0) + 1e-3
    out = (a - mean_a) * np.clip(std_m / std_a, 0.6, 1.6) + mean_m
    rgb = cv2.cvtColor(np.clip(out, 0, 255).astype(np.uint8), cv2.COLOR_LAB2RGB)
    return np.dstack([rgb, art[:, :, 3]])


def difference_hull(art, master, search, threshold, minimum_area):
    """Replace exactly where art differs from the master: a convex blob."""
    delta = cv2.GaussianBlur(np.linalg.norm(lab(art) - lab(master), axis=2), (0, 0), 1.5)
    changed = ((delta > threshold) & (search > 0)).astype(np.uint8)
    changed = cv2.morphologyEx(changed, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    count, labels, stats, _ = cv2.connectedComponentsWithStats(changed)
    keep = [i for i in range(1, count) if stats[i, cv2.CC_STAT_AREA] >= minimum_area]
    if not keep:
        raise ValueError("Feature patch found no changed pixels")
    points = np.argwhere(np.isin(labels, keep))[:, ::-1].astype(np.int32)
    hull = np.zeros_like(changed)
    cv2.fillConvexPoly(hull, cv2.convexHull(points), 1)
    return hull


def face_skin(master, seed, erode):
    """The master's face, without the surrounding hair, shrunk by erode px."""
    light = (cv2.GaussianBlur(lab(master)[:, :, 0], (0, 0), 2) > 75).astype(np.uint8)
    light = cv2.morphologyEx(light, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    _, labels = cv2.connectedComponents(light)
    face = (labels == labels[seed[1], seed[0]]).astype(np.uint8)
    contours, _ = cv2.findContours(face, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    filled = np.zeros_like(face)
    cv2.drawContours(filled, contours, -1, 1, -1)
    return cv2.erode(filled, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*erode+1, 2*erode+1)))


def feather(hull, grow, soft):
    core = cv2.dilate(hull, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*grow+1, 2*grow+1)))
    outer = cv2.dilate(core, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2*soft+1, 2*soft+1)))
    alpha = cv2.GaussianBlur(outer.astype(np.float32), (0, 0), soft / 2)
    return np.maximum(alpha, core.astype(np.float32))


def register(source, master):
    """Find a similarity transform using unchanged hair, bow, nose and eyes."""
    size = master.shape[0]
    # Exclude the animated mouth; the unchanged upper face/hair anchors the rig.
    mask = np.zeros((size, size), np.uint8)
    mask[:round(size * 0.60)] = 255
    matrix, report = similarity(source, master, mask)
    return warp(source, matrix, size), report


def build(key):
    cv2.setRNGSeed(0)
    spec = json.loads((ROOT / f"{key}.json").read_text())
    source = ROOT / "sources" / key
    revision_input = (ROOT / "build.py").read_bytes() + (ROOT / f"{key}.json").read_bytes()
    revision_input += b"".join((source / f"{name}.webp").read_bytes() for name in ["head", "expressions", "bodies"])
    asset_revision = hashlib.sha256(revision_input).hexdigest()[:12]
    out = GAME / "assets" / spec["assetDirectory"]
    out.mkdir(parents=True, exist_ok=True)
    size = spec["size"]
    master = rgba(source / "head.webp", size)
    report = {"registration": {}, "poses": []}
    eye_anchors = {}
    for side, window in zip(["leftEye", "rightEye"], spec["eyeAnchorWindows"]):
        x1, y1, x2, y2 = pixels(window, size)
        gray = cv2.cvtColor(master[y1:y2, x1:x2, :3], cv2.COLOR_RGB2GRAY)
        count, _, stats, centers = cv2.connectedComponentsWithStats((gray < 40).astype(np.uint8))
        if count < 2:
            raise ValueError(f"No pupil found for {side}")
        pupil = 1 + np.argmax(stats[1:, 4])
        eye_anchors[side] = {"x": float((centers[pupil][0]+x1)/size), "y": float((centers[pupil][1]+y1)/size)}
    report["headAnchors"] = {"eyes": eye_anchors, "mouth": spec["mouthAnchor"], "neck": spec["headNeck"], "pivot": spec["headPivot"]}
    atlas = Image.open(source / "expressions.webp").convert("RGBA")
    columns, rows = spec["expressionGrid"]
    hair_registered = {}
    for i, name in enumerate(spec["expressions"]):
        col, row = i % columns, i // columns
        cell = atlas.crop((round(col * atlas.width / columns), round(row * atlas.height / rows),
                           round((col + 1) * atlas.width / columns), round((row + 1) * atlas.height / rows)))
        im = np.array(cell.resize((size, size), Image.Resampling.LANCZOS))
        hair_registered[name], report["registration"][name] = register(im, master)

    # The atlas faces are a slightly different face from the master (and drift
    # a few pixels between cells), so hair alignment alone moves every mouth.
    # Instead: (1) align each cell's FACE to one reference cell using brows,
    # nose and cheeks; (2) map that reference face onto the master once for
    # the lips and once per eye. All mouths then share one transform.
    reference = spec["atlasReference"]
    face_mask = box_mask(size, [spec["faceRegisterBox"]], spec["faceRegisterExclude"])
    to_reference = {reference: np.float32([[1, 0, 0], [0, 1, 0]])}
    for name in spec["expressions"]:
        if name != reference:
            to_reference[name], report["registration"][name]["face"] = similarity(
                hair_registered[name], hair_registered[reference], face_mask, ratio=0.8, contrast=0.01, threshold=2)
    ref = hair_registered[reference]
    mouth_matrix, report["mouthFit"] = similarity(
        ref, master, box_mask(size, [spec["lipRegisterBox"]]), ratio=0.85, contrast=0.01, threshold=2)
    eye_matrices = []
    open_eyes = warp(hair_registered[spec["openEyeReference"]], to_reference[spec["openEyeReference"]], size)
    for side, box in zip(["left", "right"], spec["eyeBoxes"]):
        x1, y1, x2, y2 = box
        m = spec["eyeRegisterMargin"]
        matrix, report[f"{side}EyeFit"] = similarity(
            open_eyes, master, box_mask(size, [[x1-m, y1-m, x2+m, y2+0.01]]), ratio=0.85, contrast=0.01, threshold=2)
        eye_matrices.append(matrix)

    # Extract brows in master coordinates, then remove their static originals.
    # This is rig-layer preparation, not a new generated face: no per-state edits.
    brow_mask = np.zeros((size, size), np.uint8)
    features = {}

    def write_feature(name, art, alpha):
        ys, xs = np.where(alpha > 0.004)
        x1, y1, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        patch = art[y1:y2, x1:x2].copy()
        patch[:, :, 3] = np.rint(patch[:, :, 3] * alpha[y1:y2, x1:x2]).astype(np.uint8)
        filename = f"{name}.webp"
        save(out / filename, patch)
        features[name] = {"file": f"assets/{spec['assetDirectory']}/{filename}",
                          "box": [round(float(v) / size, 5) for v in (x1, y1, x2, y2)]}
        return [int(x1), int(y1), int(x2), int(y2)]

    for side, box in zip(["left", "right"], spec["browBoxes"]):
        write_feature(f"brow_{side}", master, feather_box(box, size))
        x1, y1, x2, y2 = pixels(box, size)
        brow_mask[y1:y2, x1:x2] = 255
    clean = master.copy()
    clean[:, :, :3] = cv2.inpaint(master[:, :, :3], brow_mask, 5, cv2.INPAINT_TELEA)
    save(out / "head.webp", clean)

    def generated_patch(name, art, baseline, search_box, threshold, grow, soft, keep_out=()):
        """Colour-match art to the master skin, then cover only what changed.

        The baseline is the neutral atlas face under the same transform: it is
        the same generated face, so differences are the expression itself plus
        the neutral feature it replaces (which the fit lines up with the master's).
        """
        search = box_mask(size, [search_box], keep_out) * skin
        x1, y1, x2, y2 = search_box
        pad = 0.025
        ring = box_mask(size, [[x1-pad, y1-pad, x2+pad, y2+pad]], [search_box, *keep_out])
        art = match_skin(art, master, ring)
        hull = difference_hull(art, match_skin(baseline, master, ring), search, threshold, spec["patchMinimumArea"])
        alpha = feather(hull, grow, soft) * (box_mask(size, [[0, 0, 1, 1]], keep_out) / 255) * soft_skin
        report["patches"][name] = write_feature(name, art, alpha)

    report["patches"] = {}
    # Patches never reach the jaw line: the atlas chin is not the master's.
    skin = face_skin(master, pixels(spec["mouthAnchor"], size), spec["skinInset"])
    soft_skin = cv2.GaussianBlur(face_skin(master, pixels(spec["mouthAnchor"], size), spec["skinInset"] // 2)
                                 .astype(np.float32), (0, 0), 2)
    for name in spec["expressions"]:
        if name != reference or spec.get("referenceHasMouth"):
            art = warp(hair_registered[name], compose(mouth_matrix, to_reference[name]), size)
            generated_patch(f"mouth_{name}", art, warp(ref, mouth_matrix, size),
                            spec["mouthSearchBox"], spec["mouthThreshold"], 5, 6)
    blink = spec["blinkExpression"]
    for side, box, matrix in zip(["left", "right"], spec["eyeBoxes"], eye_matrices):
        art = warp(hair_registered[blink], compose(matrix, to_reference[blink]), size)
        m = spec["eyeRegisterMargin"]
        generated_patch(f"blink_{side}", art, warp(open_eyes, matrix, size), [box[0]-m, box[1]-m, box[2]+m, box[3]+m],
                        spec["eyeThreshold"], 3, 4, keep_out=spec["browBoxes"])

    # Connected components find poses even if imagegen leaves unequal gutters.
    bodies = rgba(source / "bodies.webp")
    bodies[:, :, 3][bodies[:, :, 3] >= 250] = 255  # imagegen alpha tops out at 254
    # The body sheet was generated separately and came out lighter and more
    # yellow than the head. Shift its vinyl skin (one shift for all poses) to
    # the master face's average, leaving the dress, shoes and trims alone.
    face = face_skin(master, pixels(spec["mouthAnchor"], size), spec["skinInset"]) * \
        (box_mask(size, [[0, 0, 1, 1]], [*spec["eyeBoxes"], *spec["browBoxes"], spec["mouthSearchBox"]]) > 0)
    hsv = cv2.cvtColor(bodies[:, :, :3], cv2.COLOR_RGB2HSV)
    body_skin = ((hsv[:, :, 0] >= 5) & (hsv[:, :, 0] < 25) & (hsv[:, :, 1] > 60) & (hsv[:, :, 2] > 60)
                 & (bodies[:, :, 3] > 250))
    body_lab = lab(bodies)
    shift = (lab(master)[face > 0].mean(0) - body_lab[body_skin].mean(0)) * spec["bodySkinMatch"]
    weight = cv2.GaussianBlur(body_skin.astype(np.float32), (0, 0), 1)[:, :, None]
    matched = np.clip(body_lab + shift * weight, 0, 255).astype(np.uint8)
    bodies[:, :, :3] = cv2.cvtColor(matched, cv2.COLOR_LAB2RGB)
    report["bodySkinShiftLab"] = shift.round(2).tolist()
    count, labels, stats, centers = cv2.connectedComponentsWithStats((bodies[:, :, 3] > 128).astype(np.uint8))
    components = sorted(range(1, count), key=lambda i: stats[i, cv2.CC_STAT_AREA], reverse=True)[:6]
    if len(components) != 6 or min(stats[i, cv2.CC_STAT_AREA] for i in components) < 5000:
        raise ValueError("Expected six separate complete body silhouettes")
    components.sort(key=lambda i: centers[i][1])
    components = sorted(components[:3], key=lambda i: centers[i][0]) + sorted(components[3:], key=lambda i: centers[i][0])
    body_sprites = {}
    pose_layouts = {}
    for pose, component in enumerate(components, 1):
        x, y, w, h, _ = stats[component]
        art = bodies[y:y+h, x:x+w].copy()
        art[:, :, 3][labels[y:y+h, x:x+w] != component] = 0
        # Garment colour locates the torso centre independently of raised arms.
        hsv = cv2.cvtColor(art[:, :, :3], cv2.COLOR_RGB2HSV)
        fabric = (hsv[:, :, 0] > 145) & (hsv[:, :, 0] < 178) & (hsv[:, :, 1] > 120) & (art[:, :, 3] > 128)
        torso_x = int(np.median(np.where(fabric)[1]))
        central = art[:, max(0, torso_x-3):torso_x+4, 3].max(axis=1)
        neck_y = int(np.where(central > 128)[0][0])
        line_y = min(h - 1, neck_y + 8)
        opaque = art[line_y, :, 3] > 128
        left = right = torso_x
        while left > 0 and opaque[left-1]: left -= 1
        while right < w-1 and opaque[right+1]: right += 1
        neck_x = (left + right) / 2
        neck_width = right - left + 1
        if not 20 <= neck_width <= 100:
            raise ValueError(f"Pose {pose}: invalid neck width {neck_width}")
        # Existing puppets are torso cutouts. Crop from the same neck-relative
        # level in every pose rather than shrinking a full doll into the stage.
        full_height = h
        h = min(h, round(neck_y + spec["bodyCropNeckWidths"] * neck_width))
        art = art[:h]
        action_anchor = None
        if pose == 6:
            # Locate the enclosed alpha hole inside the heart hands. Exclude
            # transparent components touching the search window's boundary.
            rx1, rx2 = round(neck_x-neck_width), round(neck_x+neck_width)
            ry1, ry2 = round(neck_y+neck_width*0.6), round(neck_y+neck_width*2.2)
            inverse = (art[ry1:ry2, rx1:rx2, 3] < 128).astype(np.uint8)
            count, hole_labels, hole_stats, hole_centers = cv2.connectedComponentsWithStats(inverse)
            holes = [i for i in range(1, count) if hole_stats[i, 4] > 20
                     and hole_stats[i, 0] > 0 and hole_stats[i, 1] > 0
                     and hole_stats[i, 0]+hole_stats[i, 2] < inverse.shape[1]
                     and hole_stats[i, 1]+hole_stats[i, 3] < inverse.shape[0]]
            if not holes:
                raise ValueError("Heart pose: no enclosed hand gap found")
            hole = max(holes, key=lambda i: hole_stats[i, 4])
            action_anchor = [float(hole_centers[hole][0]+rx1), float(hole_centers[hole][1]+ry1)]
            # The gap is in front of the dress: fill it (and any smaller enclosed
            # gaps between the fingers) with dress texture copied from below the
            # hands, so the stage background never shows through her chest.
            gap = np.zeros(art.shape[:2], np.uint8)
            gap[ry1:ry2, rx1:rx2] = np.isin(hole_labels, holes)
            gap = cv2.dilate(gap, np.ones((5, 5), np.uint8)) & (art[:, :, 3] < 250)
            hsv = cv2.cvtColor(art[:, :, :3], cv2.COLOR_RGB2HSV)
            dress = (hsv[:, :, 0] > 145) & (hsv[:, :, 0] < 178) & (hsv[:, :, 1] > 120) & (art[:, :, 3] > 240)
            ys, xs = np.nonzero(gap)
            shift = next((k for k in range(1, art.shape[0] - ys.max())
                          if dress[ys + k, xs].mean() > 0.98), None)
            if shift is None:
                raise ValueError("Heart pose: no dress below the hands to fill the gap")
            fill = art[ys + shift, xs, :3].astype(np.float32) * spec["heartGapShade"]
            a = art[ys, xs, 3:4].astype(np.float32) / 255
            art[ys, xs, :3] = np.rint(art[ys, xs, :3] * a + fill * (1 - a)).astype(np.uint8)
            art[ys, xs, 3] = 255
        filename = f"pose_{pose}.webp"
        save(out / filename, art)
        neck_anchor_y = neck_y + neck_width * spec["bodyNeckDepth"]
        body_sprites[f"pose_{pose}"] = {"file": f"assets/{spec['assetDirectory']}/{filename}",
                                        "size": [int(w), int(h)], "neck": {"x": neck_x/w, "y": neck_anchor_y/h}}
        # Equal NECK width (not alpha bounds) preserves body scale across gestures.
        # h / neck_width changes with crop height; this ratio cancels that crop.
        pose_layouts[f"pose_{pose}"] = {"scale": float(h/neck_width/9), "rotation": 0, "offset": {"x": 0, "y": 0}}
        tag = spec["poseTags"][pose-1]
        if tag: pose_layouts[f"pose_{pose}"]["handTracking"] = tag
        if action_anchor:
            pose_layouts[f"pose_{pose}"]["poseAction"] = {"type": "heart", "x": action_anchor[0]/w, "y": action_anchor[1]/h}
        report["poses"].append({"pose": pose, "neckWidth": neck_width, "neck": [neck_x, neck_anchor_y], "size": [int(w), int(h)],
                                 "fullSourceHeight": int(full_height), "actionAnchor": action_anchor})

    states = ["reference", "mouth_closed", "mouth_smile", "mouth_open", "mouth_big_open", "mouth_tongue", "mouth_frown", "mouth_pucker", "expression_laugh", "expression_surprise"]
    head_meta = {"file": f"assets/{spec['assetDirectory']}/head.webp", "size": [size, size], "hasOpenEyes": True, "hasBrows": True}
    mouth_map = {"mouth_smile": "mouth_smile", "mouth_open": "mouth_medium", "mouth_big_open": "mouth_laugh", "mouth_tongue": "mouth_tongue", "mouth_frown": "mouth_frown", "mouth_pucker": "mouth_pucker", "expression_laugh": "mouth_laugh", "expression_surprise": "mouth_medium",
                 "talking_mouth_small_open": "mouth_small", "talking_mouth_medium_open": "mouth_medium", "talking_mouth_big_open": "mouth_laugh", "talking_mouth_wide": "mouth_laugh", "talking_mouth_teeth": "mouth_smile", "talking_mouth_pucker": "mouth_pucker"}
    config = {"version": 3, "name": key, "label": "Claudia", "debugOnly": False, "assetRevision": asset_revision,
              "registeredFace": {"mouths": mouth_map, "eyes": spec["eyeBoxes"], "brows": spec["browBoxes"]},
              "sprites": {"faces": {state: head_meta for state in states}, "talking": {name: head_meta for name in mouth_map if name.startswith("talking_")}, "features": features, "body": body_sprites},
              "layout": {"head": {"pivot": dict(zip(["x", "y"], spec["headPivot"])), "neck": dict(zip(["x", "y"], spec["headNeck"])), "trackingScale": 1.75, "minWidth": 128, "maxWidth": 330},
                         "body": {"startPose": 5, "heightPerHead": spec["bodyHeightPerHead"], "offset": {"x": 0, "y": 0}, "scale": 1, "rotation": 0},
                         "bodyPoses": pose_layouts, "parts": eye_anchors,
                         "mouth": {}},
              "interactions": {"kiss": {"sprite": "bubble", "origin": dict(zip(["x", "y"], spec["mouthAnchor"]))}, "fallbacks": {"expression_angry": "mouth_frown", "expression_disgust": "mouth_frown", "expression_fear": "mouth_open", "expression_squint": "mouth_pucker", "expression_thinking": "mouth_pucker", "expression_smirk_left": "mouth_smile", "expression_smirk_right": "mouth_smile"}}}
    (out / "config.js").write_text("// Generated by tools/registered-rig/build.py; edit the master spec, not offsets.\nexport default " + json.dumps(config, indent=2) + ";\n")
    (ROOT / f"{key}-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "claudia")
