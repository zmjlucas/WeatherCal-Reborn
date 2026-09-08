const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { installScriptable, createEnvironment } = require('./helpers/scriptable');
const prompts = require('../src/core/prompts');
const storage = require('../src/core/storage');

function engineFor(t, options = {}) {
  const env = installScriptable(t, options);
  let methods = {};
  for (const name of ['menu', 'distribution']) {
    Object.assign(methods, require('../src/setup/' + name));
  }
  const engine = Object.assign({ fm: options.iCloud ? env.cloud : env.local, name: 'Test Widget',
    bgPath: '/library/weather-cal-Test Widget', prefPath: '/library/weather-cal-preferences-Test Widget',
    widgetUrl: 'https://example.test/weather-cal.js', previewValue: () => 'large',
    getSettings: async () => ({ localization: { greeting: "It's `fine` ${globalThis.injected = true} \\\nnext" } })
  }, prompts, storage, methods);
  return { engine, env };
}

const launcher = '// Variables used by Scriptable.\nconst layout = `row\n column\n text(It\'s \\`fine\\`)`;\nconst custom = { hello: () => "${literal}" };\n';

test('update validates Scriptable content and preserves installed code on failure', async t => {
  let response = '<html>unavailable</html>';
  const { engine, env } = engineFor(t, { request: async () => response });
  env.local.writeString('/documents/engine.js', 'old code');
  assert.equal(await engine.downloadCode('engine', 'https://example.test/code'), false);
  assert.equal(env.local.readString('/documents/engine.js'), 'old code');
  response = launcher;
  assert.equal(await engine.downloadCode('engine', 'https://example.test/code'), true);
  assert.equal(env.local.readString('/documents/engine.js'), launcher);
});

test('cancelled update performs no download', async t => {
  const { engine, env } = engineFor(t, { responses: [3, 1] });
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.requests.length, 0);
});

test('widget export restores exact source, punctuation and preferences without evaluating embedded content', async t => {
  const { engine, env } = engineFor(t, { iCloud: true, responses: [4, 0] });
  env.cloud.writeString('/documents/Test Widget.js', launcher);
  const background = { type: 'gradient', initialColor: '123456', finalColor: 'abcdef' };
  env.cloud.writeString(engine.bgPath, JSON.stringify(background));
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.exports.length, 1);
  assert(env.downloads.includes('/documents/Test Widget.js'));
  assert(env.downloads.includes(engine.bgPath));
  const destination = createEnvironment({ name: 'Imported Widget', responses: [0, 0] });
  const context = vm.createContext({ ...destination.globals, module: { filename: '/documents/Imported Widget.js' } });
  await vm.runInContext('(async () => {' + env.exports[0].value + '\n})()', context);
  assert.equal(destination.local.readString('/documents/Imported Widget.js'), launcher);
  assert.deepEqual(JSON.parse(destination.local.readString('/library/weather-cal-preferences-Imported Widget')), await engine.getSettings());
  assert.deepEqual(JSON.parse(destination.local.readString('/library/weather-cal-Imported Widget')), background);
  assert.equal(context.injected, undefined);
});

test('reset deletes only the selected widget after replacement download succeeds', async t => {
  const { engine, env } = engineFor(t, { responses: [5, 1, 0], request: async () => launcher });
  const owned = [engine.bgPath, engine.prefPath, '/documents/Weather Cal/Test Widget.jpg', '/documents/Weather Cal/Test Widget (Dark).jpg'];
  const other = ['/library/weather-cal-Other', '/library/weather-cal-preferences-Other', '/library/weather-cal-api-key', '/library/weather-cal-setup', '/documents/Weather Cal/Other.jpg'];
  for (const path of [...owned, ...other]) env.local.writeString(path, 'keep');
  await engine.editSettings('engine', 'https://example.test/code');
  for (const path of owned) assert.equal(env.local.fileExists(path), false, path);
  for (const path of other) assert.equal(env.local.readString(path), 'keep', path);
  assert.equal(env.local.readString('/documents/Test Widget.js'), launcher);
});

test('failed and cancelled reset preserve the widget', async t => {
  const { engine, env } = engineFor(t, { responses: [5, 1, 1, 5, 1, 0] });
  env.local.writeString(engine.bgPath, 'existing background');
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.requests.length, 0);
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.local.readString(engine.bgPath), 'existing background');
});

test('image exports embed both appearances and import them under the new widget name', async t => {
  const { engine, env } = engineFor(t, { iCloud: true });
  const originalData = globalThis.Data;
  globalThis.Data = { fromPNG: value => ({ toBase64String: () => Buffer.from(JSON.stringify(value)).toString('base64') }) };
  t.after(() => { if (originalData === undefined) delete globalThis.Data; else globalThis.Data = originalData; });
  env.cloud.writeString('/documents/Test Widget.js', launcher);
  env.cloud.writeString(engine.bgPath, JSON.stringify({ type: 'image', dark: true }));
  env.cloud.writeImage('/documents/Weather Cal/Test Widget.jpg', { pixels: 'light' });
  env.cloud.writeImage('/documents/Weather Cal/Test Widget (Dark).jpg', { pixels: 'dark' });
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ iCloud: true, name: 'Vacation' });
  const globals = { ...destination.globals,
    Data: { fromBase64String: value => JSON.parse(Buffer.from(value, 'base64').toString()) },
    Image: { fromData: value => value }, module: { filename: '/documents/Vacation.js' }
  };
  await vm.runInNewContext('(async () => {' + exported + '\n})()', globals);
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Vacation.jpg'), { pixels: 'light' });
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Vacation (Dark).jpg'), { pixels: 'dark' });
  assert(env.downloads.includes('/documents/Weather Cal/Test Widget (Dark).jpg'));
});

test('cancelled import writes no files', async t => {
  const { engine, env } = engineFor(t);
  env.local.writeString('/documents/Test Widget.js', launcher);
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ responses: [1] });
  await vm.runInNewContext('(async () => {' + exported + '\n})()', { ...destination.globals, module: { filename: '/documents/Import.js' } });
  assert.equal(destination.local.store.size, 0);
});

test('export menu supports Quick Look and reports unavailable source without exporting partial data', async t => {
  const { engine, env } = engineFor(t, { responses: [4, 1, 4] });
  env.local.writeString('/documents/Test Widget.js', launcher);
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(typeof env.exports[0], 'string');
  env.local.remove('/documents/Test Widget.js');
  await engine.editSettings('engine', 'https://example.test/code');
  assert.equal(env.exports.length, 1);
  assert.match(env.alerts.at(-1).title, /export failed/i);
});
