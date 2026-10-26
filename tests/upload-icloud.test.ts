import { test } from 'vitest';
import type { TestContext } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { prepareUpload, runNative } from '../scripts/upload-icloud.mjs';
import { buildArtifacts } from '../scripts/build.mjs';
import { scriptFixture } from './helpers/script-format';
import { createEnvironment, required, texts } from './helpers/scriptable';

const installed = scriptFixture('const layout = `row\ncolumn\ntext(My layout)`; const custom = {};', 'const oldEngine = 1;', '// Variables used by Scriptable.\n// icon-color: red; icon-glyph: cloud;\n');
const fresh = scriptFixture('const layout = `reset`; const custom = {};', 'const newEngine = 2;');

test('upload preparation retains installed customizations while replacing the engine', () => {
  const result = prepareUpload(installed, fresh);
  assert(result.includes('text(My layout)'));
  assert(result.includes('icon-color: red; icon-glyph: cloud;'));
  assert(result.includes('const newEngine = 2;'));
  assert(!result.includes('oldEngine'));
  assert(!result.includes('`reset`'));
});

test('upload preparation refuses invalid installed source, downloads and incompatible bindings', () => {
  for (const invalid of ['<html>error</html>', '// Variables used by Scriptable.\nconst code = importModule("legacy");']) {
    assert.throws(() => prepareUpload(invalid, fresh));
    assert.throws(() => prepareUpload(installed, invalid));
  }
  assert.throws(() => prepareUpload(installed, scriptFixture(undefined, 'const layout = 42;')));
});

async function fixture(t: TestContext) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'weathercal-upload-test-'));
  t.onTestFinished(() => fs.rm(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'WeatherCal-Test.js');
  const expected = path.join(directory, 'expected');
  const candidate = path.join(directory, 'candidate');
  const backup = path.join(directory, 'backup');
  await fs.writeFile(target, installed, { mode: 0o600 });
  await fs.writeFile(expected, installed);
  await fs.writeFile(candidate, prepareUpload(installed, fresh));
  return { directory, target, expected, candidate, backup };
}

const macTest = process.platform === 'darwin' ? test : test.skip;
macTest('native update preserves the existing file identity, backups and neighboring data', async t => {
  const f = await fixture(t);
  const neighbor = path.join(f.directory, 'weather-cal-preferences-WeatherCal-Test');
  await fs.writeFile(neighbor, 'saved preferences');
  const before = await fs.stat(f.target);
  const result = await runNative(['update', f.target, f.expected, f.candidate, f.backup]);
  assert.equal(result.status, 'updated');
  assert.equal(await fs.readFile(f.backup, 'utf8'), installed);
  assert.equal((await fs.stat(f.backup)).mode & 0o777, 0o600);
  assert.equal(await fs.readFile(f.target, 'utf8'), prepareUpload(installed, fresh));
  assert.equal((await fs.stat(f.target)).ino, before.ino);
  assert.equal((await fs.stat(f.target)).mode, before.mode);
  assert.equal(await fs.readFile(neighbor, 'utf8'), 'saved preferences');
});

macTest('native update refuses an iPhone edit made after preparation', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.target, 'newer iPhone edit');
  await assert.rejects(runNative(['update', f.target, f.expected, f.candidate, f.backup]), /changed/i);
  assert.equal(await fs.readFile(f.target, 'utf8'), 'newer iPhone edit');
  await assert.rejects(fs.stat(f.backup), { code: 'ENOENT' });
});

macTest('native update refuses missing targets, symlinks and failed backups before writing', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.backup, 'previous backup');
  await assert.rejects(runNative(['update', f.target, f.expected, f.candidate, f.backup]));
  assert.equal(await fs.readFile(f.target, 'utf8'), installed);
  assert.equal(await fs.readFile(f.backup, 'utf8'), 'previous backup');
  await fs.rm(f.target);
  await assert.rejects(runNative(['update', f.target, f.expected, f.candidate, f.backup]));
  await assert.rejects(fs.stat(f.target), { code: 'ENOENT' });
  await fs.symlink(f.expected, f.target);
  await assert.rejects(runNative(['inspect', f.target]), /regular|symbolic/i);
  await assert.rejects(runNative(['update', f.target, f.expected, f.candidate, f.backup]), /regular|symbolic/i);
  assert.equal(await fs.readFile(f.expected, 'utf8'), installed);
});

