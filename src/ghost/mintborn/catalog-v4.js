// Ghost catalog v4: expanded expressions and cloth on the original body, layered on the
// v3 draft. catalog.js and collection/recipes.json (ghost-textiles-03) stay untouched;
// v4 writes collection/v4/. Draft art distribution, not committed mint metadata.
//
// Each token N keeps its v3 hat, eyewear, marking and hat colour. New traits come from a
// per-token stream seeded by (seed, N), so any single ghost can be regenerated from its
// ID alone. Only the exact rare-cloth quotas use a seeded collection-wide shuffle.
import { classicBody } from './body.js';
import { HATS, GLASSES, MARKINGS, COLOR_FAMILIES as V3_FAMILIES, PALETTES as V3_PALETTES, RARE_FABRICS as V3_RARE,
  generateCollection, random, labelFor, compatible } from './catalog.js';

export const CATALOG_V4_VERSION = 'ghost-textiles-04-classic-body';
export const V4_SEED = 28092026;
const list = rows => rows.map(([id, label, weight = 1]) => ({ id, label, weight }));

export const HEMS = list([
  ['classic', 'Classic hem', 40], ['wavy', 'Curled hem', 18], ['tattered', 'Tattered hem', 16],
  ['short_wide', 'Short and wide', 13], ['long_drape', 'Long drape', 13],
]);
export const STANCES = list([
  ['regular', 'Regular height', 52], ['tall', 'Tall', 14], ['short', 'Short', 14],
  ['tilt_left', 'Leaning left', 10], ['tilt_right', 'Leaning right', 10],
]);
export const ARMS = list([
  ['none', 'No arms', 55], ['nubs', 'Arm nubs', 30], ['wave', 'Waving', 11], ['boo', 'Arms up (boo!)', 4],
]);
export const EXPRESSIONS = list([
  ['dots', 'Dot eyes', 38], ['smile', 'Little smile', 12], ['blush', 'Blushing', 12],
  ['sleepy', 'Sleepy', 9], ['happy', 'Happy arcs', 9], ['o_mouth', 'Tiny "o"', 7],
  ['wink', 'Wink', 5], ['sparkle', 'Sparkly eyes', 4], ['star', 'Star eyes', 2.5], ['heart', 'Heart eyes', 1.5],
]);

// Eight new everyday colours next to the twelve v3 families (20 in total).
const NEW_FAMILIES = [
  { id: 'snow', label: 'Snow', base: '#f6f4ee', dark: '#5d6b86', second: '#dfe6ee', third: '#f1d9c9' },
  { id: 'butter', label: 'Butter', base: '#f0d98a', dark: '#6b5a2e', second: '#f6ecc4', third: '#e3a86a' },
  { id: 'peach', label: 'Peach', base: '#f1b394', dark: '#6d4640', second: '#f7dcc1', third: '#e48d86' },
  { id: 'pumpkin', label: 'Pumpkin', base: '#df8a45', dark: '#4a3326', second: '#f0c27a', third: '#b85a3e' },
  { id: 'cherry', label: 'Cherry', base: '#c3474f', dark: '#f3dcc0', second: '#e98b7c', third: '#7e3350' },
  { id: 'bubblegum', label: 'Bubblegum', base: '#ee9cbf', dark: '#6a3953', second: '#f7cddc', third: '#b7a3e0' },
  { id: 'plum', label: 'Plum', base: '#6e4668', dark: '#f0d7b2', second: '#a97aa0', third: '#d69a8e' },
  { id: 'charcoal', label: 'Charcoal', base: '#4b4d52', dark: '#eee3c9', second: '#7d828a', third: '#b59a7a' },
];
// New rare cloth, exact quotas per 10,000 (the five v3 rare fabrics keep theirs).
export const NEW_RARE_FABRICS = [
  { id: 'velvet_wine', label: 'Wine velvet', base: '#6b2139', second: '#e7a0b4', third: '#3d1022', finish: 'velvet', group: 'velvet', edition: 20 },
  { id: 'velvet_emerald', label: 'Emerald velvet', base: '#1d5a45', second: '#9fe0c0', third: '#0e3327', finish: 'velvet', group: 'velvet', edition: 20 },
  { id: 'velvet_midnight', label: 'Midnight velvet', base: '#26306a', second: '#aab7f2', third: '#141a42', finish: 'velvet', group: 'velvet', edition: 20 },
  { id: 'lace', label: 'Lace', base: '#f4efe2', second: '#e8dfca', third: '#d9ceb6', finish: 'lace', group: 'lace', edition: 50 },
  { id: 'quilt', label: 'Quilted patchwork', base: '#efe4c8', second: '#d98270', third: '#7fb0cf', finish: 'quilt', group: 'quilt', edition: 50 },
  { id: 'tie_dye', label: 'Tie-dye', base: '#f1d665', second: '#e8698f', third: '#5c9fd8', finish: 'tie_dye', group: 'tie_dye', edition: 40 },
  { id: 'glow', label: 'Glow-in-the-dark', base: '#d8eac3', second: '#a9d98c', third: '#cde6b6', finish: 'glow', group: 'glow', edition: 30 },
].map(f => ({ ...f, dark: '#5b6a5e', pattern: 'solid' }));

