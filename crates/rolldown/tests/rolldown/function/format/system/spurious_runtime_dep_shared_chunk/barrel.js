// This barrel is side-effect-free (moduleSideEffects: false) so it will be
// eliminated by tree-shaking. However, its import of cjs-dep.js (default
// import of a CJS module) causes depended_runtime_helper=ToEsm to be set on
// this module. patch_module_dependencies then propagates ToEsm to shared.js.
import cjsDep from './cjs-dep.js';
export const answer = cjsDep.x;
