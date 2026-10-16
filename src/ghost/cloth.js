import * as THREE from 'three';
import { bodySurface } from './mintborn/body.js';

// A position-based cloth sim of the Mintborn sheet-01 ghost.
//
// The rest shape is the collection's own parametric surface (body.js), so a ghost
// standing still is exactly the collection silhouette. Moving, the sheet behaves
// like a real sheet over a head: the crown is held by the head, the rest is cloth
// with stretch, shear and (weak) bend constraints, so it wrinkles, lags, billows
// and twists. A soft "shape memory" pull toward the rest pose, strong at the
// shoulders and nearly gone at the hem, keeps the designed shape readable.
//
// Everything here is deterministic math on a recipe-free mesh: no bitmaps, no
// baked animation, nothing that couldn't be stored as code.

export const CROWN = new THREE.Vector3(0, 1.9, 0); // head center in ghost space
export const HEAD_RADIUS = 0.49;

export const DEFAULT_CLOTH = {
  gravity: 10.5,     // a cotton sheet, a little lighter than real
  damping: 0.02,     // velocity loss per substep
  aero: 1.05,        // air pushes cloth along its normal: billow and flare
  wind: 0.35,        // idle breeze
  memTop: 0.2,       // shape memory just below the pinned crown
  memHem: 0.006,     // shape memory at the hem
  memFall: 0.78,     // where memory has fully faded (0 crown .. 1 hem)
  pinV: 0.11,        // crown rows held rigidly by the head
  stretch: 1.0,
  shear: 0.6,
  bend: 0.1,         // low bend stiffness = more, finer wrinkles
  iterations: 6,
  lra: 1.03,         // long-range attachments: max stretch from the crown
  bodyRadius: 0.27,  // invisible core that stops the skirt collapsing inward
};

const tmp = new THREE.Vector3();

export class SheetCloth {
  constructor({ radial = 56, rows = 40, params = {} } = {}) {
    this.radial = radial;
    this.rows = rows;
    this.params = { ...DEFAULT_CLOTH, ...params };
    const n = 1 + rows * radial;
    this.n = n;
    this.pos = new Float32Array(n * 3);
    this.prev = new Float32Array(n * 3);
    this.rest = new Float32Array(n * 3); // relative to CROWN, in head space
    this.vparam = new Float32Array(n);
    this.pinned = new Uint8Array(n);
    this.memory = new Float32Array(n);
    this.maxDist = new Float32Array(n);
    this.normal = new Float32Array(n * 3);
    this.crease = new Float32Array(n);   // mean curvature: + in fold valleys, - on ridges

    const p = new THREE.Vector3();
    const set = (i, v, angle) => {
      bodySurface(v, angle, p);
      this.rest[i * 3] = p.x - CROWN.x;
      this.rest[i * 3 + 1] = p.y - CROWN.y;
      this.rest[i * 3 + 2] = p.z - CROWN.z;
      this.vparam[i] = v;
    };
    set(0, 0, 0);
    for (let r = 1; r <= rows; r++) {
      for (let c = 0; c < radial; c++) set(this.id(r, c), r / rows, (c / radial - 0.5) * Math.PI * 2);
    }

    // Constraints: [i, j, restLength, kind] with kind 0 stretch, 1 shear, 2 bend.
    const cons = [];
    const add = (i, j, kind) => {
      const dx = this.rest[i * 3] - this.rest[j * 3], dy = this.rest[i * 3 + 1] - this.rest[j * 3 + 1], dz = this.rest[i * 3 + 2] - this.rest[j * 3 + 2];
      cons.push(i, j, Math.hypot(dx, dy, dz), kind);
    };
    for (let c = 0; c < radial; c++) {
      add(0, this.id(1, c), 0);
      add(0, this.id(2, c), 2);
    }
    for (let r = 1; r <= rows; r++) {
      for (let c = 0; c < radial; c++) {
        const c1 = (c + 1) % radial, c2 = (c + 2) % radial;
        add(this.id(r, c), this.id(r, c1), 0);
        add(this.id(r, c), this.id(r, c2), 2);
        if (r < rows) {
          add(this.id(r, c), this.id(r + 1, c), 0);
          add(this.id(r, c), this.id(r + 1, c1), 1);
          add(this.id(r, c1), this.id(r + 1, c), 1);
        }
        if (r < rows - 1) add(this.id(r, c), this.id(r + 2, c), 2);
      }
    }
    // Stretch first, then shear, then bend: a cheap ordering that converges well.
    const order = [0, 1, 2].flatMap(kind => {
      const out = [];
      for (let k = 0; k < cons.length; k += 4) if (cons[k + 3] === kind) out.push(k);
      return out;
    });
    const m = order.length;
    this.ci = new Uint32Array(m);
    this.cj = new Uint32Array(m);
    this.cl = new Float32Array(m);
    this.ck = new Uint8Array(m);
    order.forEach((k, idx) => { this.ci[idx] = cons[k]; this.cj[idx] = cons[k + 1]; this.cl[idx] = cons[k + 2]; this.ck[idx] = cons[k + 3]; });

    // Geodesic distance from the crown down each column, for long-range attachments.
    for (let c = 0; c < radial; c++) {
      let d = 0, last = 0;
      for (let r = 1; r <= rows; r++) {
        const i = this.id(r, c);
        d += Math.hypot(this.rest[i * 3] - this.rest[last * 3], this.rest[i * 3 + 1] - this.rest[last * 3 + 1], this.rest[i * 3 + 2] - this.rest[last * 3 + 2]);
        this.maxDist[i] = d;
        last = i;
      }
    }
    this.applyParams();
    this.headMatrix = new THREE.Matrix4();
    this.headQuat = new THREE.Quaternion();
    this.headPos = new THREE.Vector3();
    this.time = 0;
  }

