"""Build a fixed-head puppet from imagegen art, without workbench offsets.

Requires Pillow, numpy, opencv-python. Run from any directory:
    python3 dollpuppets/tools/registered-rig/build.py claudia
The small spec describes the master once. SIFT/RANSAC registers every generated
expression; the build fails on weak registration rather than exporting guesses.
"""
import json
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


def register(source, master):
    """Find a similarity transform using unchanged hair, bow, nose and eyes."""
    def gray(im):
        rgb = im[:, :, :3].copy()
        rgb[im[:, :, 3] < 80] = 0
        return cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY)

    size = master.shape[0]
    sift = cv2.SIFT_create(nfeatures=4000, contrastThreshold=0.025)
    # Exclude the animated mouth; the unchanged upper face/hair anchors the rig.
    mask = np.zeros((size, size), np.uint8)
    mask[:round(size * 0.60)] = 255
    ka, da = sift.detectAndCompute(gray(source), mask)
    kb, db = sift.detectAndCompute(gray(master), mask)
    if da is None or db is None:
        raise ValueError("No registration features")
    pairs = cv2.BFMatcher().knnMatch(da, db, k=2)
    good = [a for a, b in pairs if a.distance < 0.78 * b.distance]
    if len(good) < 8:
        raise ValueError(f"Too few registration matches: {len(good)}")
    src = np.float32([ka[m.queryIdx].pt for m in good])
    dst = np.float32([kb[m.trainIdx].pt for m in good])
    matrix, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC, ransacReprojThreshold=3)
    if matrix is None or int(inliers.sum()) < 8:
        raise ValueError("Unreliable registration")
    residual = np.linalg.norm(cv2.transform(src[None], matrix)[0] - dst, axis=1)[inliers.ravel() > 0]
    if float(np.median(residual)) > 2:
        raise ValueError("Expression registration exceeds two-pixel error")
    warped = cv2.warpAffine(source, matrix, (size, size), flags=cv2.INTER_CUBIC)
    return warped, {"matches": len(good), "inliers": int(inliers.sum()),
                    "medianErrorPx": round(float(np.median(residual)), 3), "matrix": matrix.tolist()}


