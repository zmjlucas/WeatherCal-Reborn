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

test('updates reject incomplete, repeated and reordered boundaries', () => {
  const valid = scriptFixture();
  for (const invalid of [
    valid.replace('// WeatherCal: user end v1', ''),
    valid + '// WeatherCal: engine end v1\n',
    valid.replace('// WeatherCal: user end v1', '// WeatherCal: engine end v1'),
    valid.replace('// WeatherCal: engine begin v1', '// WeatherCal: user begin v1'),
  ]) assert.throws(() => mergeScriptUpdate(valid, invalid));
});

test('updates validate JavaScript before replacing generated code', () => {
  assert.throws(() => mergeScriptUpdate(scriptFixture(), scriptFixture(undefined, 'const broken = ;')));
  assert.throws(() => mergeScriptUpdate(scriptFixture(), scriptFixture(undefined, 'importModule("engine");')));
});

test('legacy installations require explicit standalone installation', () => {
  assert.throws(() => mergeScriptUpdate('// Variables used by Scriptable.\nconst code = importModule("weather-cal-code");', scriptFixture()));
});
