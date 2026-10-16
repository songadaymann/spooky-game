import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { flockMaterial, castOn } from '../style/flock-material.js';
import { PAL } from '../style/palette.js';

// A night-time country club built from the four reference paintings:
// the vermilion court with pink lines and an indigo apron, the periwinkle-tiled
// pool with a red ladder and two things in the water, the red lounge with an
// indigo wall and a flocked armchair, and dark hedges. All procedural.

function hash3(x, y, z) {
  let h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453;
  return h - Math.floor(h);
}
function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => hash3(xi + dx, yi + dy, zi + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), u), L(c(0, 1, 0), c(1, 1, 0), u), v),
           L(L(c(0, 0, 1), c(1, 0, 1), u), L(c(0, 1, 1), c(1, 1, 1), u), v), w);
}

function mesh(geometry, material, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = cast; m.receiveShadow = receive;
  return m;
}

// Flat ground piece with rectangular holes, as [x0, z0, x1, z1].
function flatRect(rect, holes, y, material) {
  const [x0, z0, x1, z1] = rect;
  const shape = new THREE.Shape([new THREE.Vector2(x0, -z0), new THREE.Vector2(x1, -z0), new THREE.Vector2(x1, -z1), new THREE.Vector2(x0, -z1)]);
  for (const [a, b, c, d] of holes) shape.holes.push(new THREE.Path([new THREE.Vector2(a, -b), new THREE.Vector2(a, -d), new THREE.Vector2(c, -d), new THREE.Vector2(c, -b)]));
  const g = new THREE.ShapeGeometry(shape);
  g.rotateX(-Math.PI / 2);
  const m = mesh(g, material, { cast: false });
  m.position.y = y;
  return m;
}

function slab([x0, z0, x1, z1], y0, y1, material, opts) {
  const m = mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), material, opts);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  return m;
}

// A painted line from a to b on the ground, as a thin slab.
function line(a, b, width, y, material) {
  const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz);
  const m = mesh(new THREE.BoxGeometry(len, 0.012, width), material, { cast: false });
  m.position.set((a[0] + b[0]) / 2, y, (a[1] + b[1]) / 2);
  m.rotation.y = -Math.atan2(dz, dx);
  return m;
}

function pumpkin(radius = 0.42, glow = 2.2) {
  const group = new THREE.Group();
  const g = new THREE.SphereGeometry(radius, 48, 28);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const a = Math.atan2(v.x, v.z), lat = v.y / radius;
    const rib = 1 - 0.07 * Math.pow(Math.abs(Math.cos(a * 5)), 0.6) * (1 - lat * lat);
    v.x *= 1.18 * rib; v.z *= 1.18 * rib; v.y *= 0.86;
    v.y -= 0.08 * radius * Math.pow(Math.max(0, lat), 6) * 3; // dimple at the stem
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  // The carved face is painted into the rind's map; pale pixels glow.
  const rind = flockMaterial({ map: pumpkinFace(), emitMask: true, emissive: new THREE.Color(PAL.pumpkinGlow).multiplyScalar(glow), shade: 0.55, mottle: 0.12 });
  group.add(mesh(g, rind));
  const stem = mesh(new THREE.CylinderGeometry(0.035, 0.06, 0.2, 8), flockMaterial({ color: '#3d4a1a', shade: 0.6 }));
  stem.position.y = radius * 0.86 + 0.04; stem.rotation.z = 0.25;
  group.add(stem);
  return group;
}

