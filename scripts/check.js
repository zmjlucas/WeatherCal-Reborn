const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { buildArtifacts } = require('./build');
const root = path.resolve(__dirname, '..');
let modules = 0;
let largest = { lines: 0 };
for (const entry of fs.readdirSync(path.join(root, 'src'), { recursive: true })) {
  if (!entry.endsWith('.js')) continue;
  const source = fs.readFileSync(path.join(root, 'src', entry), 'utf8');
  const lines = source.trimEnd().split('\n').length;
  assert(lines <= 500, entry + ' exceeds the 500-line module limit');
  if (lines > largest.lines) largest = { entry, lines };
  new vm.Script('(async () => {\n"use strict";\n' + source + '\n})()', { filename: entry });
  modules++;
}
for (const [name, expected] of Object.entries(buildArtifacts())) {
  assert.equal(fs.readFileSync(path.join(root, 'dist', name), 'utf8'), expected, 'Build drift: ' + name);
}
console.log(`${modules} source modules checked; largest ${largest.entry}: ${largest.lines} lines. Build is deterministic.`);
