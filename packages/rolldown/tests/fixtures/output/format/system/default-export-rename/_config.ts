import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

export default defineTest({
  config: {
    output: {
      format: 'system',
    },
  },
  afterTest: (output) => {
    const chunk = output.output[0];
    if (chunk.type === 'chunk') {
      // Should export the renamed tokens (batched exports({...}) form)
      expect(chunk.code).toContain('fnOne');
      expect(chunk.code).toContain('fnTwo');
      // Should call exports() — either single or batched form
      expect(chunk.code).toContain('exports(');
      // Should not export default
      expect(chunk.code).not.toContain('exports("default"');
    }
  },
});
