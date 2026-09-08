const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable } = require('./helpers/scriptable');
const prompts = require('../src/core/prompts');
const storage = require('../src/core/storage');
const preferences = require('../src/preferences/store');

function setup(t, options = {}) {
  const env = installScriptable(t, options);
  let methods = {};
  for (const name of ['menu', 'onboarding', 'backgrounds', 'distribution']) {
    Object.assign(methods, require('../src/setup/' + name));
  }
  const engine = Object.assign({ name: 'Test Widget', fm: options.iCloud ? env.cloud : env.local,
    bgPath: '/library/weather-cal-Test Widget', prefPath: '/library/weather-cal-preferences-Test Widget',
    widgetUrl: 'https://example.test/weather-cal.js', initialized: true, data: {}, setupLocation: async () => true
  }, require('../src/widget'), prompts, storage, preferences, methods);
  return { env, engine };
}

test('first run completes permission checks, supports no-weather setup and persists a background', async t => {
  const { env, engine } = setup(t, { responses: [0, 0, 0, 2, 0, { fields: ['123456', 'abcdef'] }, 0] });
  assert.equal(await engine.runSetup(engine.name, false, 'engine', 'https://example.test/code'), 'large');
  assert.equal(env.local.readString('/library/weather-cal-setup'), 'true');
  assert.deepEqual(JSON.parse(env.local.readString(engine.bgPath)), { type: 'color', color: '123456', dark: 'abcdef' });
  assert.equal(env.requests.length, 0);
});

test('permission failures can exit onboarding without marking setup complete', async t => {
  const { env, engine } = setup(t, { responses: [0, 0, 1] });
  engine.setupLocation = async () => { throw new Error('Denied'); };
  globalThis.CalendarEvent.today = async () => { throw new Error('Denied'); };
  assert.equal(await engine.initialSetup(), undefined);
  assert.equal(env.local.fileExists('/library/weather-cal-setup'), false);
  assert.match(env.alerts[2].title, /location and calendar/);
});

test('API keys are trimmed and persisted only when a nonempty value is entered', async t => {
  const { env, engine } = setup(t, { responses: [{ fields: ['   '] }, 0, { fields: [' abc123 '] }, 0] });
  assert.equal(await engine.getWeatherKey(), false);
  assert.equal(env.local.fileExists('/library/weather-cal-api-key'), false);
  engine.getWeatherApiPath = async key => { assert.equal(key, 'abc123'); return { current: {} }; };
  assert.equal(await engine.getWeatherKey(true), true);
  assert.equal(env.local.readString('/library/weather-cal-api-key'), 'abc123');
});

test('an unactivated API key can finish onboarding without leaking it into alerts', async t => {
  const { env, engine } = setup(t, { responses: [{ fields: ['secret-key'] }, 0] });
  engine.getWeatherApiPath = async () => { throw new Error('Offline'); };
  assert.equal(await engine.getWeatherKey(true), true);
  assert.equal(env.local.readString('/library/weather-cal-api-key'), 'secret-key');
  assert.equal(env.alerts.some(alert => (alert.title + alert.message).includes('secret-key')), false);
});

test('photo backgrounds persist both appearances and cancelled selection leaves configuration intact', async t => {
  const { env, engine } = setup(t, { iCloud: true, responses: [3, 0, -1] });
  env.cloud.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  await engine.setWidgetBackground();
  assert.equal(env.cloud.fileExists('/documents/Weather Cal/Test Widget.jpg'), true);
  assert.equal(env.cloud.fileExists('/documents/Weather Cal/Test Widget (Dark).jpg'), true);
  const saved = env.cloud.readString(engine.bgPath);
  await engine.setWidgetBackground();
  assert.equal(env.cloud.readString(engine.bgPath), saved);
  assert(env.downloads.includes(engine.bgPath));
});

test('existing widget setup routes to preview and background setup', async t => {
  const { env, engine } = setup(t, { responses: [0, 1] });
  env.local.writeString('/library/weather-cal-setup', 'true');
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'auto' }));
  env.local.writeString(engine.prefPath, JSON.stringify({ widget: { preview: 'medium' } }));
  assert.equal(await engine.runSetup(engine.name, false, 'engine', ''), 'medium');
  env.local.remove(engine.bgPath);
  env.responses.push(1);
  assert.equal(await engine.runSetup(engine.name, false, 'engine', ''), 'medium');
  assert.equal(JSON.parse(env.local.readString(engine.bgPath)).type, 'auto');
});


test('preferences and API-key menu actions dispatch without displaying an unintended preview', async t => {
  const { engine } = setup(t, { responses: [2, 5, 0] });
  const visited = [];
  engine.editPreferences = async () => visited.push('preferences');
  engine.getWeatherKey = async () => visited.push('key');
  await engine.editSettings('engine', '');
  await engine.editSettings('engine', '');
  assert.deepEqual(visited, ['preferences', 'key']);
});

test('custom gradients retain separate light and dark colors', async t => {
  const { env, engine } = setup(t, { responses: [2, { fields: ['111111', '222222', '333333', '444444'] }] });
  await engine.setWidgetBackground();
  assert.deepEqual(JSON.parse(env.local.readString(engine.bgPath)), {
    type: 'gradient', initialColor: '111111', finalColor: '222222', initialDark: '333333', finalDark: '444444'
  });
});

test('cancelling the weather choice leaves onboarding incomplete', async t => {
  const { env, engine } = setup(t, { responses: [0, 0, 0, -1] });
  let askedForKey = false;
  engine.getWeatherKey = async () => { askedForKey = true; return true; };
  await engine.initialSetup();
  assert.equal(askedForKey, false);
  assert.equal(env.local.fileExists('/library/weather-cal-setup'), false);
});

test('cancelling a photo picker preserves the previous images and background', async t => {
  const { env, engine } = setup(t, { responses: [3, 0] });
  env.local.writeString(engine.bgPath, JSON.stringify({ type: 'image', dark: true }));
  const light = '/documents/Weather Cal/Test Widget.jpg';
  env.local.writeImage(light, { previous: true });
  let calls = 0;
  globalThis.Photos.fromLibrary = async () => {
    if (++calls === 1) return { replacement: true };
    throw new Error('Selection cancelled');
  };
  assert.equal(await engine.setWidgetBackground(), undefined);
  assert.deepEqual(env.local.readImage(light), { previous: true });
  assert.deepEqual(JSON.parse(env.local.readString(engine.bgPath)), { type: 'image', dark: true });
});

test('setup switches storage for repeated calls using the same widget name', async t => {
  const { env, engine } = setup(t, { responses: [0, 0] });
  Object.assign(engine, require('../src/widget'));
  for (const [files, preview] of [[env.local, 'small'], [env.cloud, 'medium']]) {
    files.writeString('/library/weather-cal-setup', 'true');
    files.writeString(engine.bgPath, JSON.stringify({ type: 'color', color: '123456' }));
    files.writeString(engine.prefPath, JSON.stringify({ widget: { preview } }));
  }
  assert.equal(await engine.runSetup(engine.name, false, 'engine', ''), 'small');
  assert.equal(await engine.runSetup(engine.name, true, 'engine', ''), 'medium');
  assert.equal(engine.fm, env.cloud);
});
