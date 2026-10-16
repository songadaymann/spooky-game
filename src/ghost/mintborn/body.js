// The approved sheet-01 body. All looks share its original silhouette.
export const BODY_DEFAULTS = Object.freeze({ hem: 'classic', stance: 'regular', arms: 'none' });
const BASE = { crownY: 1.9, headRadius: .49, hemY: .24, capFraction: .26 };
const smooth = (x, a, b) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export function classicBody(traits) { return { ...traits, body: 'sheet-01', ...BODY_DEFAULTS }; }
export function bodyParams() {
  return { ...BODY_DEFAULTS, ...BASE, width: 1, tilt: 0, pivotY: BASE.hemY, nubs: [], key: 'classic|regular|none' };
}
export function headTransform() { return { x: 0, y: 0, rotZ: 0 }; }
export function bodyTop() { return BASE.crownY + BASE.headRadius; }

export function bodySurface(v, angle, out) {
  const { crownY, headRadius, hemY, capFraction } = BASE;
  let radius, y;
  if (v <= capFraction) {
    const phi = v / capFraction * Math.PI / 2;
    radius = headRadius * Math.sin(phi);
    y = crownY + headRadius * Math.cos(phi);
  } else {
    const q = (v - capFraction) / (1 - capFraction);
    const fold = .105 * Math.cos(7 * angle + .38 * q)
      + .043 * Math.sin(4 * angle - .55 + .3 * q)
      + .021 * Math.cos(11 * angle - .8 * q);
    radius = headRadius + .075 * q * q + .115 * q ** 4 + fold * smooth(q, 0, .85);
    y = crownY * (1 - q) + hemY * q
      + q ** 5 * (.057 * Math.sin(3 * angle + .4) + .035 * Math.cos(7 * angle));
  }
  return out.set(radius * Math.sin(angle), y, radius * Math.cos(angle));
}
