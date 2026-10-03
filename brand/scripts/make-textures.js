// Generates the three Mangrove background textures into brand/textures/.
// Run: node brand/scripts/make-textures.js   (deterministic: same seed, same output)
const fs = require('fs'), path = require('path');
const W = 1920, H = 1080, OUT = path.join(__dirname, '..', 'textures');
let seed = 11; const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
const f = n => Math.round(n * 10) / 10;
const svg = (bg, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="${bg}"/>${body}</svg>\n`;

// 1. Night Roots (dark): open sky above, a tangle of prop roots below the waterline.
function roots() {
  seed = 11; let p = '';
  const WL = 640;
  for (let i = 0; i < 26; i++) { // arching prop roots from trunk points above the waterline
    const tx = rnd() * W, ty = WL - 60 - rnd() * 120, dir = rnd() < .5 ? -1 : 1, reach = 160 + rnd() * 420;
    const ex = tx + dir * reach, ey = H + 20;
    const c1x = tx + dir * reach * .25, c1y = ty - 30 - rnd() * 40, c2x = tx + dir * reach * .85, c2y = WL + rnd() * 120;
    const w = 1.5 + rnd() * 3.5, o = .28 + rnd() * .4;
    p += `<path d="M${f(tx)} ${f(ty)} C${f(c1x)} ${f(c1y)} ${f(c2x)} ${f(c2y)} ${f(ex)} ${f(ey)}" stroke="#7A4E33" stroke-width="${f(w)}" stroke-opacity="${f(o)}" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 22; i++) { // snaking surface roots near the bottom
    let x = -40 + rnd() * W * .9, y = 760 + rnd() * 300, d = `M${f(x)} ${f(y)}`;
    for (let k = 0; k < 4; k++) { const nx = x + 120 + rnd() * 260, ny = y + (rnd() - .5) * 120;
      d += ` S${f((x + nx) / 2)} ${f(ny + (rnd() - .5) * 140)} ${f(nx)} ${f(ny)}`; x = nx; y = ny; }
    p += `<path d="${d}" stroke="#7A4E33" stroke-width="${f(2 + rnd() * 6)}" stroke-opacity="${f(.18 + rnd() * .3)}" fill="none" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < 9; i++) { const y = WL + 18 + i * 9 + rnd() * 6, x = rnd() * W * .6, l = 200 + rnd() * 700; // water glints
    p += `<path d="M${f(x)} ${f(y)} H${f(x + l)}" stroke="#4DB3AB" stroke-width="1.2" stroke-opacity="${f(.12 + rnd() * .2)}" stroke-dasharray="${f(20 + rnd() * 60)} ${f(10 + rnd() * 30)}"/>`; }
  p += `<path d="M0 ${WL} H${W}" stroke="#4DB3AB" stroke-width="1.5" stroke-opacity=".55"/>`;
  for (let i = 0; i < 18; i++) p += `<circle cx="${f(rnd() * W)}" cy="${f(WL + 60 + rnd() * 400)}" r="${f(2 + rnd() * 2.5)}" fill="#C8D545" fill-opacity="${f(.35 + rnd() * .4)}"/>`;
  return svg('#0B1714', p);
}

// 2. Canopy Contours (green): bathymetry-style rings, the "measured" texture.
function contours() {
  seed = 23; let p = '';
  const centers = [[1640, 160, 18], [260, 1020, 16], [1180, 1180, 10]];
  for (const [cx, cy, n] of centers) {
    const ph = [rnd() * 6, rnd() * 6, rnd() * 6];
    for (let k = 1; k <= n; k++) {
      const r = k * 46 + k * k * 1.4; let d = '';
      for (let s = 0; s <= 60; s++) { const a = s / 60 * Math.PI * 2;
        const rr = r * (1 + .10 * Math.sin(3 * a + ph[0] + k * .08) + .06 * Math.sin(5 * a + ph[1]) + .03 * Math.sin(9 * a + ph[2] - k * .1));
        d += (s ? 'L' : 'M') + f(cx + Math.cos(a) * rr * 1.25) + ' ' + f(cy + Math.sin(a) * rr) + ' '; }
      const major = k % 5 === 0;
      p += `<path d="${d}Z" stroke="${major ? '#4DB3AB' : '#2E6B57'}" stroke-width="${major ? 1.6 : 1.1}" stroke-opacity="${major ? .55 : .7}" fill="none"/>`;
    }
  }
  for (let i = 0; i < 14; i++) { const x = 160 + rnd() * (W - 320), y = 120 + rnd() * (H - 240); // survey crosses
    p += `<path d="M${f(x - 6)} ${f(y)} H${f(x + 6)} M${f(x)} ${f(y - 6)} V${f(y + 6)}" stroke="#C8D545" stroke-opacity=".5" stroke-width="1.2"/>`; }
  return svg('#173A2E', p);
}

// 3. Survey Tide (light): survey grid, tide bands, a few evidence nodes.
function tide() {
  seed = 37; let p = '', g = '';
  for (let x = 48; x < W; x += 48) g += `M${x} 0V${H}`;
  for (let y = 48; y < H; y += 48) g += `M0 ${y}H${W}`;
  p += `<path d="${g}" stroke="#E4EAE6" stroke-width="1"/>`;
  for (let b = 0; b < 3; b++) { const base = 760 + b * 90, amp = 14 + b * 6, ph = rnd() * 6;
    for (let l = 0; l < 4; l++) { let d = '';
      for (let x = 0; x <= W; x += 24) { const y = base + l * 12 + Math.sin(x / (220 + b * 40) + ph + l * .4) * amp;
        d += (x ? 'L' : 'M') + x + ' ' + f(y) + ' '; }
      p += `<path d="${d}" stroke="#2B8C86" stroke-width="1.2" stroke-opacity="${f(.32 - b * .07 - l * .04)}" fill="none"/>`; } }
  p += `<path d="M0 712 H${W}" stroke="#2B8C86" stroke-width="1.5" stroke-opacity=".7"/>`;
  for (let i = 0; i < 10; i++) { const x = 96 + Math.floor(rnd() * 38) * 48, y = 96 + Math.floor(rnd() * 11) * 48;
    p += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="#7A4E33" stroke-opacity=".45" stroke-width="1.5"/>`; }
  return svg('#F4F7F5', p);
}

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, 'night-roots.svg'), require('./night-roots')());
fs.writeFileSync(path.join(OUT, 'canopy-contours.svg'), contours());
fs.writeFileSync(path.join(OUT, 'survey-tide.svg'), tide());
console.log('wrote', fs.readdirSync(OUT));