export const COLOR_FAMILIES_V4 = [...V3_FAMILIES, ...NEW_FAMILIES, ...NEW_RARE_FABRICS.map(f => ({ ...f, rare: true }))];
export const PALETTES_V4 = [...V3_PALETTES,
  ...NEW_FAMILIES.flatMap(f => [
    { id: f.id, label: f.label, family: f.id, pattern: 'solid', colors: [f.base, f.second, f.third] },
    { id: f.id + '-fade', label: f.label + ' fade', family: f.id, pattern: 'vertical', colors: [f.base, f.second, f.third] },
    { id: f.id + '-diagonal', label: f.label + ' diagonal', family: f.id, pattern: 'diagonal', colors: [f.base, f.second, f.third] },
    { id: f.id + '-aurora', label: f.label + ' aurora', family: f.id, pattern: 'aurora', colors: [f.base, f.second, f.third] },
  ]),
  ...NEW_RARE_FABRICS.map(f => ({ id: f.id, label: f.label + ' · Rare', family: f.id, pattern: 'solid', colors: [f.base, f.second, f.third], finish: f.finish, edition: f.edition })),
];
export const RARE_FABRICS_V4 = [...V3_RARE, ...NEW_RARE_FABRICS];
const ORDINARY_FAMILIES = [...V3_FAMILIES.filter(f => !f.rare), ...NEW_FAMILIES];
const DARK_TRIM = new Set(['ink', 'indigo', 'plum', 'charcoal', 'cherry']);

// Eyewear that hides the eyes: only mouth or cheek expressions show through.
export const COVERED_EYES = ['sun', 'aviator', '3d', 'visor', 'hypnosis', 'shutter', 'eyepatch'];
export const FACE_SAFE = ['dots', 'smile', 'blush', 'o_mouth'];

/** Exclusion rules. Returns null when fine, or the reason a combination is refused. */
export function v4Conflict(t) {
  if (t.hem === 'short_wide' && t.stance === 'short') return 'short-and-wide on a short stance squashes the body';
  if (t.finish === 'lace' && t.hem === 'tattered') return 'lace already has a scalloped edge';
  if (COVERED_EYES.includes(t.glasses) && !FACE_SAFE.includes(t.expression)) return 'eyewear hides the eye expression';
  if (t.glasses === 'groucho' && ['smile', 'o_mouth'].includes(t.expression)) return 'the Groucho moustache hides the mouth';
  if (t.glasses === 'groucho' && t.expression === 'heart') return 'heart eyes with the Groucho disguise read as a costume clash';
  if (t.finish === 'tie_dye' && t.expression === 'blush') return 'blush disappears on tie-dye';
  if (['rose', 'bubblegum', 'coral', 'peach', 'cherry'].includes(t.paletteFamily) && t.expression === 'blush') return 'blush disappears on pink cloth';
  if (t.hat === 'umbrella' && t.arms === 'boo') return 'raised arms poke the umbrella';
  return null;
}

function hashSeed(...parts) {
  let h = 0x811c9dc5;
  for (const p of parts) { h ^= p; h = Math.imul(h, 0x01000193); h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995); h ^= h >>> 15; }
  return h | 0;
}
function weighted(rows, r) { let v = r() * rows.reduce((n, x) => n + x.weight, 0); for (const x of rows) { v -= x.weight; if (v < 0) return x.id; } return rows.at(-1).id; }

export function recipeFromPaletteV4(paletteId) {
  const p = PALETTES_V4.find(x => x.id === paletteId) ?? PALETTES_V4[0];
  const f = COLOR_FAMILIES_V4.find(x => x.id === p.family);
  return { palette: p.id, paletteFamily: p.family, pattern: p.pattern, finish: p.finish ?? 'cotton', colors: [...p.colors], markColor: f.dark };
}

