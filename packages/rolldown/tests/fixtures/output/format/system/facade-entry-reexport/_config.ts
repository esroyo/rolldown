import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

export default defineTest({
  config: {
    output: {
      format: 'system',
    },
  },
  afterTest: (output) => {
    expect(output.output).toHaveLength(3);

    const entry = output.output.find((c) => c.type === 'chunk' && c.isEntry);

    expect(entry).toBeDefined();

    if (entry?.type === 'chunk') {
      expect(entry.code).toContain('exports("v"');
      expect(entry.code).toContain('exports("default"');
    }
  },
});
