import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

export default defineTest({
  config: {
    output: {
      format: 'system',
    },
  },
  afterTest: (output) => {
    // Dynamic import produces one chunk: entry (dynamic vars won't be resolved)
    expect(output.output).toHaveLength(1);

    const entry = output.output.find((c) => c.type === 'chunk' && c.isEntry);

    expect(entry).toBeDefined();

    // But still the entry should use module.import() instead of import() in SystemJS
    if (entry?.type === 'chunk') {
      expect(entry.code).toContain('module.import(');
    }
  },
});
