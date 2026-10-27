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
import { splitScript } from '#source/setup/script-format';
import { scriptFixture } from './helpers/script-format';
import { createEnvironment, required, texts } from './helpers/scriptable';

const installed = scriptFixture('const layout = `row\ncolumn\ntext(My layout)`; const custom = {};', 'const oldEngine = 1;', '// Variables used by Scriptable.\n// icon-color: red; icon-glyph: cloud;\n');
const fresh = scriptFixture('const layout = `reset`; const custom = {};', 'const newEngine = 2;');
const buildInfo = { commit: 'a1b2c3d', time: '2026-10-27T04:05:06.789Z', uploadTime: '2026-10-27T04:06:07.890Z' };

test.each([
  { zone: 'Asia/Shanghai', time: '2026-10-27T04:05:06.789Z', expected: '2026-10-27T12:05:06.789+08:00' },
  { zone: 'Asia/Kathmandu', time: '2026-10-27T04:05:06.789Z', expected: '2026-10-27T09:50:06.789+05:45' },
  { zone: 'America/New_York', time: '2026-01-27T04:05:06.789Z', expected: '2026-01-26T23:05:06.789-05:00' },
  { zone: 'America/New_York', time: '2026-07-27T04:05:06.789Z', expected: '2026-07-27T00:05:06.789-04:00' },
  { zone: 'UTC', time: '2026-10-27T04:05:06.789Z', expected: '2026-10-27T04:05:06.789+00:00' },
])('build and upload times use device timezone $zone at $time', async ({ zone, time, expected }) => {
  const { stdout } = await promisify(execFile)(process.execPath, ['--input-type=module', '-e', `
    import { prepareUpload } from './scripts/upload-icloud.mjs';
    const source = prepareUpload(null, JSON.parse(process.argv[1]), { commit: 'a1b2c3d', time: process.argv[2], uploadTime: process.argv[2] });
    console.log(source.split('\\n').slice(1, 3).join('\\n'));
  `, JSON.stringify(fresh), time], {
    cwd: new URL('..', import.meta.url), env: { ...process.env, TZ: zone },
  });
  assert.equal(stdout.trim(), `// Build time: ${expected}\n// Upload time: ${expected}`);
});

test('upload preparation retains installed customizations while replacing the engine', () => {
  const result = prepareUpload(installed, fresh, buildInfo);
  assert(result.includes('text(My layout)'));
  assert(result.includes('icon-color: red; icon-glyph: cloud;'));
  assert(result.includes('const newEngine = 2;'));
  assert(!result.includes('oldEngine'));
  assert(!result.includes('`reset`'));
});

test('upload preparation refuses invalid installed source, downloads and incompatible bindings', () => {
  for (const invalid of ['<html>error</html>', '// Variables used by Scriptable.\nconst code = importModule("legacy");']) {
    assert.throws(() => prepareUpload(invalid, fresh, buildInfo));
    assert.throws(() => prepareUpload(installed, invalid, buildInfo));
  }
  assert.throws(() => prepareUpload(installed, scriptFixture(undefined, 'const layout = 42;'), buildInfo));
});

test('repeated uploads replace build information and preserve installed customizations', () => {
  const first = prepareUpload(installed, fresh, buildInfo);
  const next = prepareUpload(first, fresh, { commit: 'b2c3d4e', time: '2026-10-27T05:06:07.890Z', uploadTime: '2026-10-27T05:07:08.901Z' });
  assert.equal(next.split('\n')[0], '// Commit: b2c3d4e');
  assert.equal(Date.parse(required(next.split('\n')[1]).replace('// Build time: ', '')), Date.parse('2026-10-27T05:06:07.890Z'));
  assert.equal(Date.parse(required(next.split('\n')[2]).replace('// Upload time: ', '')), Date.parse('2026-10-27T05:07:08.901Z'));
  assert.equal(next.match(/^\/\/ Commit:/gm)?.length, 1);
  assert.equal(next.match(/^\/\/ Build time:/gm)?.length, 1);
  assert.equal(next.match(/^\/\/ Upload time:/gm)?.length, 1);
  assert.equal(splitScript(next).user, splitScript(installed).user);
  assert.equal(splitScript(next).engine, splitScript(fresh).engine);
  assert(next.includes('icon-color: red; icon-glyph: cloud;'));
});

