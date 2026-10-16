import * as THREE from 'three';
import { random } from './catalog.js';

// Ghost v4 rare cloth prints (2026-09-28): velvet, lace, quilted patchwork, tie-dye,
// glow-in-the-dark. Canvas top is the crown (v=0), bottom the hem; x wraps around
// the body with x=256 at the front. One world unit is ~135 px across, ~245 px down,
// so shapes are drawn wider than tall to look round on the cloth.
export const FABRIC_PRINT_VERSION = 'fabrics-01';
export const PRINT_FINISHES = ['velvet', 'lace', 'quilt', 'tie_dye', 'glow'];
const SIZE = 512, SX = 1.8; // horizontal stretch that makes a canvas circle round on the body

function canvas() { const c = document.createElement('canvas'); c.width = c.height = SIZE; return c; }
function texture(c, name, color = true) {
  const t = new THREE.CanvasTexture(c);
  if (color) t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; t.name = name;
  return t;
}
const mix = (a, b, t) => { const A = new THREE.Color(a), B = new THREE.Color(b); return '#' + A.lerp(B, t).getHexString(); };
function ellipse(ctx, x, y, rx, ry, fill = true) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); fill ? ctx.fill() : ctx.stroke(); }
// Draw a motif at x and at its wrap-around copies so nothing is cut at the back seam.
function wrapped(fn, x, ...rest) { for (const dx of [-SIZE, 0, SIZE]) fn(x + dx, ...rest); }

function velvet(traits) {
  const c = canvas(), ctx = c.getContext('2d'), r = random(5011), base = traits.colors[0];
  // Crushed pile: soft lighter and darker drifts, very low contrast.
  for (let i = 0; i < 44; i++) {
    const x = r() * SIZE, y = 120 + r() * 400, w = 40 + r() * 70, light = r() > .5;
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    const tone = light ? mix(base, '#ffffff', .22) : mix(base, '#000000', .28);
    g.addColorStop(0, tone + '24'); g.addColorStop(1, tone + '00');
    wrapped(x0 => { ctx.save(); ctx.translate(x0, y); ctx.rotate(r() * 3); ctx.scale(w * SX * .6, w * .45); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill(); ctx.restore(); }, x);
  }
  return { map: texture(c, 'fabric-velvet') };
}

function lace(traits) {
  const c = canvas(), ctx = c.getContext('2d'), thread = mix(traits.colors[0], '#7a6d58', .62);
  const a = canvas(), mask = a.getContext('2d');
  mask.fillStyle = '#fff'; mask.fillRect(0, 0, SIZE, SIZE);
  ctx.strokeStyle = ctx.fillStyle = thread; ctx.lineCap = 'round';
  // Fine net over the skirt.
  ctx.globalAlpha = .34; ctx.lineWidth = 1.2;
  for (let x = -SIZE; x < SIZE * 2; x += 18) { ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x + 180, 470); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x, 150); ctx.lineTo(x - 180, 470); ctx.stroke(); }
  ctx.globalAlpha = 1;
  // Floral sprigs.
  const sprig = (x, y) => {
    ctx.lineWidth = 2.2;
    for (let i = 0; i < 6; i++) { const t = i / 6 * Math.PI * 2; ellipse(ctx, x + Math.cos(t) * 13 * SX * .6, y + Math.sin(t) * 9, 7 * SX * .6, 5, false); }
    ellipse(ctx, x, y, 4 * SX * .6, 3);
  };
  for (let row = 0; row < 3; row++) for (let col = 0; col < 6; col++) wrapped(sprig, col * 85 + (row % 2) * 42, 205 + row * 62);
  // Scalloped border with eyelet holes; the scallops cut the hem edge itself.
  const scallops = 14, w = SIZE / scallops;
  ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, 418); ctx.lineTo(SIZE, 418); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 426); ctx.lineTo(SIZE, 426); ctx.stroke();
  for (let i = 0; i < scallops; i++) {
    const x = (i + .5) * w;
    ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, 470, w / 2, 34, 0, 0, Math.PI); ctx.stroke();
    ctx.lineWidth = 2.5; ellipse(ctx, x, 448, 8 * SX * .7, 7, false);
    for (const dx of [-.3, .3]) ellipse(ctx, x + dx * w, 462, 3.5 * SX * .7, 3.5, false);
  }
  // Everything below the scallop curve is cut: redraw as white scallops over a black strip.
  mask.fillStyle = '#000'; mask.fillRect(0, 486, SIZE, 26);
  mask.fillStyle = '#fff';
  for (let i = 0; i < scallops; i++) { const x = (i + .5) * w; mask.beginPath(); mask.ellipse(x, 470, w / 2, 36, 0, 0, Math.PI); mask.fill(); }
  mask.fillStyle = '#000';
  for (let i = 0; i < scallops; i++) { const x = (i + .5) * w; ellipse(mask, x, 448, 6 * SX * .7, 5.2); for (const dx of [-.3, .3]) ellipse(mask, x + dx * w, 462, 2.2 * SX * .7, 2.2); }
  const alpha = texture(a, 'fabric-lace-openwork', false);
  alpha.minFilter = THREE.LinearFilter; alpha.generateMipmaps = false;
  return { map: texture(c, 'fabric-lace'), alpha };
}

