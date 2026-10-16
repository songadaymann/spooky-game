import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// The print finish, applied after tone mapping in display space:
//  - fuzz: every pixel samples a jittered neighbour, so edges go furry like flocked felt
//  - grain: luminance noise plus colored speckle (the blue/red specks on black in the refs)
//  - halation: a warm bleed around bright reds
//  - vignette
// Grain boils at 12 fps like film, so it never reads as dirt on the lens.
const StyleShader = {
  uniforms: {
    tDiffuse: { value: null },
    uRes: { value: new THREE.Vector2(1, 1) },
    uFrame: { value: 0 },
    uGrainPx: { value: 1.5 },
    uFuzz: { value: 2.2 },
    uGrain: { value: 0.11 },
    uSpeckle: { value: 0.07 },
    uVignette: { value: 0.32 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform vec2 uRes;
    uniform float uFrame, uGrainPx, uFuzz, uGrain, uSpeckle, uVignette;
    varying vec2 vUv;
    float hash12(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * .1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }
    void main() {
      vec2 cell = floor(gl_FragCoord.xy / uGrainPx);
      float f = mod(uFrame, 61.);
      vec2 jit = vec2(hash12(cell + f * 17.13), hash12(cell * 1.37 + f * 31.7)) - .5;
      vec2 px = 1. / uRes;
      vec3 c = texture2D(tDiffuse, vUv + jit * uFuzz * uGrainPx * px).rgb;

      float lum = dot(c, vec3(.299, .587, .114));
      float n = hash12(cell * .93 + f * 13.1) - .5;
      // Grain is strongest in midtones and still visible in the blacks.
      c += n * uGrain * (.55 + .9 * lum * (1. - lum));
      vec3 sp = vec3(hash12(cell + f + 1.7), hash12(cell + f + 9.2), hash12(cell + f + 4.4));
      sp = step(.965, sp) * (1. - lum);
      c += (sp * vec3(.35, .25, .55) - .02) * uSpeckle * 4.;

      vec2 q = vUv - .5;
      q.x *= uRes.x / uRes.y;
      c *= 1. - uVignette * smoothstep(.35, 1.05, length(q));
      gl_FragColor = vec4(c, 1.);
    }`,
};

export function makePost(renderer, scene, camera) {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.55, 0.6, 0.92);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  const style = new ShaderPass(StyleShader);
  composer.addPass(style);

  return {
    composer, bloom, style,
    setSize(w, h, dpr) {
      composer.setPixelRatio(dpr);
      composer.setSize(w, h);
      style.uniforms.uRes.value.set(w * dpr, h * dpr);
      style.uniforms.uGrainPx.value = Math.max(1, dpr * 0.85);
    },
    render(frame) {
      style.uniforms.uFrame.value = frame;
      composer.render();
    },
  };
}
