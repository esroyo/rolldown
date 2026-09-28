import { defineTest } from 'rolldown-tests';
import { expect } from 'vitest';

// Regression test: a CJS UMD entry bundled with format="system" + minify:true
// should not produce an empty execute block.
//
// Rolldown wraps CJS modules in __commonJSMin and annotates the call with
// /* @__PURE__ */. With format="system"+minify, the SystemJS emitter fails to
// emit the require_xxx() call inside the execute block, so the factory has no
// consumer — the minifier then legitimately eliminates it based on the
// @__PURE__ annotation, leaving an empty execute body.
export default defineTest({
  config: {
    output: {
      format: 'system',
      minify: true,
    },
  },
  afterTest: (output) => {
    const chunk = output.output[0];
    expect(chunk.type).toBe('chunk');
    if (chunk.type === 'chunk') {
      expect(chunk.code).toContain('42');
    }
  },
});
