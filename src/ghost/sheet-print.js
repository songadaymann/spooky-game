import * as THREE from 'three';
import { bodySurface } from './mintborn/body.js';
import { makeMarkings } from './mintborn/markings.js';
import { makeFabricPrint, PRINT_FINISHES } from './mintborn/fabrics.js';

// Paints a ghost recipe onto one square cloth print: base color pattern, rare
// fabric print, marking, then the face. In the collection the face is 3D geometry
// on a rigid head; here it is ink on the sheet, so it creases with the cloth.
// It is also plain 2D drawing, which is what an on-chain SVG renderer would emit.
//
// Canvas layout matches the collection UVs: x wraps around the body with the
// front at the center, top row is the crown, bottom row the hem.

const S = 512;
const CAP = 0.26, R = 0.49, CROWN_Y = 1.9;
const smooth = THREE.MathUtils.smoothstep;
const RAINBOW = ['#df5f73', '#ef9553', '#edcf65', '#72bfa0', '#62a8cf', '#8173bd', '#c486b6'];

function baseLayer(traits) {
  const n = 128, c = document.createElement('canvas');
  c.width = c.height = n;
  const ctx = c.getContext('2d'), img = ctx.createImageData(n, n);
  const [a, b, cc] = traits.colors.map(h => new THREE.Color(h));
  const spectrum = traits.pattern === 'rainbow' ? RAINBOW.map(h => new THREE.Color(h)) : null;
  const p = new THREE.Vector3(), out = new THREE.Color();
  for (let py = 0; py < n; py++) {
    const v = (py + 0.5) / n;
    for (let px = 0; px < n; px++) {
      const angle = ((px + 0.5) / n - 0.5) * Math.PI * 2;
      bodySurface(v, angle, p);
      const x = p.x;
      let t = smooth(v, 0.1, 0.96);
      if (traits.pattern === 'diagonal') t = smooth(v + x * 0.4, 0.08, 0.96);
      if (traits.pattern === 'solid') out.copy(a);
      else if (spectrum) {
        const q = THREE.MathUtils.clamp(v + x * 0.11, 0, 1) * (spectrum.length - 1), lo = Math.min(spectrum.length - 2, Math.floor(q));
        out.copy(spectrum[lo]).lerp(spectrum[lo + 1], q - lo);
      } else if (traits.pattern === 'aurora') {
        t = THREE.MathUtils.clamp(t + 0.12 * Math.sin(x * 3.5 + (1 - v) * 4), 0, 1);
        if (t < 0.5) out.copy(a).lerp(b, t * 2); else out.copy(b).lerp(cc, t * 2 - 1);
      } else out.copy(a).lerp(b, t);
      const k = (py * n + px) * 4;
      img.data[k] = out.r * 255; img.data[k + 1] = out.g * 255; img.data[k + 2] = out.b * 255; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// Head space (x, y on the front of the head sphere) to canvas pixels.
function toCanvas(x, y) {
  const dy = y - CROWN_Y;
  const z = Math.sqrt(Math.max(1e-6, R * R - x * x - dy * dy));
  const phi = Math.acos(THREE.MathUtils.clamp(dy / R, -1, 1));
  const v = (phi / (Math.PI / 2)) * CAP;
  const u = Math.atan2(x, z) / (Math.PI * 2) + 0.5;
  return [u * S, v * S, phi];
}
function scaleAt(phi) {
  return [S / (Math.PI * 2 * R * Math.max(0.2, Math.sin(phi))), S * CAP / (Math.PI / 2 * R)];
}

function drawFace(ctx, traits) {
  const expression = traits.expression ?? 'dots';
  const base = new THREE.Color(traits.colors[0]);
  const dark = base.r * 0.2126 + base.g * 0.7152 + base.b * 0.0722 < 0.1;
  const ink = ['jet', 'starlight'].includes(traits.finish) || dark ? '#eee9d7' : '#171a20';
  const eyeY = 2.045;

  const ellipse = (x, y, rx, ry, fill) => {
    const [cx, cy, phi] = toCanvas(x, y), [sx, sy] = scaleAt(phi);
    ctx.fillStyle = fill;
    ctx.beginPath(); ctx.ellipse(cx, cy, rx * sx, ry * sy, 0, 0, Math.PI * 2); ctx.fill();
  };
  const stroke = (pts, width = 0.033) => {
    const [, , phi] = toCanvas(pts[0][0], pts[0][1]), [sx] = scaleAt(phi);
    ctx.strokeStyle = ink; ctx.lineWidth = width * sx; ctx.lineCap = ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => { const [cx, cy] = toCanvas(x, y); i ? ctx.lineTo(cx, cy) : ctx.moveTo(cx, cy); });
    ctx.stroke();
  };
  const arc = (cx, cy, hw, h, n = 13) => Array.from({ length: n }, (_, i) => { const t = i / (n - 1) * 2 - 1; return [cx + hw * t, cy + h * (1 - t * t)]; });
  const shape = (x, y, r, fill, kind) => {
    const [cx, cy, phi] = toCanvas(x, y), [sx, sy] = scaleAt(phi);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(r * sx, -r * sy); ctx.fillStyle = fill;
    ctx.beginPath();
    if (kind === 'star') for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.46 : 1; ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    else { ctx.moveTo(0, -1); ctx.bezierCurveTo(-1.25, -0.15, -1.05, 1.05, 0, 0.42); ctx.bezierCurveTo(1.05, 1.05, 1.25, -0.15, 0, -1); }
    ctx.closePath(); ctx.fill(); ctx.restore();
  };
  const dot = (x, big = 1, sparkle = false) => {
    ellipse(x, eyeY, 0.068 * big, 0.102 * big, ink);
    const glint = ink === '#171a20' ? '#fff7e4' : '#171a20';
    ellipse(x - 0.016 * big, eyeY + 0.036 * big, 0.019 * big, 0.019 * big, glint);
    if (sparkle) ellipse(x + 0.018 * big, eyeY - 0.034 * big, 0.012 * big, 0.012 * big, glint);
  };

  const keepDots = ['dots', 'smile', 'blush', 'o_mouth', 'sparkle'].includes(expression);
  if (keepDots) for (const x of [-0.17, 0.17]) dot(x, expression === 'sparkle' ? 1.2 : 1, expression === 'sparkle');
  if (expression === 'wink') { dot(-0.17); stroke(arc(0.17, eyeY - 0.03, 0.064, 0.052)); stroke(arc(0, 1.95, 0.052, -0.028, 11), 0.028); }
  if (expression === 'happy') for (const x of [-0.17, 0.17]) stroke(arc(x, eyeY - 0.03, 0.07, 0.062), 0.038);
  if (expression === 'sleepy') for (const x of [-0.17, 0.17]) {
    stroke(arc(x, eyeY - 0.005, 0.066, -0.036), 0.036);
    for (const d of [-1, 1]) stroke([[x + d * 0.05, eyeY - 0.03], [x + d * 0.062, eyeY - 0.058]], 0.018);
  }
  if (expression === 'star') for (const x of [-0.17, 0.17]) { shape(x, eyeY, 0.092, ink, 'star'); shape(x, eyeY, 0.068, '#f2c24c', 'star'); }
  if (expression === 'heart') for (const x of [-0.17, 0.17]) { shape(x, eyeY - 0.005, 0.082, ink, 'heart'); shape(x, eyeY - 0.005, 0.062, '#e0506a', 'heart'); }
  if (expression === 'blush' || expression === 'heart') for (const x of [-0.29, 0.29]) ellipse(x, 1.968, 0.058, 0.034, '#ef9aa0');
  if (expression === 'smile') stroke(arc(0, 1.955, 0.05, -0.03, 11), 0.028);
  if (expression === 'o_mouth') { ellipse(0, 1.935, 0.046, 0.046, ink); ellipse(0, 1.935, 0.024, 0.024, '#5a2c34'); }
}

export function makeSheetPrint(traits) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(baseLayer(traits), 0, 0, S, S);
  const finish = traits.finish ?? 'cotton';
  const print = PRINT_FINISHES.includes(finish) ? makeFabricPrint(traits) : null;
  if (print) { ctx.drawImage(print.map.image, 0, 0, S, S); print.map.dispose(); print.alpha?.dispose(); }
  const marks = print ? null : makeMarkings(traits);
  if (marks) { ctx.drawImage(marks.image, 0, 0, S, S); marks.dispose(); }
  drawFace(ctx, traits);
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}