export function coarseKeyV4(t) {
  const hat = t.hat === 'hardhat' ? 'cap' : t.hat;
  const eyewear = ['round', 'oval', 'hexagon'].includes(t.glasses) ? 'spectacles' : ['sun', 'aviator'].includes(t.glasses) ? 'sunglasses' : t.glasses;
  return [hat, eyewear, t.marking, t.paletteFamily, t.hem, t.stance, t.arms, t.expression].join('|');
}

/** New traits for one token, from its v3 recipe and a (seed, number) stream. attempt>0 rerolls. */
export function v4Traits(v3, rareSlot, seed = V4_SEED, attempt = 0) {
  const r = random(hashSeed(seed, v3.number, attempt));
  // Cloth: v3 rare fabrics stay; new rare quotas are assigned by slot; otherwise keep the
  // v3 colour with 12/20 chance (the old families' fair share) or move to a new family.
  let palette;
  if (v3.palette && V3_RARE.some(f => f.id === v3.palette)) palette = v3.palette;
  else if (rareSlot) palette = rareSlot;
  else {
    const keep = r() < (V3_FAMILIES.filter(f => !f.rare).length / ORDINARY_FAMILIES.length) && attempt === 0;
    if (keep) { palette = v3.palette; r(); }
    else {
      const family = NEW_FAMILIES[Math.floor(r() * NEW_FAMILIES.length)];
      const ids = PALETTES_V4.filter(p => p.family === family.id);
      palette = attempt === 0 ? ids[Math.floor(r() * ids.length)].id
        : PALETTES_V4.filter(p => !p.edition)[Math.floor(r() * PALETTES_V4.filter(p => !p.edition).length)].id;
    }
  }
  const cloth = recipeFromPaletteV4(palette), rare = !!PALETTES_V4.find(p => p.id === palette).edition;
  const t = { ...v3, ...cloth, marking: rare ? 'none' : v3.marking,
    trimColor: DARK_TRIM.has(cloth.paletteFamily) ? '#d7b65b' : '#e6d6b1',
    hem: weighted(HEMS, r), stance: weighted(STANCES, r), arms: weighted(ARMS, r), expression: weighted(EXPRESSIONS, r) };
  // Resolve exclusions by rerolling only the conflicting body/face trait, deterministically.
  for (let guard = 0; v4Conflict(t) && guard < 64; guard++) {
    const why = v4Conflict(t);
    if (why.includes('expression') || why.includes('mouth') || why.includes('blush') || why.includes('heart')) t.expression = weighted(EXPRESSIONS, r);
    else if (why.includes('umbrella')) t.arms = weighted(ARMS, r);
    else if (why.includes('lace')) t.hem = weighted(HEMS, r);
    else t.stance = weighted(STANCES, r);
  }
  if (v4Conflict(t)) throw new Error('Unresolvable v4 exclusion for ghost ' + v3.number);
  return t;
}

export function rareSlotsV4(seed = V4_SEED, v3 = generateCollection()) {
  const eligible = v3.filter(r => !V3_RARE.some(f => f.id === r.palette)).map(r => r.number);
  const shuffle = random(hashSeed(seed, 0x5eed));
  for (let i = eligible.length - 1; i > 0; i--) { const j = Math.floor(shuffle() * (i + 1)); [eligible[i], eligible[j]] = [eligible[j], eligible[i]]; }
  const slots = new Map(); let k = 0;
  for (const f of NEW_RARE_FABRICS) for (let i = 0; i < f.edition; i++) slots.set(eligible[k++], f.id);
  return slots;
}

// Retain the original draft selection stream so restoring the body never rerolls other traits.
function generateDraftWithBodies(seed = V4_SEED, v3Seed = 9082026) {
  const v3 = generateCollection(v3Seed), slots = rareSlotsV4(seed, v3), used = new Set();
  return v3.map(base => {
    for (let attempt = 0; attempt < 50; attempt++) {
      const { version, catalog, number, body, ...rest } = v4Traits(base, slots.get(base.number), seed, attempt);
      const recipe = { number, version: 4, catalog: CATALOG_V4_VERSION, body: 'sheet-02', ...rest };
      if (slots.get(base.number) && recipe.palette !== slots.get(base.number)) continue;
      const key = coarseKeyV4(recipe);
      if (used.has(key)) continue;
      used.add(key); return recipe;
    }
    throw new Error('Could not make a unique v4 ghost for ' + base.number);
  });
}

// Preserve every numbered ghost's new cloth, face and accessories; only restore its body.
export function generateCollectionV4(seed = V4_SEED, v3Seed = 9082026) {
  return generateDraftWithBodies(seed, v3Seed).map(classicBody);
}
export function framingV4() { return 0; }
export { HATS, GLASSES, MARKINGS, labelFor, compatible };
