import * as THREE from 'three';
import GUI from 'three/addons/libs/lil-gui.module.min.js';
import { FLOCK_SHARED } from './style/flock-material.js';
import { makePost } from './style/post.js';
import { PAL } from './style/palette.js';
import { buildWorld } from './world/world.js';
import { Ghost } from './ghost/ghost.js';
import { DEFAULT_CLOTH } from './ghost/cloth.js';
import { generateCollectionV4, PALETTES_V4, EXPRESSIONS } from './ghost/mintborn/catalog-v4.js';
import { HATS, GLASSES, MARKINGS, labelFor } from './ghost/mintborn/catalog.js';

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.toneMapping = THREE.NoToneMapping;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(PAL.voidGreen);

// Isometric-ish orthographic camera, looking down from the near-right.
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 220);
const CAM_DIR = new THREE.Vector3(1, 1.22, 1).normalize();
const camTarget = new THREE.Vector3();
let viewHeight = 11;

// Low sun from the near-left: long shadows run off to the right, as in the court painting.
const sunDir = new THREE.Vector3(-0.507, 0.407, 0.76).normalize();
FLOCK_SHARED.uSunDir.value.copy(sunDir);
const sun = new THREE.DirectionalLight(0xffffff, 1);
sun.castShadow = true;
const mobile = matchMedia('(pointer: coarse)').matches;
sun.shadow.mapSize.set(mobile ? 2048 : 4096, mobile ? 2048 : 4096);
const SHADOW_HALF = 24;
Object.assign(sun.shadow.camera, { left: -SHADOW_HALF, right: SHADOW_HALF, top: SHADOW_HALF, bottom: -SHADOW_HALF, near: 1, far: 120 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
sun.shadow.radius = 1.5;
scene.add(sun, sun.target);

const world = buildWorld(scene);
FLOCK_SHARED.uEdge.value.set(world.center.x, world.center.y, 27, 44);

// The collection is generated from its seed, exactly as the workshop does: any ghost
// can be rebuilt from its number alone.
const collection = generateCollectionV4();
const params = new URLSearchParams(location.search);
let index = Math.max(0, Math.min(collection.length - 1, (Number(params.get('ghost')) || 8520) - 1));

// Phones get fewer solver iterations; the sheet is a touch stretchier but keeps 60 fps.
const ghost = new Ghost({ position: world.spawn, clothParams: mobile ? { iterations: 4 } : {} });
scene.add(ghost.group);
const hudName = document.querySelector('#ghost-name');
const hudTraits = document.querySelector('#ghost-traits');
function showGhost(i) {
  index = (i + collection.length) % collection.length;
  const r = collection[index];
  ghost.setRecipe(r);
  hudName.textContent = `Ghost ${String(r.number).padStart(5, '0')}`;
  const palette = PALETTES_V4.find(p => p.id === r.palette)?.label ?? r.palette;
  hudTraits.textContent = [palette, r.hat !== 'none' && labelFor(HATS, r.hat), r.glasses !== 'none' && labelFor(GLASSES, r.glasses),
    r.marking !== 'none' && labelFor(MARKINGS, r.marking), labelFor(EXPRESSIONS, r.expression)].filter(Boolean).join(' · ');
  const url = new URL(location.href);
  url.searchParams.set('ghost', r.number);
  history.replaceState(null, '', url);
}
showGhost(index);
ghost.snap();
camTarget.copy(ghost.position).setY(1);

const post = makePost(renderer, scene, camera);

function resize() {
  const w = innerWidth, h = innerHeight, dpr = Math.min(devicePixelRatio, 2);
  renderer.setPixelRatio(dpr);
  renderer.setSize(w, h, false);
  post.setSize(w, h, dpr);
  FLOCK_SHARED.uGrainPx.value = Math.max(1, dpr * 0.85);
  const aspect = w / h;
  // Keep the ghost a readable size on narrow phones.
  const vh = aspect < 0.8 ? viewHeight * 1.25 : viewHeight;
  camera.left = -vh * aspect / 2; camera.right = vh * aspect / 2;
  camera.top = vh / 2; camera.bottom = -vh / 2;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// Input. Screen-relative: up on screen is away from the camera.
const keys = new Set();
const SCREEN_UP = new THREE.Vector2(-1, -1).normalize();
const SCREEN_RIGHT = new THREE.Vector2(1, -1).normalize();
addEventListener('keydown', e => {
  if (e.target instanceof HTMLInputElement) return;
  keys.add(e.code);
  if (e.code === 'Space') { ghost.twirl(); e.preventDefault(); }
  if (e.code === 'KeyN') showGhost(index + 1);
  if (e.code === 'KeyB') showGhost(index - 1);
  if (e.code === 'KeyR') showGhost(Math.floor(Math.random() * collection.length));
  if (e.code === 'KeyG') gui.show(gui._hidden);
  if (e.code === 'KeyH') document.body.classList.toggle('clean');
  if (e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const raycaster = new THREE.Raycaster();
const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const pointers = new Map();
let steer = null;        // world point the ghost is gliding toward
let steering = false;    // a finger or mouse is held down
let pinchStart = null;
function groundPoint(e) {
  const r = canvas.getBoundingClientRect();
  raycaster.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  return raycaster.ray.intersectPlane(ground, new THREE.Vector3());
}
canvas.addEventListener('pointerdown', e => {
  canvas.setPointerCapture(e.pointerId);
  pointers.set(e.pointerId, e);
  if (pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    pinchStart = { d: Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY), vh: viewHeight };
    steering = false; steer = null;
    return;
  }
  steering = true;
  steer = groundPoint(e);
  hint.classList.add('used');
});
canvas.addEventListener('pointermove', e => {
  if (!pointers.has(e.pointerId)) return;
  pointers.set(e.pointerId, e);
  if (pinchStart && pointers.size === 2) {
    const [a, b] = [...pointers.values()];
    const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    viewHeight = THREE.MathUtils.clamp(pinchStart.vh * pinchStart.d / Math.max(20, d), 7, 34);
    resize();
    return;
  }
  if (steering) steer = groundPoint(e);
});
const release = e => {
  pointers.delete(e.pointerId);
  if (pointers.size < 2) pinchStart = null;
  if (pointers.size === 0) steering = false;
};
canvas.addEventListener('pointerup', release);
canvas.addEventListener('pointercancel', release);
canvas.addEventListener('dblclick', () => ghost.twirl());
canvas.addEventListener('wheel', e => {
  viewHeight = THREE.MathUtils.clamp(viewHeight * Math.exp(e.deltaY * 0.0012), 7, 34);
  resize();
  e.preventDefault();
}, { passive: false });

document.querySelector('#twirl').addEventListener('click', () => ghost.twirl());
document.querySelector('#next').addEventListener('click', () => showGhost(index + 1));
document.querySelector('#random').addEventListener('click', () => showGhost(Math.floor(Math.random() * collection.length)));

function readMove() {
  const k = (...codes) => codes.some(c => keys.has(c)) ? 1 : 0;
  const up = k('KeyW', 'ArrowUp') - k('KeyS', 'ArrowDown');
  const right = k('KeyD', 'ArrowRight') - k('KeyA', 'ArrowLeft');
  const move = new THREE.Vector2();
  if (up || right) {
    move.addScaledVector(SCREEN_UP, up).addScaledVector(SCREEN_RIGHT, right).normalize();
    steer = null;
    hint.classList.add('used');
    return move;
  }
  if (steer) {
    const dx = steer.x - ghost.position.x, dz = steer.z - ghost.position.z, d = Math.hypot(dx, dz);
    if (d < 0.25 && !steering) { steer = null; return move; }
    // Ease in over the last stretch so the sheet settles instead of stopping dead.
    move.set(dx, dz).divideScalar(Math.max(d, 1e-4)).multiplyScalar(Math.min(1, d / 2.2));
  }
  return move;
}

// Tuning panel (G).
const gui = new GUI({ title: 'Sheet tuning (G)' });
gui.hide();
const cp = ghost.cloth.params;
const cloth = gui.addFolder('Cloth');
cloth.add(cp, 'gravity', 0, 20, 0.1);
cloth.add(cp, 'damping', 0, 0.1, 0.001);
cloth.add(cp, 'aero', 0, 6, 0.05);
cloth.add(cp, 'wind', 0, 2, 0.01);
cloth.add(cp, 'memTop', 0, 0.6, 0.005).onChange(() => ghost.cloth.applyParams());
cloth.add(cp, 'memHem', 0, 0.1, 0.001).onChange(() => ghost.cloth.applyParams());
cloth.add(cp, 'memFall', 0.2, 1, 0.01).onChange(() => ghost.cloth.applyParams());
cloth.add(cp, 'pinV', 0.02, 0.26, 0.005).onChange(() => ghost.cloth.applyParams());
cloth.add(cp, 'shear', 0, 1, 0.01);
cloth.add(cp, 'bend', 0, 1, 0.01);
cloth.add(cp, 'iterations', 1, 16, 1);
cloth.add(cp, 'lra', 1, 1.2, 0.005);
cloth.add({ reset() { Object.assign(cp, DEFAULT_CLOTH); ghost.cloth.applyParams(); gui.controllersRecursive().forEach(c => c.updateDisplay()); } }, 'reset').name('Reset cloth');
const look = gui.addFolder('Print');
look.add(post.style.uniforms.uFuzz, 'value', 0, 6, 0.1).name('fuzz');
look.add(post.style.uniforms.uGrain, 'value', 0, 0.4, 0.005).name('grain');
look.add(post.style.uniforms.uSpeckle, 'value', 0, 0.3, 0.005).name('speckle');
look.add(post.style.uniforms.uVignette, 'value', 0, 1, 0.01).name('vignette');
look.add(post.bloom, 'strength', 0, 2, 0.01).name('glow');

const hint = document.querySelector('#hint');
const clock = new THREE.Clock();
let time = 0;
const lookAhead = new THREE.Vector3();
const snapStep = (SHADOW_HALF * 2) / sun.shadow.mapSize.x;

renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05);
  time += dt;
  const dash = keys.has('ShiftLeft') || keys.has('ShiftRight');
  ghost.update(dt, readMove(), { dash, world });
  world.update(time, dt, ghost.position);

  lookAhead.copy(ghost.velocity).multiplyScalar(0.22);
  const want = ghost.position.clone().add(lookAhead).setY(1);
  camTarget.lerp(want, 1 - Math.exp(-3 * dt));
  camera.position.copy(camTarget).addScaledVector(CAM_DIR, 80);
  camera.lookAt(camTarget);

  // Shadow box follows the view, snapped to texels so edges don't crawl.
  const sx = Math.round(camTarget.x / snapStep) * snapStep, sz = Math.round(camTarget.z / snapStep) * snapStep;
  sun.target.position.set(sx, 0, sz);
  sun.position.set(sx, 0, sz).addScaledVector(sunDir, 60);

  const frame = Math.floor(time * 12);
  FLOCK_SHARED.uFrame.value = frame;
  post.render(frame);
});

window.__spooky = { THREE, scene, camera, ghost, world, collection, showGhost, renderer, post, keys,
  zoom(v) { viewHeight = v; resize(); } };