test('uploads upgrade two-line build headers while preserving installed customizations', () => {
  const previous = '// Commit: abc1234\n// Build time: 2026-10-27T11:00:00.000+08:00\n' + installed;
  const next = prepareUpload(previous, fresh, buildInfo);
  assert.equal(next.split('\n')[0], '// Commit: a1b2c3d');
  assert.equal(Date.parse(required(next.split('\n')[2]).replace('// Upload time: ', '')), Date.parse(buildInfo.uploadTime));
  assert.equal(next.match(/^\/\/ Build time:/gm)?.length, 1);
  assert.equal(splitScript(next).user, splitScript(installed).user);
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
  await fs.writeFile(candidate, prepareUpload(installed, fresh, buildInfo));
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
  assert.equal(await fs.readFile(f.target, 'utf8'), prepareUpload(installed, fresh, buildInfo));
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
  const current = scriptFixture('const layout = `column(padding: [10,15,10,15])[identity]`; const custom = { items: { identity: { async prepare() { return { state: "ready", effects: {}, variants: [{ id: "normal", minWidth: 100, preferredWidth: 150, adaptationCost: 0, measure() { return { requiredHeight: 20, preferredHeight: 20, confidence: "estimated" }; } }], render(stack) { stack.addText(Script.name()); } }; } } } };');
  const merged = prepareUpload(current, artifacts['one.js'], buildInfo);
  for (const dark of [false, true]) {
    const env = createEnvironment({ iCloud: true, name: 'WeatherCal-Test', dark });
    env.cloud.writeString('/library/weather-cal-preferences-WeatherCal-Test', '{"widget":{"padding":0,"instantDark":false,"largeViewport":"320 x 340"}}');
    env.cloud.writeString('/library/weather-cal-WeatherCal-Test', '{"type":"image","dark":true}');
    env.cloud.writeString('/library/weather-cal-api-key', 'stored-key');
    env.cloud.writeImage('/documents/Weather Cal/WeatherCal-Test.jpg', { pixels: 'light' });
    env.cloud.writeImage('/documents/Weather Cal/WeatherCal-Test (Dark).jpg', { pixels: 'dark' });
    env.secrets.set('weather-cal-qweather-host:WeatherCal-Test', 'stored-host');
    const before = new Map(env.cloud.store);
    await vm.runInNewContext('(async () => {\n' + merged + '\n})()', {
      ...env.globals, config: {...env.globals.config, widgetFamily: 'large'}, Date, module: { filename: '/documents/WeatherCal-Test.js' }
    });
    const widget = required(env.globals.Script.widget);
    assert.deepEqual(texts(widget), ['WeatherCal-Test']);
    assert.deepEqual(widget.padding, [0, 0, 0, 0]);
    assert.deepEqual(widget.children[0]?.size, new env.globals.Size(320, 340));
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

test('first upload uses the complete validated fresh bundle', () => {
  const result = prepareUpload(null, fresh, buildInfo);
  assert.equal(result.split('\n')[0], '// Commit: a1b2c3d');
  assert.equal(Date.parse(required(result.split('\n')[1]).replace('// Build time: ', '')), Date.parse(buildInfo.time));
  assert.equal(Date.parse(required(result.split('\n')[2]).replace('// Upload time: ', '')), Date.parse(buildInfo.uploadTime));
  assert.equal(result.split('\n').slice(3).join('\n'), fresh);
  assert.deepEqual(splitScript(result).engine, splitScript(fresh).engine);
  assert.throws(() => prepareUpload(null, '<html>build failed</html>', buildInfo));
});

macTest('missing script inspection allows creation without changing neighboring data', async t => {
  const f = await fixture(t);
  await fs.rm(f.target);
  const before = await fs.readdir(f.directory);
  const state = await runNative(['inspect', f.target]);
  assert.equal(state.exists, false);
  assert.equal(state.source, null);
  assert.deepEqual(await fs.readdir(f.directory), before);
  const result = await runNative(['create', f.target, f.candidate]);
  assert.equal(result.status, 'created');
  assert.equal(await fs.readFile(f.target, 'utf8'), await fs.readFile(f.candidate, 'utf8'));
  assert.equal((await fs.stat(f.target)).mode & 0o777, 0o600);
  assert.equal(await fs.readFile(f.expected, 'utf8'), installed);
  await assert.rejects(fs.stat(f.backup), { code: 'ENOENT' });
  assert.equal((await runNative(['inspect', f.target])).exists, true);
});

macTest('creation refuses a file that appeared after inspection, including dangling symlinks', async t => {
  const f = await fixture(t);
  await assert.rejects(runNative(['create', f.target, f.candidate]));
  assert.equal(await fs.readFile(f.target, 'utf8'), installed);
  await fs.rm(f.target);
  await fs.symlink(path.join(f.directory, 'missing'), f.target);
  await assert.rejects(runNative(['inspect', f.target]), /regular|symbolic/i);
  await assert.rejects(runNative(['create', f.target, f.candidate]));
  assert.equal((await fs.lstat(f.target)).isSymbolicLink(), true);
  await assert.rejects(fs.stat(path.join(f.directory, 'missing')), { code: 'ENOENT' });
});

macTest('missing parent directory is not mistaken for a new Scriptable installation', async t => {
  const f = await fixture(t);
  const absent = path.join(f.directory, 'missing', 'WeatherCal-Test.js');
  await assert.rejects(runNative(['inspect', absent]));
  await assert.rejects(runNative(['create', absent, f.candidate]));
  await assert.rejects(fs.stat(path.dirname(absent)), { code: 'ENOENT' });
});

macTest('failed creation removes its partial file so a later upload can retry', async t => {
  const f = await fixture(t);
  const exec = promisify(execFile);
  const binary = path.join(f.directory, 'native-writer');
  await exec('/usr/bin/swiftc', ['-module-cache-path', 'node_modules/.cache/weathercal-swift', 'scripts/icloud-file.swift', '-o', binary]);
  await fs.rm(f.target);
  await fs.writeFile(f.candidate, 'x'.repeat(8192));
  await assert.rejects(exec('/bin/bash', ['-c', 'trap "" XFSZ; ulimit -f 1; exec "$@"', 'bash',
    binary, 'create', f.target, f.candidate]), (error: unknown) => {
    assert(error instanceof Error && 'code' in error);
    assert.equal(error.code, 1); // Native helper handled the error instead of dying from SIGXFSZ.
    return true;
  });
  await assert.rejects(fs.stat(f.target), { code: 'ENOENT' });
  await fs.writeFile(f.candidate, fresh);
  assert.equal((await runNative(['create', f.target, f.candidate])).status, 'created');
});
