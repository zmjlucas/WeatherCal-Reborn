import { test } from 'vitest';
import assert from 'node:assert/strict';
import { mergeScriptUpdate, splitScript } from '#source/setup/script-format';

import { scriptFixture } from './helpers/script-format';

test('updates preserve the installed metadata and user code byte for byte', () => {
  const installed = scriptFixture('const layout = `row\ncolumn\ntext(Original)`;\nconst custom = { value: "quotes \' and \\\"" };', 'const engineVersion = 1;', '// Variables used by Scriptable.\n// icon-color: red; icon-glyph: heart;\n');
  const downloaded = scriptFixture('const layout = `replacement`;\nconst custom = {};', 'const engineVersion = 2;');
  const before = splitScript(installed);
  const updated = mergeScriptUpdate(installed, downloaded);
  const after = splitScript(updated);
  assert.equal(after.prefix, before.prefix);
  assert.equal(after.user, before.user);
  assert.equal(after.engine, splitScript(downloaded).engine);
});

test('updates use the incoming build information instead of retaining stale provenance', () => {
  const header = '// Commit: a1b2c3d\n// Build time: 2026-10-27T04:05:06.789Z\n';
  const installed = header + scriptFixture('const layout = `row`; const custom = {};');
  const fresh = scriptFixture(undefined, 'const version = 2;');
  const newHeader = '// Commit: b2c3d4e\n// Build time: 2026-10-27T05:06:07.890Z\n';
  for (const incomingHeader of ['', newHeader]) {
    const result = splitScript(mergeScriptUpdate(installed, incomingHeader + fresh));
    assert.equal(result.prefix, incomingHeader + splitScript(scriptFixture()).prefix);
    assert.equal(result.user, splitScript(installed).user);
    assert.equal(result.engine, splitScript(fresh).engine);
  }
});

test('updates reject incomplete, repeated and reordered boundaries', () => {
  const valid = scriptFixture();
  for (const invalid of [
    valid.replace('// WeatherCal: user end', ''),
    valid + '// WeatherCal: engine end\n',
    valid.replace('// WeatherCal: user end', '// WeatherCal: engine end'),
    valid.replace('// WeatherCal: engine begin', '// WeatherCal: user begin'),
  ]) assert.throws(() => mergeScriptUpdate(valid, invalid));
});

test('updates validate JavaScript before replacing generated code', () => {
  assert.throws(() => mergeScriptUpdate(scriptFixture(), scriptFixture(undefined, 'const broken = ;')));
  assert.throws(() => mergeScriptUpdate(scriptFixture(), scriptFixture(undefined, 'importModule("engine");')));
});

test('legacy installations require explicit standalone installation', () => {
  assert.throws(() => mergeScriptUpdate('// Variables used by Scriptable.\nconst code = importModule("weather-cal-code");', scriptFixture()));
});