def build(key):
    cv2.setRNGSeed(0)
    spec = json.loads((ROOT / f"{key}.json").read_text())
    source = ROOT / "sources" / key
    out = GAME / "assets" / spec["assetDirectory"]
    out.mkdir(parents=True, exist_ok=True)
    size = spec["size"]
    master = rgba(source / "head.webp", size)
    report = {"registration": {}, "poses": []}
    atlas = Image.open(source / "expressions.webp").convert("RGBA")
    columns, rows = spec["expressionGrid"]
    registered = {}
    for i, name in enumerate(spec["expressions"]):
        col, row = i % columns, i // columns
        cell = atlas.crop((round(col * atlas.width / columns), round(row * atlas.height / rows),
                           round((col + 1) * atlas.width / columns), round((row + 1) * atlas.height / rows)))
        im = np.array(cell.resize((size, size), Image.Resampling.LANCZOS))
        registered[name], report["registration"][name] = register(im, master)

    # Extract brows in master coordinates, then remove their static originals.
    # This is rig-layer preparation, not a new generated face: no per-state edits.
    brow_mask = np.zeros((size, size), np.uint8)
    features = {}

    def feature(name, art, box):
        x1, y1, x2, y2 = pixels(box, size)
        if name.startswith(("mouth_", "blink_")):
            # Poisson blending matches the master skin at the patch boundary;
            # an oval mask stays away from hair and the curved jaw corners.
            mask = np.zeros((size, size), np.uint8)
            cv2.ellipse(mask, ((x1+x2)//2, (y1+y2)//2),
                        ((x2-x1)//2-2, (y2-y1)//2-2), 0, 0, 360, 255, -1)
            blended = cv2.seamlessClone(art[:, :, :3], master[:, :, :3], mask,
                                       ((x1+x2)//2, (y1+y2)//2), cv2.NORMAL_CLONE)
            art = art.copy()
            art[:, :, :3] = blended
        patch = art[y1:y2, x1:x2].copy()
        fade = feather_box(box, size)[y1:y2, x1:x2]
        patch[:, :, 3] = np.rint(patch[:, :, 3] * fade).astype(np.uint8)
        filename = f"{name}.webp"
        save(out / filename, patch)
        features[name] = {"file": f"assets/{spec['assetDirectory']}/{filename}", "box": list(box)}

    for side, box in zip(["left", "right"], spec["browBoxes"]):
        feature(f"brow_{side}", master, box)
        x1, y1, x2, y2 = pixels(box, size)
        brow_mask[y1:y2, x1:x2] = 255
    clean = master.copy()
    clean[:, :, :3] = cv2.inpaint(master[:, :, :3], brow_mask, 5, cv2.INPAINT_TELEA)
    save(out / "head.webp", clean)

    for name in spec["expressions"]:
        if name != "blink":
            feature(f"mouth_{name}", registered[name], spec["mouthBox"])
    for side, box in zip(["left", "right"], spec["eyeBoxes"]):
        feature(f"blink_{side}", registered["blink"], box)

    # Connected components find poses even if imagegen leaves unequal gutters.
    bodies = rgba(source / "bodies.webp")
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
        filename = f"pose_{pose}.webp"
        save(out / filename, art)
        body_sprites[f"pose_{pose}"] = {"file": f"assets/{spec['assetDirectory']}/{filename}",
                                        "size": [int(w), int(h)], "neck": {"x": neck_x/w, "y": (neck_y+3)/h}}
        # Equal NECK width (not alpha bounds) preserves body scale across gestures.
        # h / neck_width changes with crop height; this ratio cancels that crop.
        pose_layouts[f"pose_{pose}"] = {"scale": float(h/neck_width/9), "rotation": 0, "offset": {"x": 0, "y": 0}}
        tag = spec["poseTags"][pose-1]
        if tag: pose_layouts[f"pose_{pose}"]["handTracking"] = tag
        if pose == 6: pose_layouts[f"pose_{pose}"]["poseAction"] = {"type": "heart", "x": neck_x/w, "y": 0.16}
        report["poses"].append({"pose": pose, "neckWidth": neck_width, "neck": [neck_x, neck_y+3], "size": [int(w), int(h)]})

    states = ["reference", "mouth_closed", "mouth_smile", "mouth_open", "mouth_big_open", "mouth_tongue", "mouth_frown", "mouth_pucker", "expression_laugh", "expression_surprise"]
    head_meta = {"file": f"assets/{spec['assetDirectory']}/head.webp", "size": [size, size], "hasOpenEyes": True, "hasBrows": True}
    mouth_map = {"mouth_smile": "mouth_smile", "mouth_open": "mouth_medium", "mouth_big_open": "mouth_laugh", "mouth_tongue": "mouth_tongue", "mouth_frown": "mouth_frown", "mouth_pucker": "mouth_pucker", "expression_laugh": "mouth_laugh", "expression_surprise": "mouth_medium",
                 "talking_mouth_small_open": "mouth_small", "talking_mouth_medium_open": "mouth_medium", "talking_mouth_big_open": "mouth_laugh", "talking_mouth_wide": "mouth_laugh", "talking_mouth_teeth": "mouth_smile", "talking_mouth_pucker": "mouth_pucker"}
    config = {"version": 3, "name": key, "label": "Claudia", "debugOnly": False,
              "registeredFace": {"mouths": mouth_map, "eyes": spec["eyeBoxes"], "brows": spec["browBoxes"]},
              "sprites": {"faces": {state: head_meta for state in states}, "talking": {name: head_meta for name in mouth_map if name.startswith("talking_")}, "features": features, "body": body_sprites},
              "layout": {"head": {"pivot": dict(zip(["x", "y"], spec["headPivot"])), "neck": dict(zip(["x", "y"], spec["headNeck"])), "trackingScale": 1.75, "minWidth": 128, "maxWidth": 420},
                         "body": {"startPose": 5, "heightPerHead": spec["bodyHeightPerHead"], "offset": {"x": 0, "y": 0}, "scale": 1, "rotation": 0},
                         "bodyPoses": pose_layouts, "parts": {side: {"x": (box[0]+box[2])/2, "y": (box[1]+box[3])/2} for side, box in zip(["leftEye", "rightEye"], spec["eyeBoxes"])},
                         "mouth": {}},
              "interactions": {"kiss": {"sprite": "bubble"}, "fallbacks": {"expression_angry": "mouth_frown", "expression_disgust": "mouth_frown", "expression_fear": "mouth_open", "expression_squint": "mouth_pucker", "expression_thinking": "mouth_pucker", "expression_smirk_left": "mouth_smile", "expression_smirk_right": "mouth_smile"}}}
    (out / "config.js").write_text("// Generated by tools/registered-rig/build.py; edit the master spec, not offsets.\nexport default " + json.dumps(config, indent=2) + ";\n")
    (ROOT / f"{key}-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    build(sys.argv[1] if len(sys.argv) > 1 else "claudia")