  id(r, c) { return r === 0 ? 0 : 1 + (r - 1) * this.radial + c; }

  applyParams() {
    const P = this.params;
    for (let i = 0; i < this.n; i++) {
      const v = this.vparam[i];
      this.pinned[i] = v <= P.pinV ? 1 : 0;
      const t = THREE.MathUtils.smoothstep(v, P.pinV, P.memFall);
      this.memory[i] = THREE.MathUtils.lerp(P.memTop, P.memHem, t);
    }
  }

  // Place the whole sheet at its rest pose under a head transform.
  reset(headMatrix) {
    this.headMatrix.copy(headMatrix);
    for (let i = 0; i < this.n; i++) {
      tmp.fromArray(this.rest, i * 3).applyMatrix4(headMatrix);
      tmp.toArray(this.pos, i * 3);
      tmp.toArray(this.prev, i * 3);
    }
    this.computeNormals();
  }

  computeNormals() {
    const { pos, normal, radial, rows } = this;
    const P = (i, k) => pos[i * 3 + k];
    for (let r = 1; r <= rows; r++) {
      const ru = r - 1, rd = Math.min(rows, r + 1);
      for (let c = 0; c < radial; c++) {
        const i = this.id(r, c);
        const L = this.id(r, (c + radial - 1) % radial), R = this.id(r, (c + 1) % radial);
        const U = this.id(ru, c), D = this.id(rd, c);
        const t1x = P(R, 0) - P(L, 0), t1y = P(R, 1) - P(L, 1), t1z = P(R, 2) - P(L, 2);
        const t2x = P(D, 0) - P(U, 0), t2y = P(D, 1) - P(U, 1), t2z = P(D, 2) - P(U, 2);
        let nx = t2y * t1z - t2z * t1y, ny = t2z * t1x - t2x * t1z, nz = t2x * t1y - t2y * t1x;
        const l = Math.hypot(nx, ny, nz) || 1;
        nx /= l; ny /= l; nz /= l;
        normal[i * 3] = nx; normal[i * 3 + 1] = ny; normal[i * 3 + 2] = nz;
        // Curvature across the ring and down the column, from the same neighbours.
        const px = P(i, 0), py = P(i, 1), pz = P(i, 2);
        const ring = ((P(L, 0) + P(R, 0)) / 2 - px) * nx + ((P(L, 1) + P(R, 1)) / 2 - py) * ny + ((P(L, 2) + P(R, 2)) / 2 - pz) * nz;
        const s1 = (t1x * t1x + t1y * t1y + t1z * t1z) / 4 || 1e-6;
        let k = 2 * ring / s1;
        if (r < rows) {
          const col = ((P(U, 0) + P(D, 0)) / 2 - px) * nx + ((P(U, 1) + P(D, 1)) / 2 - py) * ny + ((P(U, 2) + P(D, 2)) / 2 - pz) * nz;
          const s2 = (t2x * t2x + t2y * t2y + t2z * t2z) / 4 || 1e-6;
          k = (k + 2 * col / s2) / 2;
        }
        this.crease[i] = Math.max(-1, Math.min(1, k * 0.07));
      }
    }
    // Crown pole points along the head's up axis.
    tmp.set(0, 1, 0).applyQuaternion(this.headQuat);
    normal[0] = tmp.x; normal[1] = tmp.y; normal[2] = tmp.z;
  }

