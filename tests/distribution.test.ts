import { test } from 'vitest';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { installScriptable, createEnvironment, required } from './helpers/scriptable';
import { initializedContext } from './helpers/context';
import { scriptFixture } from './helpers/script-format';
import { splitScript } from '#source/setup/script-format';
import type { EnvironmentOptions } from './helpers/scriptable';
import type { TestContext } from 'vitest';

async function engineFor(t: TestContext, options: EnvironmentOptions = {}) {
  const env = installScriptable(t, options);
  const engine = await initializedContext(env);
  if (options.iCloud) engine.fm = env.cloud;
  engine.widgetUrl = 'https://example.test/one.js';
  const settings = await engine.getSettings();
  settings.localization.morningGreeting = "It's `fine` ${globalThis.injected = true} \\\nnext";
  engine.fm.writeString(engine.prefPath, JSON.stringify(settings));
  return { engine, env };
}

const launcher = scriptFixture('const layout = `row\n column\n text(Original)`;\nconst custom = { hello: () => "${literal}" };');

test('update validates Scriptable content and preserves installed code on failure', async t => {
  let response = '<html>unavailable</html>';
  const { engine, env } = await engineFor(t, { request: async () => response });
  env.local.writeString('/documents/Test Widget.js', launcher);
  assert.equal(await engine.downloadCode(engine.name, 'https://example.test/code'), false);
  assert.equal(env.local.readString('/documents/Test Widget.js'), launcher);
  response = scriptFixture('const layout = `replacement`; const custom = {};', 'const version = 2;');
  assert.equal(await engine.downloadCode(engine.name, 'https://example.test/code'), true);
  assert.equal(splitScript(env.local.readString('/documents/Test Widget.js')).user, splitScript(launcher).user);
  assert.equal(splitScript(env.local.readString('/documents/Test Widget.js')).engine, splitScript(response).engine);
});

test('cancelled update performs no download', async t => {
  const { engine, env } = await engineFor(t, { responses: [3, 1] });
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.requests.length, 0);
});

test('widget export restores exact source, punctuation and preferences without evaluating embedded content', async t => {
  const { engine, env } = await engineFor(t, { iCloud: true, responses: [4, 0] });
  env.cloud.writeString('/documents/Test Widget.js', launcher);
  const background = { type: 'gradient', initialColor: '123456', finalColor: 'abcdef' };
  env.cloud.writeString(engine.bgPath, JSON.stringify(background));
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.exports.length, 1);
  assert(env.downloads.includes('/documents/Test Widget.js'));
  assert(env.downloads.includes(engine.bgPath));
  const destination = createEnvironment({ name: 'Imported Widget', responses: [0, 0] });
  const context = vm.createContext({ ...destination.globals, module: { filename: '/documents/Imported Widget.js' } });
  const exported = required(env.exports[0]);
  assert(typeof exported === 'object');
  await vm.runInContext('(async () => {' + exported.value + '\n})()', context);
  assert.equal(destination.local.readString('/documents/Imported Widget.js'), launcher);
  assert.deepEqual(JSON.parse(destination.local.readString('/library/weather-cal-preferences-Imported Widget')), await engine.getSettings());
  assert.deepEqual(JSON.parse(destination.local.readString('/library/weather-cal-Imported Widget')), background);
  assert.equal(context.injected, undefined);
});

test('reset deletes only the selected widget after replacement download succeeds', async t => {
  const { engine, env } = await engineFor(t, { responses: [5, 1, 0], request: async () => launcher });
  const owned = [engine.bgPath, engine.prefPath, '/documents/Weather Cal/Test Widget.jpg', '/documents/Weather Cal/Test Widget (Dark).jpg'];
  const other = ['/library/weather-cal-Other', '/library/weather-cal-preferences-Other', '/library/weather-cal-api-key', '/library/weather-cal-setup', '/documents/Weather Cal/Other.jpg'];
  for (const path of [...owned, ...other]) env.local.writeString(path, 'keep');
  await engine.editSettings('engine', 'https://example.test/code');
  for (const path of owned) assert.equal(env.local.fileExists(path), false, path);
  for (const path of other) assert.equal(env.local.readString(path), 'keep', path);
  assert.equal(env.local.readString('/documents/Test Widget.js'), launcher);
});

