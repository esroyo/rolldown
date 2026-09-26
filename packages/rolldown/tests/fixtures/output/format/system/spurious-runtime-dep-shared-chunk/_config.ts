import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

export default defineTest({
  config: {
    input: ['entry-a.js', 'entry-b.js'],
    output: {
      format: 'system',
    },
    treeshake: {
      moduleSideEffects: false,
    },
  },
  afterTest: (output) => {
    const chunks = output.output.filter((c) => c.type === 'chunk');

    // Find the shared non-entry chunk (contains getValue, shared by both entries).
    const sharedChunk = chunks.find(
      (c) => c.type === 'chunk' && !c.isEntry && c.code.includes('getValue'),
    );
    expect(sharedChunk, 'shared chunk must exist').toBeDefined();

    if (sharedChunk?.type !== 'chunk') return;

    // Regression: before the fix, shared.js inherited depended_runtime_helper=ToEsm
    // from the eliminated barrel.js via patch_module_dependencies propagation.
    // compute_cross_chunk_links unconditionally added __toESM to the chunk's
    // depended_symbols, producing a spurious "rolldown-runtime.system.js" in
    // System.register([...]) with a dead setter function(e){e.t,e.t,e.t}.
    //
    // After the fix (own_depended_runtime_helper tracks only pre-patch bits),
    // the shared chunk has no spurious runtime dep in its System.register array.
    const systemRegisterMatch = sharedChunk.code.match(/System\.register\(\[(.*?)\]/s);
    if (systemRegisterMatch) {
      expect(
        systemRegisterMatch[1],
        'shared chunk System.register dep list must not contain rolldown-runtime',
      ).not.toContain('rolldown-runtime');
    }

    expect(
      sharedChunk.imports,
      'shared chunk must not import rolldown-runtime as a separate dep',
    ).not.toContain(expect.stringContaining('rolldown-runtime'));

    // The shared chunk must not contain a dead setter pattern.
    // Before the fix the setter for the spurious runtime dep was either
    // `function(module){module.__toESM}` (not assigning anything) or
    // after minification `function(e){e.t,e.t,e.t}`.
    // A dead setter assigns no local variable from the module argument.
    expect(
      sharedChunk.code,
      'shared chunk must not have a dead runtime setter (function(e){e.t,...})',
    ).not.toMatch(/setters:\s*\[function\s*\(\w+\)\s*\{\s*\w+\.\w+/);
  },
});
