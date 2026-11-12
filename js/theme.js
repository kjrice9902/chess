/*
 * Wood board look: wood-grain squares, a red leather frame and wooden pieces.
 * Everything is drawn in code (canvas textures + SVG pieces), no image files.
 */
(function () {
  /* ---------- Small noise helpers ---------- */
  function hash(x, y, seed) {
    let h = (x * 374761393 + y * 668265263 + seed * 2147483647) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  // Value noise. With a period it tiles without seams.
  function noise(x, y, seed, period) {
    const xi = Math.floor(x), yi = Math.floor(y);
    const xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const w = (a) => (period ? ((a % period) + period) % period : a);
    const a = hash(w(xi), w(yi), seed), b = hash(w(xi + 1), w(yi), seed);
    const c = hash(w(xi), w(yi + 1), seed), d = hash(w(xi + 1), w(yi + 1), seed);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y, seed, oct, period) {
    let s = 0, amp = 0.5, f = 1;
    for (let i = 0; i < oct; i++) {
      s += amp * noise(x * f, y * f, seed + i * 17, period ? period * f : 0);
      amp *= 0.5; f *= 2;
    }
    return s;
  }
  const mix = (a, b, t) => a + (b - a) * t;
  const clamp = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);

  function paint(size, fn) {
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(size, size);
    const d = img.data;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const [r, g, b] = fn(x, y);
        const i = (y * size + x) * 4;
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    return c.toDataURL("image/jpeg", 0.86);
  }

  /* Light squares: pale maple with soft swirling figure. */
  function lightWood(size) {
    const base = [232, 206, 160], dark = [190, 140, 82], pale = [246, 230, 196];
    return paint(size, (x, y) => {
      const warp = fbm(x / 70, y / 55, 3, 4) * 7;
      const ring = 0.5 + 0.5 * Math.sin((x / 26 + y / 60 + warp) * Math.PI);
      const fine = noise(x / 1.6, y / 9, 11);
      const swirl = fbm(x / 22, y / 22, 7, 3);
      let t = clamp(ring * 0.6 + (swirl - 0.5) * 1.1 + (fine - 0.5) * 0.3);
      const col = t > 0.5 ? base.map((c, i) => mix(c, dark[i], (t - 0.5) * 1.5)) : base.map((c, i) => mix(pale[i], c, t * 2));
      return col;
    });
  }

  /* Dark squares: walnut with darker streaks. */
  function darkWood(size) {
    const base = [133, 82, 44], dark = [76, 42, 20], light = [160, 104, 58];
    return paint(size, (x, y) => {
      const warp = fbm(x / 80, y / 40, 21, 4) * 9;
      const grain = 0.5 + 0.5 * Math.sin((y / 14 + x / 90 + warp) * Math.PI);
      const fibre = noise(x / 14, y / 1.4, 31);
      const blot = fbm(x / 30, y / 30, 41, 3);
      const t = clamp(grain * 0.6 + (blot - 0.5) * 0.8 + (fibre - 0.5) * 0.3);
      return t > 0.5 ? base.map((c, i) => mix(c, dark[i], (t - 0.5) * 1.6)) : base.map((c, i) => mix(light[i], c, t * 2));
    });
  }

  /* Red leather: fine pebble grain that tiles. */
  function leather(size) {
    const P = 32;
    return paint(size, (x, y) => {
      const n1 = noise((x / size) * P, (y / size) * P, 51, P);
      const n2 = noise((x / size) * P * 2, (y / size) * P * 2, 52, P * 2);
      const soft = fbm((x / size) * 4, (y / size) * 4, 53, 3, 4);
      const pebble = Math.abs(n1 - 0.5) * 2;
      const t = clamp(0.45 + (soft - 0.5) * 0.6 - pebble * 0.35 + (n2 - 0.5) * 0.25);
      return [mix(70, 140, t), mix(14, 36, t), mix(12, 30, t)];
    });
  }

  /* ---------- Wooden pieces (SVG) ---------- */
  // Shapes use a 100 x 100 box. "B" is filled with the body gradient, "C" is a darker collar.
  const BASE = `<path class="B" d="M18 92 Q18 82 26 81 L74 81 Q82 82 82 92 Z"/><rect class="C" x="24" y="76" width="52" height="7" rx="3.5"/>`;
  const SHAPES = {
    p: `${BASE}<path class="B" d="M30 77 Q40 66 42 54 L58 54 Q60 66 70 77 Z"/>
        <ellipse class="C" cx="50" cy="53" rx="15" ry="4.2"/><circle class="B" cx="50" cy="38" r="13"/>`,
    r: `${BASE}<path class="B" d="M28 77 L33 41 L67 41 L72 77 Z"/>
        <ellipse class="C" cx="50" cy="42" rx="21" ry="4"/>
        <path class="B" d="M27 39 L27 16 L36 16 L36 23 L45 23 L45 16 L55 16 L55 23 L64 23 L64 16 L73 16 L73 39 Z"/>`,
    n: `${BASE}<path class="B" d="M70 77 C76 60 74 34 62 22 L60 10 L53 19 C44 18 31 28 22 43 C19 48 22 54 29 53 C35 52 40 50 44 47 C42 57 33 65 31 77 Z"/>
        <path class="M" d="M62 22 C72 34 74 58 69 76" fill="none"/>
        <circle class="E" cx="44" cy="31" r="2.6"/><circle class="E" cx="26" cy="47" r="1.6"/>`,
    b: `${BASE}<path class="B" d="M30 77 Q42 64 42 57 L58 57 Q58 64 70 77 Z"/>
        <ellipse class="C" cx="50" cy="56" rx="15.5" ry="4.2"/>
        <path class="B" d="M50 16 C65 26 67 41 61 51 L39 51 C33 41 35 26 50 16 Z"/>
        <path class="M" d="M57 27 L47 39" fill="none"/><circle class="B" cx="50" cy="12" r="4.5"/>`,
    q: `${BASE}<path class="B" d="M27 77 Q41 62 41 47 L59 47 Q59 62 73 77 Z"/>
        <ellipse class="C" cx="50" cy="46" rx="15" ry="4"/>
        <path class="B" d="M35 44 L26 21 L39 32 L43 17 L50 30 L57 17 L61 32 L74 21 L65 44 Z"/>
        <circle class="B" cx="26" cy="20" r="4"/><circle class="B" cx="43" cy="15" r="4"/><circle class="B" cx="57" cy="15" r="4"/><circle class="B" cx="74" cy="20" r="4"/>`,
    k: `${BASE}<path class="B" d="M27 77 Q41 61 41 45 L59 45 Q59 61 73 77 Z"/>
        <ellipse class="C" cx="50" cy="44" rx="15" ry="4"/>
        <path class="B" d="M35 42 C32 30 39 23 50 23 C61 23 68 30 65 42 Z"/>
        <path class="B" d="M47 4 L53 4 L53 9 L58 9 L58 15 L53 15 L53 23 L47 23 L47 15 L42 15 L42 9 L47 9 Z"/>`,
  };

  function svgDefs() {
    const grad = (id, stops) =>
      `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="16" y1="0" x2="84" y2="0">${stops
        .map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join("")}</linearGradient>`;
    const shine = (id, op) =>
      `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="40" cy="30" r="45"><stop offset="0" stop-color="#fff" stop-opacity="${op}"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>`;
    let syms = "";
    for (const color of ["w", "b"]) {
      for (const t of Object.keys(SHAPES)) {
        // Draw the shape twice: wood gradient, then a soft light from the top left.
        const edge = color === "w" ? "#5e3a12" : "#000";
        const line = color === "w" ? "#7a4d1c" : "#000";
        const body = SHAPES[t]
          .replace(/class="B"/g, `fill="url(#wood-${color})" stroke="${edge}" stroke-width="1.3" stroke-linejoin="round"`)
          .replace(/class="C"/g, `fill="url(#wood-${color}c)" stroke="${edge}" stroke-width="1.3"`)
          .replace(/class="M"/g, `stroke="${line}" stroke-width="2.2" stroke-linecap="round" opacity="0.7"`)
          .replace(/class="E"/g, `fill="${color === "w" ? "#3b2209" : "#000"}"`);
        const gloss = SHAPES[t]
          .replace(/class="[BC]"/g, `fill="url(#shine-${color})"`)
          .replace(/<[^>]*class="[ME]"[^>]*\/>/g, "");
        syms += `<symbol id="pc-${color}${t}" viewBox="0 0 100 100"><g transform="translate(50 0) scale(1.14 1) translate(-50 0)">${body}${gloss}</g></symbol>`;
      }
    }
    return `<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>
      ${grad("wood-w", [[0, "#9a6a33"], [0.18, "#e7c088"], [0.38, "#f7deae"], [0.62, "#dcac6a"], [0.85, "#a8722f"], [1, "#7a4d1c"]])}
      ${grad("wood-wc", [[0, "#7f5426"], [0.35, "#d9ab6b"], [0.7, "#a87230"], [1, "#6a4218"]])}
      ${grad("wood-b", [[0, "#1c1c1c"], [0.2, "#5a5651"], [0.38, "#6e6a64"], [0.6, "#34312e"], [0.85, "#191817"], [1, "#0c0c0c"]])}
      ${grad("wood-bc", [[0, "#111"], [0.35, "#4a4642"], [0.7, "#222"], [1, "#080808"]])}
      ${shine("shine-w", 0.35)}${shine("shine-b", 0.18)}
      ${syms}</defs></svg>`;
  }

  /* ---------- Apply ---------- */
  function apply() {
    const holder = document.createElement("div");
    holder.innerHTML = svgDefs();
    document.body.prepend(holder.firstElementChild);

    let light = "", dark = "", hide = "";
    try {
      light = lightWood(512);
      dark = darkWood(512);
      hide = leather(256);
    } catch (e) { /* canvas blocked: plain colors still work */ }

    // Each square shows a different part of the big wood picture.
    let css = "";
    const files = "abcdefgh";
    for (let f = 0; f < 8; f++) {
      for (let r = 1; r <= 8; r++) {
        const sq = files[f] + r;
        const ox = ((f * 37 + r * 53) % 100), oy = ((f * 71 + r * 29) % 100);
        css += `.sq[data-sq="${sq}"]{background-position:${ox}% ${oy}%}`;
      }
    }
    if (light) css += `.sq.l{background-image:url(${light})}.sq.d{background-image:url(${dark})}`;
    if (hide) css += `.board-frame{background-image:url(${hide})}`;
    const style = document.createElement("style");
    style.textContent = css;
    document.head.appendChild(style);
  }

  window.Theme = { apply, pieceSvg: (color, type) => `<svg class="pc" viewBox="6 2 88 92" aria-hidden="true"><use href="#pc-${color}${type}"/></svg>` };
})();
