import { test } from 'vitest';
import assert from 'node:assert/strict';
import { validateSource } from '#source/setup/script-format';

for (const [name, source] of [
  ['static imports', 'import x from "x";'],
  ['exports', 'export const x = 1;'],
  ['dynamic imports', 'await import("x");'],
  ['import metadata', 'const x = import.meta.url;'],
  ['CommonJS', 'require("x");'],
  ['Scriptable modules', 'importModule("x");'],
  ['process globals', 'process.exit();'],
  ['browser globals', 'window.alert("x");'],
  ['document globals', 'document.title;'],
  ['global access', 'globalThis.Script.complete();'],
] as const) {
  test(`release validation rejects ${name}`, () => {
    assert.throws(() => validateSource(source));
  });
}

test('release validation distinguishes forbidden globals from ordinary property names and literals', () => {
  validateSource(`// process window document globalThis require importModule
const labels = { process: 'window', document: 'globalThis', require: 'importModule' };
const { process: label } = labels;
labels.process;
labels['require'];
await Promise.resolve(label);`);
});

test('release validation rejects malformed syntax and an unwrapped top-level return', () => {
  assert.throws(() => validateSource('const = broken;'));
  assert.throws(() => validateSource('return;'));
});
