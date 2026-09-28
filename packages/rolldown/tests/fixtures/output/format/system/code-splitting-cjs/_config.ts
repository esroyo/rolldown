import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

export default defineTest({
  config: {
    input: ['entry1.js', 'entry2.js'],
    output: {
      format: 'system',
      preserveModules: true,
    },
  },
  afterTest: (output) => {
    const chunks = output.output.filter((c) => c.type === 'chunk');

    // Find the pure-ESM shared chunk (not an entry, exports "getValue")
    const sharedChunk = chunks.find(
      (c) => c.type === 'chunk' && !c.isEntry && c.code.includes('getValue'),
    );
    expect(sharedChunk).toBeDefined();

    if (sharedChunk?.type === 'chunk') {
      // Regression test: a pure-ESM leaf chunk must NOT import the rolldown
      // runtime. Previously, the runtime chunk was spuriously injected as a
      // dependency of leaf chunks whose modules had inherited `depended_runtime_helper`
      // bits from CJS co-dependencies, producing a dead setter in the System output.
      expect(sharedChunk.code).not.toContain('rolldown-runtime');
      expect(sharedChunk.imports).not.toContain(expect.stringContaining('rolldown-runtime'));
      // The pure-ESM chunk must have no setters (no deps at all)
      expect(sharedChunk.code).not.toContain('setters:');
    }
  },
});
