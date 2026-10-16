import * as THREE from 'three';

// One material for the whole world: flat painted color fields, a soft stippled
// terminator, near-black cast shadows with grainy penumbras, an optional drawn
// grid (pool tiles), low-frequency gouache mottling and emissive glow.
// Everything is procedural, so a scene made from it carries no bitmaps.

// Shared by every flock material, updated once per frame.
export const FLOCK_SHARED = {
  uSunDir: { value: new THREE.Vector3(-0.6, 0.55, 0.45).normalize() },
  uFrame: { value: 0 },
  uGrainPx: { value: 1.5 },
  uEdge: { value: new THREE.Vector4(0, 0, 30, 46) }, // world center xz, fade start, fade end
  uVoid: { value: new THREE.Color('#0a1612') },
};

const vertexShader = /* glsl */`
#include <common>
#include <shadowmap_pars_vertex>
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
#ifdef USE_CREASE
attribute float aCrease;
varying float vCrease;
#endif
void main() {
  #ifdef USE_CREASE
  vCrease = aCrease;
  #endif
  #include <beginnormal_vertex>
  #include <defaultnormal_vertex>
  #include <begin_vertex>
  #include <project_vertex>
  #include <worldpos_vertex>
  #include <shadowmap_vertex>
  vUv = uv;
  vWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * objectNormal);
}`;

const fragmentShader = /* glsl */`
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
uniform vec3 uColor;
uniform sampler2D uMap;
uniform float uUseMap;
uniform vec3 uShadeTint;
uniform vec3 uCastTint;
uniform vec2 uTerm;
uniform float uMottle;
uniform vec4 uGrid;        // cell size, line half-width, enabled, wobble
uniform vec3 uGridColor;
uniform vec3 uEmissive;
uniform float uEmitMask;   // glow only where the map is pale (a carved face)
uniform float uBack;
uniform float uLift;       // brightens toward the top of an object (gouache light)
uniform vec3 uSunDir;
uniform float uFrame;
uniform float uGrainPx;
uniform vec4 uEdge;
uniform vec3 uVoid;
varying vec3 vWorldPos;
varying vec3 vWorldNormal;
varying vec2 vUv;
#ifdef USE_CREASE
varying float vCrease;
#endif

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash12(i), hash12(i + vec2(1, 0)), u.x),
             mix(hash12(i + vec2(0, 1)), hash12(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  return .55 * vnoise(p) + .3 * vnoise(p * 2.13 + 7.1) + .15 * vnoise(p * 4.7 - 3.3);
}

void main() {
  vec3 base = uColor;
  float emit = 1.;
  if (uUseMap > .5) {
    base = texture2D(uMap, vUv).rgb;
    if (uEmitMask > .5) emit = smoothstep(.3, .55, base.g);
  }

  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;

  if (uGrid.z > .5) {
    vec3 an = abs(N);
    vec2 gp = an.y > .5 ? vWorldPos.xz : (an.x > an.z ? vWorldPos.zy : vWorldPos.xy);
    gp += (vec2(vnoise(gp * .9), vnoise(gp * .9 + 11.)) - .5) * uGrid.w;
    vec2 f = abs(fract(gp / uGrid.x + .5) - .5) * uGrid.x;
    float d = min(f.x, f.y);
    float aa = fwidth(d) * .8;
    float line = 1. - smoothstep(uGrid.y - aa, uGrid.y + aa, d);
    base = mix(base, uGridColor, line);
  }

  // Grain cell in screen space, re-rolled at the post pass's 12 fps boil.
  float g = hash12(floor(gl_FragCoord.xy / uGrainPx) + mod(uFrame, 61.) * 7.31);

  float ndl = dot(N, uSunDir);
  float lit = smoothstep(uTerm.x, uTerm.y, ndl + (g - .5) * .16);
  float sh = getShadowMask();
  float unshadowed = smoothstep(g - .22, g + .22, sh);

  vec3 col = mix(base * uShadeTint, base, lit);
  col = mix(base * uCastTint, col, unshadowed);
  col *= 1. + uLift * (N.y * .5 - .15);
  #ifdef USE_CREASE
  // Fold valleys go dark and a little cooler; ridges catch a sliver of light.
  float valley = smoothstep(.02, .7, vCrease), ridge = smoothstep(.05, .6, -vCrease);
  col *= mix(vec3(1.), vec3(.5, .47, .58), valley);
  col *= 1. + .1 * ridge * lit;
  #endif
  if (!gl_FrontFacing) col *= uBack;

  float m = fbm(vWorldPos.xz * .55 + vWorldPos.y * .4);
  col *= 1. + (m - .5) * uMottle;

  if (uEmitMask > .5) col = mix(col, base, emit);
  col += uEmissive * emit;

  float r = length(vWorldPos.xz - uEdge.xy);
  col = mix(col, uVoid, smoothstep(uEdge.z, uEdge.w, r));

  gl_FragColor = vec4(col, 1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`;

export function flockMaterial({
  color = '#ffffff', map = null, shade = 0.62, shadeTint = null, cast = null,
  term = [-0.1, 0.45], mottle = 0.07, grid = null, emissive = null, emitMask = false, back = 0.6,
  lift = 0.12, side = THREE.FrontSide, crease = false,
} = {}) {
  const c = new THREE.Color(color);
  const shadeVec = shadeTint ? new THREE.Color(shadeTint) : new THREE.Color(shade, shade * 0.93, shade * 1.06);
  const castVec = cast ? new THREE.Color(cast) : shadeVec.clone();
  const uniforms = {
    ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
    ...FLOCK_SHARED,
    uColor: { value: c },
    uMap: { value: map },
    uUseMap: { value: map ? 1 : 0 },
    uShadeTint: { value: new THREE.Vector3(shadeVec.r, shadeVec.g, shadeVec.b) },
    uCastTint: { value: new THREE.Vector3(castVec.r, castVec.g, castVec.b) },
    uTerm: { value: new THREE.Vector2(...term) },
    uMottle: { value: mottle },
    uGrid: { value: new THREE.Vector4(grid?.cell ?? 1, grid?.width ?? 0.02, grid ? 1 : 0, grid?.wobble ?? 0.02) },
    uGridColor: { value: new THREE.Color(grid?.color ?? '#ffffff') },
    uEmissive: { value: new THREE.Color(emissive ?? '#000000') },
    uEmitMask: { value: emitMask ? 1 : 0 },
    uBack: { value: back },
    uLift: { value: lift },
  };
  const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader, lights: true, side, defines: crease ? { USE_CREASE: '' } : {} });
  material.shadowSide = side === THREE.DoubleSide ? THREE.DoubleSide : THREE.FrontSide;
  // Convenience handles so callers can treat it like a standard material.
  material.color = c;
  material.userData.flock = true;
  return material;
}

// Linear-light multiplier for a cast-shadow tint: shadows in the references are
// close to black, a touch cooler than the ground they fall on.
export function castOn(color, amount = 0.04) {
  return new THREE.Color(amount, amount * 0.92, amount * 1.2);
}
