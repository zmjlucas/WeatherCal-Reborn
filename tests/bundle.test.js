const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');

test('bundle resolves nested modules, caches shared exports and isolates module scope', () => {
  const { bundle } = require('../scripts/bundle');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weathercal-bundle-'));
  try {
    fs.mkdirSync(path.join(dir, 'nested'));
    fs.writeFileSync(path.join(dir, 'state.js'), 'module.exports = { count: 0 };');
    fs.writeFileSync(path.join(dir, 'nested', 'child.js'), 'const x = require("../state"); x.count++; module.exports = x;');
    fs.writeFileSync(path.join(dir, 'entry.js'), 'const x = require("./state"); require("./nested/child"); module.exports = x;');
    const context = { module: { exports: {} } };
    vm.runInNewContext(bundle(path.join(dir, 'entry.js')), context);
    assert.equal(context.module.exports.count, 1);
    assert.equal(context.x, undefined);
    assert.equal(bundle(path.join(dir, 'entry.js')), bundle(path.join(dir, 'entry.js')));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('bundle rejects Node dependencies that cannot run in Scriptable', () => {
  const { bundle } = require('../scripts/bundle');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'weathercal-bundle-'));
  try {
    const entry = path.join(dir, 'entry.js');
    fs.writeFileSync(entry, 'module.exports = require("node:fs");');
    assert.throws(() => bundle(entry), /local modules/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
