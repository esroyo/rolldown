// Entry module: exports named `v` and a default object.
// The dynamic import of `lazy.js`, which in turn imports from this module,
// creates a circular dependency across chunks. Rolldown places this module
// in a common chunk, leaving a facade entry chunk that must re-export `v`
// and `default` via its setter — the path fixed by the facade_entry_reexport bug.
import { v } from './chunk.js';

const mod = {
  v,
  loadLazy: () => import('./lazy.js'),
};

export { v };
export default mod;
