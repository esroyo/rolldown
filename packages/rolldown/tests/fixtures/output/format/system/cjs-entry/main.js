(function (global, factory) {
  'use strict';
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else {
    global.myLib = factory();
  }
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';
  return { answer: 42 };
});