  // One fixed substep. headMatrix maps head space (origin at the crown center) to world.
  step(h, headMatrix, floorAt) {
    const P = this.params, { pos, prev, rest, pinned, memory, normal, n } = this;
    this.time += h;
    this.headMatrix.copy(headMatrix);
    headMatrix.decompose(this.headPos, this.headQuat, tmp);
    const e = headMatrix.elements;
    const damp = 1 - P.damping;
    const h2 = h * h;
    const t = this.time;

    // Integrate free particles; drive pinned ones; pull toward the rest pose.
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      const rx = rest[j], ry = rest[j + 1], rz = rest[j + 2];
      const tx = e[0] * rx + e[4] * ry + e[8] * rz + e[12];
      const ty = e[1] * rx + e[5] * ry + e[9] * rz + e[13];
      const tz = e[2] * rx + e[6] * ry + e[10] * rz + e[14];
      if (pinned[i]) {
        prev[j] = pos[j]; prev[j + 1] = pos[j + 1]; prev[j + 2] = pos[j + 2];
        pos[j] = tx; pos[j + 1] = ty; pos[j + 2] = tz;
        continue;
      }
      const x = pos[j], y = pos[j + 1], z = pos[j + 2];
      let vx = (x - prev[j]) * damp, vy = (y - prev[j + 1]) * damp, vz = (z - prev[j + 2]) * damp;
      // Air resistance acts along the cloth normal, so moving sheets bell out.
      const nx = normal[j], ny = normal[j + 1], nz = normal[j + 2];
      const vn = (vx * nx + vy * ny + vz * nz) / h;
      const w = this.vparam[i];
      const breeze = P.wind * w * (Math.sin(t * 1.3 + y * 2.1 + x * 0.7) + 0.6 * Math.sin(t * 2.7 + z * 3.1));
      let ax = -P.aero * vn * nx + breeze * 0.6;
      let ay = -P.aero * vn * ny - P.gravity;
      let az = -P.aero * vn * nz + breeze * 0.4;
      prev[j] = x; prev[j + 1] = y; prev[j + 2] = z;
      let px = x + vx + ax * h2, py = y + vy + ay * h2, pz = z + vz + az * h2;
      const s = memory[i];
      px += (tx - px) * s; py += (ty - py) * s; pz += (tz - pz) * s;
      pos[j] = px; pos[j + 1] = py; pos[j + 2] = pz;
    }

    const stiff = [P.stretch, P.shear, P.bend];
    const { ci, cj, cl, ck } = this, m = ci.length;
    const hx = this.headPos.x, hy = this.headPos.y, hz = this.headPos.z;
    const R = HEAD_RADIUS * 0.97, R2 = R * R;
    // Body core axis: head center down the head's local -Y for 1.05 units.
    const ux = -e[4], uy = -e[5], uz = -e[6];
    const coreLen = 1.05, cr = P.bodyRadius, cr2 = cr * cr;
    const lra = P.lra;

    for (let it = 0; it < P.iterations; it++) {
      for (let k = 0; k < m; k++) {
        const i = ci[k], j = cj[k];
        const wi = pinned[i] ? 0 : 1, wj = pinned[j] ? 0 : 1, ws = wi + wj;
        if (ws === 0) continue;
        const a = i * 3, b = j * 3;
        const dx = pos[b] - pos[a], dy = pos[b + 1] - pos[a + 1], dz = pos[b + 2] - pos[a + 2];
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (len < 1e-7) continue;
        const kind = ck[k];
        let diff = (len - cl[k]) / len;
        // Bending only resists folding flat, never helps compression: wrinkles survive.
        if (kind === 2 && diff < 0) diff *= 0.35;
        const sc = diff * stiff[kind] / ws;
        if (wi) { pos[a] += dx * sc; pos[a + 1] += dy * sc; pos[a + 2] += dz * sc; }
        if (wj) { pos[b] -= dx * sc; pos[b + 1] -= dy * sc; pos[b + 2] -= dz * sc; }
      }
    }

