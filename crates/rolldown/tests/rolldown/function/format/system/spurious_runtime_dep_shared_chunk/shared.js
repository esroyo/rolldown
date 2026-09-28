// Pure-ESM shared module. The side-effect import of barrel.js means barrel.js
// is in this module's meta.dependencies. Since barrel.js is eliminated (side-
// effect-free) but has depended_runtime_helper=ToEsm, shared.js inherits ToEsm
// from it via patch_module_dependencies. This module's own code never calls
// __toESM — the runtime dep is spurious.
import './barrel.js';

export function getValue() {
  return 42;
}