// Equirectangular rind map: front of a SphereGeometry is u = 0.25. Shapes are drawn
// in radians (81.5 px each way), so they land undistorted near the equator.
let faceTexture = null;
function pumpkinFace() {
  if (faceTexture) return faceTexture;
  const c = document.createElement('canvas');
  c.width = 512; c.height = 256;
  const ctx = c.getContext('2d');
  ctx.fillStyle = PAL.pumpkin;
  ctx.fillRect(0, 0, 512, 256);
  const k = 512 / (Math.PI * 2), at = ([a, l]) => [128 + a * k, 128 - l * k];
  const poly = (pts) => { ctx.beginPath(); pts.map(at).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
  ctx.fillStyle = '#ffe08a';
  poly([[-0.62, 0.1], [-0.16, 0.1], [-0.4, 0.5]]);
  poly([[0.16, 0.1], [0.62, 0.1], [0.4, 0.5]]);
  poly([[-0.09, -0.04], [0.09, -0.04], [0, 0.12]]);
  poly([[-0.72, -0.16], [-0.48, -0.28], [-0.32, -0.18], [-0.16, -0.34], [0, -0.22], [0.16, -0.34], [0.32, -0.18], [0.48, -0.28], [0.72, -0.16], [0.48, -0.5], [0, -0.58], [-0.48, -0.5]]);
  faceTexture = new THREE.CanvasTexture(c);
  faceTexture.colorSpace = THREE.SRGBColorSpace;
  faceTexture.anisotropy = 4;
  return faceTexture;
}

function swampHead() {
  const group = new THREE.Group();
  const g = new THREE.SphereGeometry(0.62, 128, 96);
  const p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    // Mossy scales: two octaves of bumps over a bell that widens into the water.
    let r = 0.62 * (1 + 0.075 * (noise3(n.x * 13, n.y * 13, n.z * 13) - 0.5) + 0.07 * (noise3(n.x * 34, n.y * 34, n.z * 34) - 0.5));
    v.copy(n).multiplyScalar(r);
    v.y *= 1.12;
    const flare = 1 + 0.28 * Math.max(0, -n.y);
    v.x *= 0.95 * flare; v.z *= flare;
    const front = Math.max(0, n.z);
    v.z += 0.17 * front * Math.exp(-((n.y - 0.2) ** 2) / 0.006);       // heavy brow
    v.z += 0.3 * front ** 3 * Math.exp(-((n.y + 0.2) ** 2) / 0.04);    // snout
    v.z -= 0.07 * front * Math.exp(-((n.y - 0.06) ** 2) / 0.003);      // eye sockets
    v.y += 0.1 * Math.max(0, n.y) ** 3;                                // domed crown
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  group.add(mesh(g, flockMaterial({ color: '#2a5220', shade: 0.42, mottle: 0.45, term: [-0.15, 0.55], lift: 0.25 })));
  const eyeMat = flockMaterial({ color: '#ff5a2a', emissive: new THREE.Color(PAL.eyeRed).multiplyScalar(3.4), shade: 1, mottle: 0 });
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.08, 16, 10), eyeMat, { cast: false });
    eye.scale.set(1.7, 0.62, 0.7);
    eye.position.set(s * 0.21, 0.07, 0.6);
    eye.rotation.set(0, s * 0.35, s * 0.3);
    group.add(eye);
  }
  return group;
}