test('failed and cancelled reset preserve the widget', async t => {
  const { engine, env } = await engineFor(t, { responses: [5, 1, 1, 5, 1, 0] });
  env.local.writeString(engine.bgPath, 'existing background');
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.requests.length, 0);
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.local.readString(engine.bgPath), 'existing background');
});

test('image exports embed both appearances and import them under the new widget name', async t => {
  const { engine, env } = await engineFor(t, { iCloud: true });
  env.cloud.writeString('/documents/Test Widget.js', launcher);
  env.cloud.writeString(engine.bgPath, JSON.stringify({ type: 'image', dark: true }));
  env.cloud.writeImage('/documents/Weather Cal/Test Widget.jpg', { pixels: 'light' });
  env.cloud.writeImage('/documents/Weather Cal/Test Widget (Dark).jpg', { pixels: 'dark' });
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ iCloud: true, name: 'Vacation' });
  const globals = { ...destination.globals,
    Data: destination.globals.Data,
    Image: destination.globals.Image, module: { filename: '/documents/Vacation.js' }
  };
  await vm.runInNewContext('(async () => {' + exported + '\n})()', globals);
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Vacation.jpg'), { pixels: 'light' });
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Vacation (Dark).jpg'), { pixels: 'dark' });
  assert(env.downloads.includes('/documents/Weather Cal/Test Widget (Dark).jpg'));
});

test('cancelled import writes no files', async t => {
  const { engine, env } = await engineFor(t);
  env.local.writeString('/documents/Test Widget.js', launcher);
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ responses: [1] });
  await vm.runInNewContext('(async () => {' + exported + '\n})()', { ...destination.globals, module: { filename: '/documents/Import.js' } });
  assert.equal(destination.local.store.size, 0);
});

test('export menu supports Quick Look and reports unavailable source without exporting partial data', async t => {
  const { engine, env } = await engineFor(t, { responses: [4, 1, 4] });
  env.local.writeString('/documents/Test Widget.js', launcher);
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(typeof env.exports[0], 'string');
  env.local.remove('/documents/Test Widget.js');
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.exports.length, 1);
  assert.match(required(env.alerts.at(-1)).title, /export failed/i);
});

test('updates cannot write another widget and failed source validation preserves every owned file', async t => {
  let response = scriptFixture(undefined, 'const invalid = ;');
  const { engine, env } = await engineFor(t, { request: async () => response });
  env.local.writeString('/documents/Test Widget.js', launcher);
  env.local.writeString('/documents/Other Widget.js', 'other script');
  env.local.writeString(engine.bgPath, '{"type":"color","color":"123456"}');
  const before = new Map([...env.local.store].map(([path, value]) => [path, { ...value }]));
  assert.equal(await engine.downloadCode('Other Widget', engine.widgetUrl), false);
  assert.equal(env.requests.length, 0);
  assert.equal(await engine.downloadCode(engine.name, engine.widgetUrl), false);
  assert.deepEqual(env.local.store, before);
  response = '<html>Unavailable</html>';
  assert.equal(await engine.downloadCode(engine.name, engine.widgetUrl, true), false);
  assert.deepEqual(env.local.store, before);
});

test('legacy dual-file update preserves the installation and its preferences', async t => {
  const { engine, env } = await engineFor(t, { request: async () => launcher });
  const source = '// Variables used by Scriptable.\nconst code = importModule("weather-cal-code");';
  env.local.writeString('/documents/Test Widget.js', source);
  const preferences = env.local.readString(engine.prefPath);
  assert.equal(await engine.downloadCode(engine.name, engine.widgetUrl), false);
  assert.equal(env.local.readString('/documents/Test Widget.js'), source);
  assert.equal(env.local.readString(engine.prefPath), preferences);
});
