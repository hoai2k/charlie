/*
 * Alternate outfit colours for the dolls (window.DollOutfits).
 *
 * Outfit 0 is a doll's original clothes; outfits 1..7 recolour only her
 * clothing, accessories and dyed hair, using the masks in assets/masks/ and
 * window.DollRecolor (recolor.js). Skin and natural hair never change.
 * Each (doll, image, outfit) is recoloured once into a cached canvas.
 * See tools/recolor/README.md for how the masks are made.
 */
(() => {
  const DATA_URL = "assets/masks/outfits.json?v=20261002k";
  const KINDS = {
    sheet: key => `assets/doll_${key}_sprites.webp`,
    portrait: key => `assets/portraits/${key}.webp`,
    cheer: key => `assets/portraits/${key}_cheer.webp`,
    wave: key => `assets/portraits/${key}_wave.webp`,
    ride: key => `assets/portraits/${key}_ride.webp`
  };

  let data = null;
  const images = new Map(); // url -> Promise<HTMLImageElement>
  const luts = new Map(); // "key|n" -> LUT
  const assets = new Map(); // "key|kind|n" -> { promise, canvas }
  const urls = new Map(); // "key|kind|n" -> Promise<string>

  const ready = fetch(DATA_URL)
    .then(response => (response.ok ? response.json() : null))
    .then(json => { data = json; return Boolean(json); })
    .catch(() => false);

  function hexToRgb(hex) {
    const value = parseInt(hex.slice(1), 16);
    return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
  }

  function loadImage(url) {
    if (!images.has(url)) {
      images.set(url, new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => reject(new Error(`Could not load ${url}`));
        image.src = url;
      }));
    }
    return images.get(url);
  }

  function dollData(key) {
    return data?.dolls?.[key] || null;
  }

  // Number of outfits a doll has, including her original (1 if no data yet).
  function count(key) {
    const doll = dollData(key);
    return doll && window.DollRecolor ? 1 + doll.outfits.length : 1;
  }

  // Oklab (L, C, h in radians) to a CSS hex colour.
  function oklchToHex({ L, C, h }) {
    const a = C * Math.cos(h), b = C * Math.sin(h);
    const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
    const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
    const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
    const lin = [
      4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s
    ];
    return `#${lin.map(c => {
      const v = Math.max(0, Math.min(1, c));
      const srgb = v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055;
      return Math.round(srgb * 255).toString(16).padStart(2, "0");
    }).join("")}`;
  }

  // Swatch colour for outfit n; outfit 0 is the doll's own main clothing colour.
  function colorOf(key, n) {
    if (!n) return dollData(key) ? oklchToHex(dollData(key).stats) : null;
    const name = dollData(key)?.outfits[n - 1];
    return name ? data.palette[name] : null;
  }

  function lutFor(key, n) {
    const id = `${key}|${n}`;
    if (!luts.has(id)) {
      const doll = dollData(key);
      luts.set(id, window.DollRecolor.buildLut(doll.stats, hexToRgb(colorOf(key, n))));
    }
    return luts.get(id);
  }

  function recolor(key, kind, n, source, maskImage) {
    const canvas = document.createElement("canvas");
    canvas.width = source.naturalWidth;
    canvas.height = source.naturalHeight;
    const g = canvas.getContext("2d", { willReadFrequently: true });
    g.drawImage(maskImage, 0, 0, canvas.width, canvas.height);
    const mask = g.getImageData(0, 0, canvas.width, canvas.height).data;
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.drawImage(source, 0, 0);
    const pixels = g.getImageData(0, 0, canvas.width, canvas.height);
    const doll = dollData(key);
    window.DollRecolor.recolorPixelsLut(pixels.data, mask, doll.stats, hexToRgb(colorOf(key, n)), pixels.data, lutFor(key, n));
    g.putImageData(pixels, 0, 0);
    // Some code checks .src/.complete like an <img>; give the canvas both.
    canvas.complete = true;
    canvas.naturalWidth = canvas.width;
    canvas.naturalHeight = canvas.height;
    return canvas;
  }

  // Resolves to a canvas (or the original image for outfit 0 / any failure).
  function get(key, kind, n) {
    const id = `${key}|${kind}|${n}`;
    if (assets.has(id)) return assets.get(id).promise;
    const entry = { canvas: null };
    entry.promise = ready.then(async () => {
      const source = await loadImage(KINDS[kind](key));
      if (!n || !colorOf(key, n) || !window.DollRecolor) return source;
      try {
        const maskImage = await loadImage(`assets/masks/${key}_${kind}_mask.webp?v=20261002k`);
        entry.canvas = recolor(key, kind, n, source, maskImage);
        return entry.canvas;
      } catch (error) {
        // e.g. opened from file:// (getImageData is blocked): keep the original.
        console.warn("Outfit recolour failed; using original clothes", error);
        return source;
      }
    });
    assets.set(id, entry);
    return entry.promise;
  }

  // The recoloured canvas if it's already built, else null (and starts it).
  function getSync(key, kind, n) {
    if (!n) return null;
    const id = `${key}|${kind}|${n}`;
    if (!assets.has(id)) get(key, kind, n);
    return assets.get(id).canvas;
  }

  // A URL usable in CSS backgrounds (blob URL for recoloured outfits).
  function url(key, kind, n) {
    if (!n) return Promise.resolve(KINDS[kind](key));
    const id = `${key}|${kind}|${n}`;
    if (!urls.has(id)) {
      urls.set(id, get(key, kind, n).then(result => {
        if (!(result instanceof HTMLCanvasElement)) return KINDS[kind](key);
        return new Promise(resolve => result.toBlob(blob => resolve(blob ? URL.createObjectURL(blob) : KINDS[kind](key)), "image/png"));
      }));
    }
    return urls.get(id);
  }

  // Lowest outfit number not in `taken` (a Set), or 0 if all are used.
  function firstFree(key, taken) {
    for (let n = 0; n < count(key); n += 1) if (!taken.has(n)) return n;
    return 0;
  }

  window.DollOutfits = { ready, count, colorOf, get, getSync, url, firstFree, sourceUrl: (key, kind) => KINDS[kind](key) };
})();
