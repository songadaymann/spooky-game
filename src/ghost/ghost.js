import * as THREE from 'three';
import { SheetCloth, makeClothGeometry, syncClothGeometry, CROWN } from './cloth.js';
import { makeSheetPrint } from './sheet-print.js';
import { buildHat, buildGlasses } from './mintborn/accessories.js';
import { flockMaterial } from '../style/flock-material.js';

const SUBSTEP = 1 / 120;
const tmpQ = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0);

// Accessory palette, same derivations as the collection's ghost.js so a hat keeps its
// identity; only the shading model changes.
function accessoryColors(traits) {
  const C = h => new THREE.Color(h);
  const main = C(traits.accessoryColor), trim = C(traits.trimColor), cream = C('#eee2c5');
  const bonnetCotton = main.clone().lerp(cream, 0.79);
  return {
    main, trim, cream, ink: C('#171a20'),
    frame: C('#895b45').lerp(main, 0.23), lens: C('#253d43'), red: C('#b54d48'), blue: C('#3e8dba'), metal: C('#bc9b61'),
    seam: main.clone().multiplyScalar(0.7), stitch: main.clone().lerp(trim, 0.45), leather: C('#90694c'),
    straw: C('#d4b47c'), strawSeam: C('#b99762'), paper: C('#e4dcc8'), paperInk: C('#aaa18a'),
    mushroom: C('#a7513b').lerp(main, 0.15), gill: C('#c2b599'), leaf: C('#536d50'),
    gem: main.clone().lerp(C('#398e89'), 0.3), lensGlint: C('#739397'),
    disguiseNose: C('#c9906b'), disguiseHair: C('#292821'), oilskin: C('#d7b139'), oilskinSeam: C('#9b7928'),
    bonnetCotton, bonnetSeam: bonnetCotton.clone().multiplyScalar(0.83),
    huntingWool: C('#bc3730'), huntingSeam: C('#853a30'), huntingLining: C('#b8b2a0'),
  };
}
const QUIET = ['seam', 'stitch', 'strawSeam', 'paperInk', 'gill', 'lensGlint'];

export class Ghost {
  constructor({ position = new THREE.Vector3(), clothParams = {} } = {}) {
    this.group = new THREE.Group();
    this.cloth = new SheetCloth({ params: clothParams });
    this.geometry = makeClothGeometry(this.cloth);
    this.material = flockMaterial({ color: '#ffffff', side: THREE.DoubleSide, shade: 0.66, term: [-0.3, 0.55], back: 0.5, lift: 0.14, mottle: 0.05, crease: true });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = this.mesh.receiveShadow = true;
    this.group.add(this.mesh);

    // Head frame: origin at the crown center. Accessories are authored in ghost space
    // (crown at y = 1.9), so they hang under an offset child.
    this.head = new THREE.Group();
    this.headContent = new THREE.Group();
    this.headContent.position.copy(CROWN).negate();
    this.head.add(this.headContent);
    this.hat = new THREE.Group();
    this.glasses = new THREE.Group();
    this.headContent.add(this.hat, this.glasses);
    this.group.add(this.head);

    this.position = position.clone();
    this.velocity = new THREE.Vector3();
    this.yaw = 0.6;
    this.yawVel = 0;
    this.lean = new THREE.Vector3();
    this.leanVel = new THREE.Vector3();
    this.spinT = 1;
    this.spinDir = 1;
    this.time = 0;
    this.acc = 0;
    this.headPrev = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
    this.headNow = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
    this.headMatrix = new THREE.Matrix4();
    this.radius = 0.6;
  }

  setRecipe(recipe) {
    this.recipe = recipe;
    this.material.uniforms.uMap.value?.dispose();
    this.material.uniforms.uMap.value = makeSheetPrint(recipe);
    this.material.uniforms.uUseMap.value = 1;
    for (const g of [this.hat, this.glasses]) {
      g.traverse(o => { o.geometry?.dispose(); });
      g.clear();
    }
    this.accessoryMaterials && Object.values(this.accessoryMaterials).forEach(m => m.dispose());
    const colors = accessoryColors(recipe);
    const hardSurface = ['hardhat', 'headphones', 'antenna'].includes(recipe.hat);
    this.accessoryMaterials = Object.fromEntries(Object.entries(colors).map(([k, c]) => {
      const m = flockMaterial({ color: c, shade: 0.6, term: [-0.15, 0.5], lift: hardSurface ? 0.2 : 0.12, mottle: 0.05 });
      if (QUIET.includes(k)) m.userData.noAccessoryShadow = true;
      return [k, m];
    }));
    buildHat(this.hat, recipe.hat, this.accessoryMaterials);
    buildGlasses(this.glasses, recipe.glasses, this.accessoryMaterials);
    for (const g of [this.hat, this.glasses]) g.traverse(o => { if (o.isMesh) o.receiveShadow = true; });
  }

  twirl() {
    if (this.spinT < 1) return;
    this.spinT = 0;
    this.spinDir = Math.random() < 0.5 ? -1 : 1;
  }