macTest('native inspect and probe leave the installed script and directory contents intact', async t => {
  const f = await fixture(t);
  const before = await fs.readdir(f.directory);
  const result = await runNative(['inspect', f.target]);
  assert.equal(result.source, installed);
  assert.equal(result.ubiquitous, false);
  assert.equal((await runNative(['probe', f.directory])).status, 'probe-passed');
  assert.deepEqual(await fs.readdir(f.directory), before);
  assert.equal(await fs.readFile(f.target, 'utf8'), installed);
});

test('merged widget retains its identity, preferences, image backgrounds and credentials', async () => {
  const artifacts = await buildArtifacts();
  const current = scriptFixture('const layout = `row\ncolumn\nidentity`; const custom = { identity(column) { column.addText(Script.name()); } };');
  const merged = prepareUpload(current, artifacts['one.js']);
  for (const dark of [false, true]) {
    const env = createEnvironment({ iCloud: true, name: 'WeatherCal-Test', dark });
    env.cloud.writeString('/library/weather-cal-preferences-WeatherCal-Test', '{"widget":{"padding":0,"instantDark":false}}');
    env.cloud.writeString('/library/weather-cal-WeatherCal-Test', '{"type":"image","dark":true}');
    env.cloud.writeString('/library/weather-cal-api-key', 'stored-key');
    env.cloud.writeImage('/documents/Weather Cal/WeatherCal-Test.jpg', { pixels: 'light' });
    env.cloud.writeImage('/documents/Weather Cal/WeatherCal-Test (Dark).jpg', { pixels: 'dark' });
    env.secrets.set('weather-cal-qweather-host:WeatherCal-Test', 'stored-host');
    const before = new Map(env.cloud.store);
    await vm.runInNewContext('(async () => {\n' + merged + '\n})()', {
      ...env.globals, Date, module: { filename: '/documents/WeatherCal-Test.js' }
    });
    const widget = required(env.globals.Script.widget);
    assert.deepEqual(texts(widget), ['WeatherCal-Test']);
    assert.deepEqual(widget.padding, [10, 15, 10, 15]);
    assert.deepEqual(widget.backgroundImage, { pixels: dark ? 'dark' : 'light' });
    assert.deepEqual(env.cloud.store, before);
    assert.equal(env.secrets.get('weather-cal-qweather-host:WeatherCal-Test'), 'stored-host');
    assert.equal(env.local.store.size, 0);
    assert.equal(env.globals.Script.completionCount, 1);
  }
});

macTest('native update avoids rewriting an already current file', async t => {
  const f = await fixture(t);
  await fs.writeFile(f.candidate, installed);
  const before = await fs.stat(f.target);
  assert.equal((await runNative(['update', f.target, f.expected, f.candidate, f.backup])).status, 'unchanged');
  assert.equal((await fs.stat(f.target)).mtimeMs, before.mtimeMs);
  await assert.rejects(fs.stat(f.backup), { code: 'ENOENT' });
});

macTest('native writer restores the original bytes when an actual write exceeds the file size limit', async t => {
  const f = await fixture(t);
  const exec = promisify(execFile);
  const binary = path.join(f.directory, 'native-writer');
  await exec('/usr/bin/swiftc', ['-module-cache-path', 'node_modules/.cache/weathercal-swift', 'scripts/icloud-file.swift', '-o', binary]);
  await fs.writeFile(f.candidate, 'x'.repeat(8192));
  await assert.rejects(exec('/bin/bash', ['-c', 'trap "" XFSZ; ulimit -f 1; exec "$@"', 'bash',
    binary, 'update', f.target, f.expected, f.candidate, f.backup]), /original bytes restored/);
  assert.equal(await fs.readFile(f.target, 'utf8'), installed);
  assert.equal(await fs.readFile(f.backup, 'utf8'), installed);
});