    for (let i = 1; i < n; i++) {
      if (pinned[i]) continue;
      const j = i * 3;
      // Long-range attachment to the crown pole: no rubbery over-stretch.
      let dx = pos[j] - pos[0], dy = pos[j + 1] - pos[1], dz = pos[j + 2] - pos[2];
      let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
      const max = this.maxDist[i] * lra;
      if (d > max) { const f = max / d; pos[j] = pos[0] + dx * f; pos[j + 1] = pos[1] + dy * f; pos[j + 2] = pos[2] + dz * f; }
      // Head sphere.
      dx = pos[j] - hx; dy = pos[j + 1] - hy; dz = pos[j + 2] - hz;
      d = dx * dx + dy * dy + dz * dz;
      if (d < R2) { const f = R / Math.sqrt(d || 1e-9); pos[j] = hx + dx * f; pos[j + 1] = hy + dy * f; pos[j + 2] = hz + dz * f; }
      // Body core capsule.
      dx = pos[j] - hx; dy = pos[j + 1] - hy; dz = pos[j + 2] - hz;
      const along = Math.max(0, Math.min(coreLen, dx * ux + dy * uy + dz * uz));
      const qx = dx - ux * along, qy = dy - uy * along, qz = dz - uz * along;
      const q2 = qx * qx + qy * qy + qz * qz;
      if (q2 < cr2) { const f = cr / Math.sqrt(q2 || 1e-9); pos[j] = hx + ux * along + qx * f; pos[j + 1] = hy + uy * along + qy * f; pos[j + 2] = hz + uz * along + qz * f; }
      // Floor.
      const fy = floorAt ? floorAt(pos[j], pos[j + 2]) : 0;
      if (pos[j + 1] < fy + 0.015) { pos[j + 1] = fy + 0.015; prev[j] = pos[j] - (pos[j] - prev[j]) * 0.5; prev[j + 2] = pos[j + 2] - (pos[j + 2] - prev[j + 2]) * 0.5; }
    }
  }
}

// A renderable mesh for a SheetCloth: same topology and UVs as the collection mesh
// (a seam column duplicated so the cloth print wraps cleanly).
export function makeClothGeometry(cloth) {
  const { radial, rows } = cloth;
  const count = 1 + rows * (radial + 1);
  const position = new Float32Array(count * 3), normal = new Float32Array(count * 3), uv = new Float32Array(count * 2);
  const map = new Uint32Array(count);
  const index = [];
  uv[0] = 0.5; uv[1] = 1; map[0] = 0;
  for (let r = 1; r <= rows; r++) {
    for (let c = 0; c <= radial; c++) {
      const i = 1 + (r - 1) * (radial + 1) + c;
      map[i] = cloth.id(r, c % radial);
      uv[i * 2] = c / radial;
      uv[i * 2 + 1] = 1 - r / rows;
      if (c < radial) {
        if (r === 1) index.push(0, i, i + 1);
        else { const above = i - radial - 1; index.push(above, i, above + 1, above + 1, i, i + 1); }
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('aCrease', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage));
  g.setIndex(index);
  g.userData.map = map;
  return g;
}

export function syncClothGeometry(geometry, cloth) {
  const map = geometry.userData.map, P = geometry.attributes.position.array, N = geometry.attributes.normal.array;
  const C = geometry.attributes.aCrease.array;
  for (let i = 0; i < map.length; i++) {
    const s = map[i] * 3, d = i * 3;
    C[i] = cloth.crease[map[i]];
    P[d] = cloth.pos[s]; P[d + 1] = cloth.pos[s + 1]; P[d + 2] = cloth.pos[s + 2];
    N[d] = cloth.normal[s]; N[d + 1] = cloth.normal[s + 1]; N[d + 2] = cloth.normal[s + 2];
  }
  geometry.attributes.position.needsUpdate = true;
  geometry.attributes.normal.needsUpdate = true;
  geometry.attributes.aCrease.needsUpdate = true;
}