  // Ghost space root sits on the ground under the sheet; the head carries the cloth.
  computeHead(out, t) {
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    const hover = 0.07 + 0.05 * Math.sin(t * 1.7) + 0.4 * Math.sin(Math.PI * Math.min(1, this.spinT)) * (this.spinT < 1 ? 1 : 0);
    const spin = this.spinT < 1 ? this.spinDir * Math.PI * 2 * THREE.MathUtils.smootherstep(this.spinT, 0, 1) : 0;
    out.q.setFromAxisAngle(yAxis, this.yaw + spin);
    // Lean is a world-space tilt axis; magnitude is the angle. Pivot near the hips.
    const angle = this.lean.length();
    if (angle > 1e-4) {
      tmpQ.setFromAxisAngle(this.lean.clone().divideScalar(angle), angle);
      out.q.premultiply(tmpQ);
    }
    const sway = 0.025 * Math.sin(t * 0.9) * (1 - Math.min(1, speed / 2));
    tmpQ.setFromAxisAngle(new THREE.Vector3(0, 0, 1).applyAxisAngle(yAxis, this.yaw), sway);
    out.q.premultiply(tmpQ);
    const pivot = new THREE.Vector3(0, 0.95, 0);
    out.p.set(0, CROWN.y - pivot.y, 0).applyQuaternion(out.q).add(pivot).add(this.position);
    out.p.y += hover;
  }

  snap() {
    this.computeHead(this.headNow, this.time);
    this.headPrev.p.copy(this.headNow.p); this.headPrev.q.copy(this.headNow.q);
    this.headMatrix.compose(this.headNow.p, this.headNow.q, new THREE.Vector3(1, 1, 1));
    this.cloth.reset(this.headMatrix);
    syncClothGeometry(this.geometry, this.cloth);
  }

  // move: world-space xz direction, length 0..1. world: { resolve(pos, r), floorAt(x, z) }
  update(dt, move, { dash = false, world } = {}) {
    dt = Math.min(dt, 1 / 20);
    this.time += dt;
    const maxSpeed = dash ? 9.5 : 5.2;
    const target = new THREE.Vector3(move.x, 0, move.y).multiplyScalar(maxSpeed);
    const moving = target.lengthSq() > 0.01;
    const k = moving ? 6 : 3.2;
    const before = this.velocity.clone();
    this.velocity.lerp(target, 1 - Math.exp(-k * dt));
    this.position.addScaledVector(this.velocity, dt);
    if (world) {
      const fixed = world.resolve(this.position, this.radius);
      if (fixed) this.velocity.multiplyScalar(0.85);
    }
    const accel = this.velocity.clone().sub(before).divideScalar(Math.max(dt, 1e-4));

    // Facing follows travel with a damped spring, so turns overshoot a touch.
    const speed = Math.hypot(this.velocity.x, this.velocity.z);
    if (speed > 0.4) {
      const want = Math.atan2(this.velocity.x, this.velocity.z);
      let d = want - this.yaw;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.yawVel += (d * 60 - this.yawVel * 11) * dt;
    } else this.yawVel *= Math.exp(-6 * dt);
    this.yaw += this.yawVel * dt;

    // Lean into travel and against braking: tilt axis = up x direction.
    const leanTarget = new THREE.Vector3(this.velocity.z * 0.035 + accel.z * 0.012, 0, -(this.velocity.x * 0.035 + accel.x * 0.012));
    if (leanTarget.length() > 0.42) leanTarget.setLength(0.42);
    this.leanVel.addScaledVector(leanTarget.sub(this.lean).multiplyScalar(80).sub(this.leanVel.clone().multiplyScalar(13)), dt);
    this.lean.addScaledVector(this.leanVel, dt);

    if (this.spinT < 1) this.spinT = Math.min(1, this.spinT + dt / 0.85);

    // Fixed-step cloth, with the head interpolated across substeps.
    this.headPrev.p.copy(this.headNow.p); this.headPrev.q.copy(this.headNow.q);
    this.computeHead(this.headNow, this.time);
    this.acc += dt;
    const steps = Math.min(6, Math.floor(this.acc / SUBSTEP));
    this.acc -= steps * SUBSTEP;
    if (this.acc > SUBSTEP) this.acc = 0;
    const p = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    const floorAt = world ? (x, z) => world.floorAt(x, z) : null;
    for (let s = 1; s <= steps; s++) {
      const f = s / steps;
      p.lerpVectors(this.headPrev.p, this.headNow.p, f);
      q.slerpQuaternions(this.headPrev.q, this.headNow.q, f);
      this.headMatrix.compose(p, q, one);
      this.cloth.step(SUBSTEP, this.headMatrix, floorAt);
    }
    this.cloth.computeNormals();
    syncClothGeometry(this.geometry, this.cloth);
    this.head.position.copy(this.headNow.p);
    this.head.quaternion.copy(this.headNow.q);
  }
}
