// Imports from main.js, creating a circular dependency that forces
// main.js into a common chunk rather than staying in the entry chunk.
import { v } from './main.js';

export function greet() {
  return `v=${v}`;
}
