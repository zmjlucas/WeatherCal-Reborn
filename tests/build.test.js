const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createEnvironment, texts } = require('./helpers/scriptable');

test('release artifacts execute as self-contained Scriptable scripts and rebuild identically', async () => {
  const { buildArtifacts } = require('../scripts/build');
  const artifacts = buildArtifacts();
  assert.deepEqual(artifacts, buildArtifacts());
  const env = createEnvironment();
  const context = { ...env.globals, Date, module: { exports: {}, filename: '/documents/weather-cal-code.js' } };
  vm.runInNewContext(artifacts['weather-cal-code.js'], context);
  const widget = await context.module.exports.createWidget('row\ncolumn\ntext(Built)', 'Built', false);
  assert.deepEqual(texts(widget), ['Built']);
  for (const name of ['weather-cal.js', 'weather-cal-converter.js']) {
    assert.doesNotThrow(() => new vm.Script('(async () => {\n' + artifacts[name] + '\n})()'));
  }
});