function quilt(traits) {
  const c = canvas(), ctx = c.getContext('2d'), r = random(8081);
  const colors = ['#e8b865', '#d98270', '#7fb0cf', '#a6cbb4', '#efe4c8', '#b3a3c8', '#c9735f', '#e7c6a2'];
  const cols = 12, rows = 7, w = SIZE / cols, h = 76, y0 = -20;
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    const x = col * w, y = y0 + row * h, color = colors[(col * 3 + row * 5 + Math.floor(r() * 2)) % colors.length];
    const g = ctx.createRadialGradient(x + w / 2, y + h / 2, 2, x + w / 2, y + h / 2, h * .62);
    g.addColorStop(0, mix(color, '#ffffff', .16)); g.addColorStop(.7, color); g.addColorStop(1, mix(color, '#3a3040', .22));
    ctx.fillStyle = g; ctx.fillRect(x, y, w + .5, h + .5);
    // A small print on some patches: dots or a tiny cross-hatch.
    const kind = (col + row * 2) % 4;
    ctx.fillStyle = ctx.strokeStyle = mix(color, '#ffffff', .45);
    if (kind === 1) for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) ellipse(ctx, x + 8 + i * 13, y + 12 + j * 17, 2.4 * SX * .6, 2.4);
    if (kind === 3) { ctx.lineWidth = 1.2; for (let i = -40; i < 80; i += 11) { ctx.beginPath(); ctx.moveTo(x + i, y); ctx.lineTo(x + i + 40, y + h); ctx.stroke(); } }
  }
  // Seams and running stitches.
  ctx.fillStyle = '#6b5a4c'; ctx.globalAlpha = .55;
  for (let col = 0; col <= cols; col++) ctx.fillRect(col * w - 1, 0, 2, SIZE);
  for (let row = 0; row <= rows; row++) ctx.fillRect(0, y0 + row * h - 1, SIZE, 2);
  ctx.globalAlpha = 1; ctx.strokeStyle = '#f6ecd6'; ctx.lineWidth = 1.4; ctx.setLineDash([4, 4]);
  for (let col = 0; col < cols; col++) for (let row = 0; row < rows; row++) ctx.strokeRect(col * w + 4.5, y0 + row * h + 5, w - 9, h - 10);
  ctx.setLineDash([]);
  return { map: texture(c, 'fabric-quilt') };
}

function tieDye() {
  const c = canvas(), ctx = c.getContext('2d'), img = ctx.createImageData(SIZE, SIZE);
  const bands = ['#e8698f', '#f2a553', '#f1d665', '#71c29d', '#5c9fd8', '#8e76c9'].map(h => new THREE.Color(h));
  const white = new THREE.Color('#fbf5ea'), col = new THREE.Color();
  for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
    const a = (x / SIZE - .5) * Math.PI * 2, dx = Math.sin(a) * .62, dz = Math.cos(a), dy = (y - 300) / 245;
    const r = Math.hypot(dx, dy) + Math.max(0, -dz) * .6;
    const theta = Math.atan2(dy, dx) / (Math.PI * 2), front = Math.max(0, dz) ** .5;
    const t = r * 3.1 + theta * 1.0 * front + .08 * Math.sin(a * 5 + y * .05);
    const q = ((t % 1) + 1) % 1 * bands.length, i = Math.floor(q), f = q - i;
    col.copy(bands[i % bands.length]).lerp(bands[(i + 1) % bands.length], THREE.MathUtils.smoothstep(f, .55, 1));
    // Pale crinkle lines where the cloth was bound.
    const crinkle = Math.abs(Math.sin((theta * 6 + r * .9) * Math.PI * 2 + Math.sin(r * 18) * .6));
    col.lerp(white, (1 - THREE.MathUtils.smoothstep(crinkle, .0, .12)) * .55);
    const k = (y * SIZE + x) * 4; col.convertLinearToSRGB?.();
    img.data[k] = col.r * 255; img.data[k + 1] = col.g * 255; img.data[k + 2] = col.b * 255; img.data[k + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return { map: texture(c, 'fabric-tie-dye') };
}

function glow(traits) {
  const c = canvas(), ctx = c.getContext('2d'), r = random(4242), paint = traits.colors[1];
  ctx.fillStyle = paint;
  const star = (x, y, s) => { ctx.beginPath(); for (let i = 0; i < 10; i++) { const t = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? s * .45 : s; ctx.lineTo(x + Math.cos(t) * rr * SX * .6, y + Math.sin(t) * rr); } ctx.closePath(); ctx.fill(); };
  const moon = (x, y, s) => { ctx.save(); ellipse(ctx, x, y, s * SX * .6, s); ctx.globalCompositeOperation = 'destination-out'; ellipse(ctx, x + s * .5 * SX * .6, y - s * .2, s * .9 * SX * .6, s * .9); ctx.restore(); };
  for (let i = 0; i < 46; i++) {
    const x = r() * SIZE, y = 150 + r() * 330, k = r();
    wrapped(x0 => k < .45 ? star(x0, y, 9 + r() * 5) : k < .7 ? moon(x0, y, 11) : ellipse(ctx, x0, y, 3.5 * SX * .6, 3.5), x);
  }
  // A painted swirl band around the hem.
  ctx.strokeStyle = paint; ctx.lineWidth = 7; ctx.lineCap = 'round';
  ctx.beginPath(); for (let x = -10; x <= SIZE + 10; x += 4) { const y = 470 + 9 * Math.sin(x / SIZE * Math.PI * 2 * 7); x < -5 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke();
  return { map: texture(c, 'fabric-glow') };
}

export function makeFabricPrint(traits) {
  if (typeof document === 'undefined') return null;
  const finish = traits.finish;
  if (finish === 'velvet') return velvet(traits);
  if (finish === 'lace') return lace(traits);
  if (finish === 'quilt') return quilt(traits);
  if (finish === 'tie_dye') return tieDye(traits);
  if (finish === 'glow') return glow(traits);
  return null;
}