export function buildWorld(scene) {
  const colliders = [];
  const solid = (x0, z0, x1, z1) => colliders.push([x0, z0, x1, z1]);
  const updaters = [];

  // Ground
  const POOL = [-18, -8, -6, 0];
  const grass = flockMaterial({ color: PAL.grass, cast: castOn(PAL.grass, 0.05), mottle: 0.16 });
  scene.add(flatRect([-70, -70, 70, 70], [POOL], 0, grass));
  const deck = flockMaterial({ color: PAL.deck, cast: castOn(PAL.deck, 0.1), mottle: 0.12 });
  scene.add(flatRect([-21, -11, -3, 3], [POOL], 0.008, deck));

  // Court
  const court = flockMaterial({ color: PAL.court, cast: castOn(PAL.court, 0.03), mottle: 0.1 });
  scene.add(slab([-7, 2, 15, 14], 0, 0.03, court, { cast: false }));
  const apron = flockMaterial({ color: PAL.indigo, cast: castOn(PAL.indigo, 0.1), mottle: 0.12 });
  scene.add(slab([-7, 14, 15, 21], 0, 0.03, apron, { cast: false }));
  const pink = flockMaterial({ color: PAL.courtLine, mottle: 0.05, cast: castOn(PAL.courtLine, 0.08) });
  const Y = 0.036;
  for (const [a, b, w] of [
    [[-6.4, 2.6], [14.4, 2.6], 0.1], [[-6.4, 13.85], [14.4, 13.85], 0.16],
    [[-6.4, 2.6], [-6.4, 13.85], 0.1], [[14.4, 2.6], [14.4, 13.85], 0.1],
    [[-6.4, 4.1], [14.4, 4.1], 0.08], [[-6.4, 12.35], [14.4, 12.35], 0.08],
    [[1.2, 4.1], [1.2, 12.35], 0.08], [[7.6, 4.1], [7.6, 12.35], 0.08],
    [[1.2, 8.2], [7.6, 8.2], 0.08],
    [[5, 13.85], [12.2, 21], 0.16],
  ]) scene.add(line(a, b, w, Y, pink));
  // Pool: tiled walls with a raised coping, flat ultramarine water.
  const tileMat = flockMaterial({ color: PAL.tile, shade: 0.7, term: [-0.05, 0.25], mottle: 0.08, grid: { cell: 0.24, width: 0.011, color: PAL.grout, wobble: 0.018 } });
  const T = 0.42, WATER = -0.85;
  const [px0, pz0, px1, pz1] = POOL;
  scene.add(slab([px0, pz0, px1, pz0 + T], -1.6, 0.22, tileMat));
  scene.add(slab([px0, pz1 - T, px1, pz1], -1.6, 0.22, tileMat));
  scene.add(slab([px0, pz0 + T, px0 + T, pz1 - T], -1.6, 0.22, tileMat));
  scene.add(slab([px1 - T, pz0 + T, px1, pz1 - T], -1.6, 0.22, tileMat));
  const water = flockMaterial({ color: PAL.water, cast: castOn(PAL.water, 0.18), mottle: 0.2 });
  const waterMesh = mesh(new THREE.PlaneGeometry(px1 - px0 - 2 * T, pz1 - pz0 - 2 * T), water, { cast: false });
  waterMesh.rotation.x = -Math.PI / 2;
  waterMesh.position.set((px0 + px1) / 2, WATER, (pz0 + pz1) / 2);
  scene.add(waterMesh);

  // Ladder on the far wall, like the reference: two rails over the coping, rungs below.
  const red = flockMaterial({ color: PAL.ladder, shade: 0.55, term: [-0.2, 0.4], mottle: 0.05 });
  const lx = -15.2, wallFace = pz0 + T;
  const rail = (x) => {
    const pts = [[-0.32, 0.22], [-0.32, 0.95], [-0.24, 1.22], [-0.04, 1.32], [0.17, 1.22], [0.26, 0.95], [0.27, 0.3], [0.27, WATER - 0.1]]
      .map(([d, y]) => new THREE.Vector3(x, y, wallFace + d));
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.3), 64, 0.05, 10), red);
  };
  scene.add(rail(lx - 0.42), rail(lx + 0.42));
  for (const y of [-0.15, -0.6]) {
    const rung = mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.84, 8), red);
    rung.rotation.z = Math.PI / 2;
    rung.position.set(lx, y, wallFace + 0.27);
    scene.add(rung);
  }

  // Two things in the pool. They turn to watch the ghost and duck when it gets close.
  const heads = [[-11.8, -2.6, 0], [-9.3, -1.5, 1.7]].map(([x, z, phase]) => {
    const h = swampHead();
    h.position.set(x, WATER + 0.35, z);
    h.userData = { base: new THREE.Vector3(x, WATER + 0.35, z), phase, sink: 0, yaw: 0.8 };
    scene.add(h);
    return h;
  });
  updaters.push((t, dt, ghost) => {
    for (const h of heads) {
      const u = h.userData;
      const dx = ghost.x - h.position.x, dz = ghost.z - h.position.z, d = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = Math.atan2(Math.sin(want - u.yaw), Math.cos(want - u.yaw));
      u.yaw += diff * (1 - Math.exp(-1.6 * dt));
      h.rotation.y = u.yaw;
      const shy = d < 2.6 ? 1 : 0;
      u.sink += (shy - u.sink) * (1 - Math.exp(-(shy ? 5 : 0.8) * dt));
      h.position.y = u.base.y + 0.05 * Math.sin(t * 0.9 + u.phase) - u.sink * 0.62;
    }
  });

  // Lounge: red carpet, indigo stage walls, the armchair and its pumpkin.
  const carpet = flockMaterial({ color: PAL.carpet, cast: castOn(PAL.carpet, 0.03), mottle: 0.12 });
  scene.add(slab([6, -14, 17, -3.5], 0, 0.035, carpet, { cast: false }));
  const wall = flockMaterial({ color: PAL.wall, shade: 0.75, cast: castOn(PAL.wall, 0.35), mottle: 0.14, term: [-0.3, 0.2] });
  scene.add(slab([5.7, -14.3, 17, -14], 0, 4.2, wall)); solid(5.7, -14.5, 17, -13.8);

  const chairMat = flockMaterial({ color: '#cf160b', shade: 0.55, term: [-0.15, 0.35], mottle: 0.1, lift: 0.22 });
  const chair = new THREE.Group();
  const rb = (w, h, d, x, y, z) => { const m = mesh(new RoundedBoxGeometry(w, h, d, 4, 0.12), chairMat); m.position.set(x, y, z); chair.add(m); };
  rb(1.5, 0.72, 1.55, 0, 0.36, 0.05);
  rb(1.95, 1.55, 0.42, 0, 0.78, -0.72);
  rb(0.36, 1.08, 1.85, -0.83, 0.54, -0.02);
  rb(0.36, 1.08, 1.85, 0.83, 0.54, -0.02);
  chair.position.set(11.4, 0.035, -9.6);
  chair.rotation.y = Math.PI / 4 + 0.25;
  chair.scale.setScalar(1.35);
  scene.add(chair);
  solid(9.7, -11.3, 13.1, -7.9);
  const jack = pumpkin(0.44, 2.4);
  jack.position.set(0, 0.72 + 0.32, 0.12);
  jack.rotation.y = 0.15;
  chair.add(jack);

  // Hedges and topiary: dark and fuzzy, with long shadows.
  const hedgeMat = flockMaterial({ color: PAL.hedge, shade: 0.5, mottle: 0.3, term: [-0.2, 0.5] });
  const hedge = (x0, z0, x1, z1, h = 1.3) => {
    const g = new RoundedBoxGeometry(x1 - x0, h, z1 - z0, 6, 0.32);
    // RoundedBoxGeometry's own normals agree across its seams, so displacing along
    // them keeps the surface closed.
    const p = g.attributes.position, v = new THREE.Vector3(), n = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); n.fromBufferAttribute(g.attributes.normal, i);
      const w = (x0 + v.x) * 1.7, q = (z0 + v.z) * 1.7;
      v.addScaledVector(n, 0.09 * (noise3(w, v.y * 1.7, q) - 0.5) + 0.05 * (noise3(w * 3, v.y * 5, q * 3) - 0.5));
      p.setXYZ(i, v.x, v.y, v.z);
    }
    g.computeVertexNormals();
    const m = mesh(g, hedgeMat);
    m.position.set((x0 + x1) / 2, h / 2, (z0 + z1) / 2);
    scene.add(m); solid(x0, z0, x1, z1);
  };
  hedge(-2, -0.4, 4.5, 0.8);
  hedge(-10, 4, -8.8, 12);
  hedge(17, 3, 18.2, 10.5);
  hedge(-2, 23, 9, 24.2, 1.1);
  const ball = (x, z, r) => {
    const g = new THREE.SphereGeometry(r, 32, 20);
    const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + 0.08 * (noise3(v.x * 4, v.y * 4, v.z * 4) - 0.5)); p.setXYZ(i, v.x, v.y, v.z); }
    g.computeVertexNormals();
    const m = mesh(g, hedgeMat);
    m.position.set(x, r * 0.95, z);
    scene.add(m); solid(x - r * 0.8, z - r * 0.8, x + r * 0.8, z + r * 0.8);
  };
  ball(-9.4, 15.5, 0.9); ball(18, 13.5, 1.05); ball(-1, -4.5, 0.75); ball(3, -6, 0.6);

  // Jack-o'-lanterns out on the grass.
  for (const [x, z, r, ry] of [[-4.5, 17.5, 0.42, 0.6], [17.6, 15.6, 0.36, -0.4], [-1.6, -2.4, 0.4, 0.3], [-20, 6, 0.46, 0.9], [9.6, -2.2, 0.34, 0.2]]) {
    const pk = pumpkin(r);
    pk.position.set(x, r * 0.86, z);
    pk.rotation.y = ry;
    scene.add(pk);
    solid(x - r, z - r, x + r, z + r);
  }

  const center = new THREE.Vector2(-1, 3);
  const limit = 31;

  return {
    spawn: new THREE.Vector3(2.5, 0, 9.5),
    center,
    floorAt(x, z) {
      return x > px0 + T && x < px1 - T && z > pz0 + T && z < pz1 - T ? WATER : 0;
    },
    // Push a circle out of solid boxes and back inside the world. Returns true if moved.
    resolve(pos, r) {
      let moved = false;
      for (const [x0, z0, x1, z1] of colliders) {
        const cx = Math.max(x0, Math.min(x1, pos.x)), cz = Math.max(z0, Math.min(z1, pos.z));
        const dx = pos.x - cx, dz = pos.z - cz, d2 = dx * dx + dz * dz;
        if (d2 < r * r) {
          moved = true;
          if (d2 > 1e-8) { const d = Math.sqrt(d2), k = (r - d) / d; pos.x += dx * k; pos.z += dz * k; }
          else {
            const pushes = [[x0 - r - pos.x, 0], [x1 + r - pos.x, 0], [0, z0 - r - pos.z], [0, z1 + r - pos.z]];
            const best = pushes.reduce((a, b) => Math.hypot(...a) < Math.hypot(...b) ? a : b);
            pos.x += best[0]; pos.z += best[1];
          }
        }
      }
      const ox = pos.x - center.x, oz = pos.z - center.y, od = Math.hypot(ox, oz);
      if (od > limit) { pos.x = center.x + ox / od * limit; pos.z = center.y + oz / od * limit; moved = true; }
      return moved;
    },
    update(t, dt, ghostPos) { for (const u of updaters) u(t, dt, ghostPos); },
  };
}
