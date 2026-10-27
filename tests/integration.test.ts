import { test } from 'vitest';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { buildArtifacts } from '../scripts/build.mjs';
import { createWeatherCal } from '#source/create';
import { splitScript } from '#source/setup/script-format';
import { createEnvironment, installScriptable, texts, runtime, required, inspect, mockColor } from './helpers/scriptable';
import type { Environment } from './helpers/scriptable';
import { scriptFixture } from './helpers/script-format';

const layout = 'column[date,greeting,events,reminders,current,future,forecast,daily,hourly,sunrise,sunset,text("Hello (world)"),battery,week,symbol("star.fill")]';
// A tall synthetic viewport exercises every item; it is not a device calibration.
const options = {family:'large' as const,viewport:{width:600,height:3000}};
const dimensions = {smallViewport:'300 x 300',mediumViewport:'400 x 300',largeViewport:'600 x 3000'};
const customModule = (expression: string) => `{ async prepare() { const value = ${expression}; return { state: "ready", effects: {}, variants: [{ id: "normal", minWidth: 40, preferredWidth: 180, adaptationCost: 0, measure() { return { requiredHeight: 30, preferredHeight: 30, confidence: "estimated" }; } }], render(stack) { stack.addText(value); } }; } }`;

async function execute(source: string, env: Environment, name = 'Test Widget') {
  const files = env.globals.FileManager.local().isFileStoredIniCloud('/documents/' + name + '.js') ? env.cloud : env.local;
  const preferences = '/library/weather-cal-preferences-' + name;
  if (!files.fileExists(preferences)) files.writeString(preferences, JSON.stringify({widget:dimensions}));
  // VM receives only Scriptable boundary objects and standard ECMAScript built-ins.
  const sandbox = { ...env.globals, config: {...env.globals.config, widgetFamily: env.globals.config.widgetFamily ?? 'large'}, Date, module: { filename: '/documents/' + name + '.js' } };
  const initialKeys = Object.keys(sandbox).sort();
  await vm.runInNewContext('(async () => {\n' + source + '\n})()', sandbox);
  assert.deepEqual(Object.keys(sandbox).sort(), initialKeys);
  assert.equal(env.globals.Script.completionCount, 1);
}

function customizedBundle(source: string, user: string) {
  const sections = splitScript(source);
  return scriptFixture(user, sections.engine, sections.prefix);
}

test('complete widget renders every built-in item offline using production modules', async t => {
  installScriptable(t);
  const code = createWeatherCal();
  const widget = await code.createWidget(layout, 'Full', false, undefined, options);
  const output = texts(widget);
  assert(output.includes('Hello (world)'));
  assert(output.includes('57%'));
  assert(output.includes('Weather unavailable'));
  assert(output.includes('Enjoy the rest of your day.'));
});

test('final standalone widget runs all items and custom code without external modules or leaked globals', async () => {
  const artifacts = await buildArtifacts();
  const env = createEnvironment();
  const source = customizedBundle(required(artifacts['one.js']), `const layout = ${JSON.stringify('column[' + layout + ',customValue]')};\nconst custom = { items: { customValue: ${customModule("'Standalone custom'")} } };`);
  await execute(source, env);
  assert(texts(required(env.globals.Script.widget)).includes('Hello (world)'));
  assert(texts(required(env.globals.Script.widget)).includes('Standalone custom'));
  assert.equal(env.requests.filter(url => url.endsWith('.js')).length, 0);
});

test('final standalone script honors previews and setup cancellation with no engine download', async () => {
  const artifacts = await buildArtifacts();
  for (const preview of ['small', 'medium', 'large', undefined]) {
    const env = createEnvironment({ responses: [preview ? 0 : 6] });
    env.globals.config.runsInApp = true;
    env.globals.config.runsInWidget = false;
    env.local.writeString('/library/weather-cal-setup', 'true');
    env.local.writeString('/library/weather-cal-Test Widget', '{"type":"color","color":"123456"}');
    env.local.writeString('/library/weather-cal-preferences-Test Widget', JSON.stringify({ widget: { ...dimensions, preview: preview ?? 'large' } }));
    await execute(customizedBundle(required(artifacts['one.js']), 'const layout = `text("Preview")`; const custom = {};'), env);
    assert.equal(env.globals.Script.widget?.preview, preview);
    assert.equal(Boolean(env.globals.Script.widget), Boolean(preview));
    if (preview) { assert.deepEqual(texts(required(env.globals.Script.widget)), ['Preview']); assert.equal(env.globals.Script.widget?.children[0]?.size.width, preview === 'small' ? 300 : preview === 'medium' ? 400 : 600); }
    assert.equal(env.requests.filter(url => url.endsWith('.js')).length, 0);
  }
});

test('final standalone script completes once when a custom renderer throws', async () => {
  const artifacts = await buildArtifacts();
  const env = createEnvironment();
  const source = customizedBundle(required(artifacts['one.js']), 'const layout = `failing`; const custom = { items: { failing: {prepare() { throw new Error("Fixture custom failure"); }} } };');
  await execute(source, env);
  assert(texts(required(env.globals.Script.widget)).join(' ').includes('Fixture custom failure'));
});

test('standalone auto viewport uses the actual home family or selected app preview', async () => {
  const artifacts = await buildArtifacts();
  const source = customizedBundle(required(artifacts['one.js']), 'const layout = `auto[text("Detected"),battery]`; const custom = {};');
  for (const inApp of [false,true]) {
    for (const family of ['small','medium','large']) {
      const env = createEnvironment();
      env.globals.config.runsInApp = inApp;
      env.globals.config.runsInWidget = !inApp;
      // Conflicting stored preview must not affect home widgets; stale host family
      // must not affect app previews. Landscape reports use the same profile.
      env.globals.config.widgetFamily = inApp ? 'large' : family;
      env.globals.Device.screenSize = () => ({width:852,height:393});
      env.local.writeString('/library/weather-cal-setup', 'true');
      env.local.writeString('/library/weather-cal-Test Widget', '{"type":"color","color":"123456"}');
      env.local.writeString('/library/weather-cal-preferences-Test Widget', JSON.stringify({widget:{preview:inApp ? family : 'large',mediumViewport:'auto'}}));
      await execute(source, env);
      const widget = required(env.globals.Script.widget);
      assert.equal(widget.preview, inApp ? family : undefined);
      assert(texts(widget).includes('Detected'));
      assert(texts(widget).includes('57%'));
      assert.equal(widget.children[0]?.size.width, family === 'small' ? 158 : 338);
      assert.equal(widget.children[0]?.size.height, family === 'large' ? 354 : 158);
      assert.equal(env.requests.length, 0);
    }
  }
});

test('the widget keeps local items available when calendar and reminder access is denied', async t => {
  installScriptable(t);
  runtime.CalendarEvent.between = async () => { throw Error('Calendar access denied'); };
  runtime.Reminder.allIncomplete = async () => { throw Error('Reminder access denied'); };
  const context = createWeatherCal();
  const widget = await context.createWidget('column[date,events,reminders,battery,text("Local information")]', 'Limited Permissions', false, undefined, options);
  assert(texts(widget).includes('Enjoy the rest of your day.'));
  assert(texts(widget).includes('57%'));
  assert(texts(widget).includes('Local information'));
  assert(texts(widget).some(value => value.includes(context.now.getFullYear().toString())));
});

test('exporting a custom background without persisted appearance preserves the working script', async t => {
  const env = installScriptable(t);
  const engine = createWeatherCal();
  const source = scriptFixture('const layout = `text("Background")`; const custom = { background(widget) { widget.backgroundColor = Color.red(); } };');
  env.local.writeString('/documents/Custom.js', source);
  const widget = await engine.createWidget('text("Background")', 'Custom', false, {
    background(widget) { widget.backgroundColor = mockColor('ff0000'); }
  }, options);
  assert.equal(inspect(widget).backgroundColor.hex, 'ff0000');
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ name: 'Imported Custom' });
  await execute(exported, destination, 'Imported Custom');
  assert.equal(destination.local.readString('/documents/Imported Custom.js'), source);
});

test('final converter completes normal conversion, cancellation and invalid-input paths', async () => {
  const artifacts = await buildArtifacts();
  for (const mode of ['normal', 'cancel', 'invalid'] as const) {
    const env = createEnvironment({ responses: [mode === 'cancel' ? -1 : { fields: ['sample'] }] });
    env.globals.DocumentPicker.openFile = async () => '/documents/input.js';
    env.local.writeString('/documents/input.js', mode === 'invalid' ? 'const value = 1;' : 'const widget = new ListWidget(); widget.addText("Converted"); Script.setWidget(widget); Script.complete();');
    await execute(required(artifacts['weather-cal-converter.js']), env, 'Converter');
    assert.equal(env.exports.length, mode === 'normal' ? 1 : 0);
    if (mode === 'normal') {
      const converted = required(env.exports[0]);
      assert.equal(typeof converted, 'string');
      const column = new env.Stack();
      await vm.runInNewContext('(async () => { const custom = {' + converted + '}; await custom.sample(column); })()', { ...env.globals, column });
      assert.deepEqual(texts(column), ['Converted']);
      assert.equal(env.globals.Script.completionCount, 1);
    }
    if (mode === 'invalid') assert(env.alerts.some(alert => /ListWidget/.test(alert.message)));
  }
});

test('final widget uses its iCloud identity and a custom background despite denied permissions', async () => {
  const artifacts = await buildArtifacts();
  const env = createEnvironment({ name: 'Cloud Identity', iCloud: true });
  env.globals.CalendarEvent.between = async () => { throw Error('Denied'); };
  env.globals.Reminder.allIncomplete = async () => { throw Error('Denied'); };
  env.globals.Location.current = async () => { throw Error('Denied'); };
  env.cloud.writeString('/library/weather-cal-preferences-Cloud Identity', JSON.stringify({widget:dimensions}));
  const source = customizedBundle(required(artifacts['one.js']), 'const layout = `column[events,reminders,current,text("Cloud survives")]`; const custom = { background(widget) { widget.backgroundColor = Color.red(); } };');
  await execute(source, env, 'Cloud Identity');
  const widget = required(env.globals.Script.widget);
  assert(texts(widget).includes('Cloud survives'));
  assert(texts(widget).includes('Weather unavailable'));
  assert.equal(widget.backgroundColor.hex, 'ff0000');
  assert(env.downloads.includes('/library/weather-cal-preferences-Cloud Identity'));
  assert.equal(env.local.store.size, 0);
});

test('actual one.js exports and imports exact user code, settings and both backgrounds before running under a new identity', async t => {
  const artifacts = await buildArtifacts();
  const source = customizedBundle(required(artifacts['one.js']), `const layout = 'column[text("Round trip"),identity]'; const custom = { items: { identity: ${customModule('Script.name()')} } };`);
  const env = installScriptable(t, { iCloud: true, name: 'Original' });
  const engine = createWeatherCal();
  engine.initialize('Original', true);
  env.cloud.writeString('/documents/Original.js', source);
  env.cloud.writeString(engine.prefPath, JSON.stringify({ widget: { ...dimensions, padding: 0, instantDark: false }, localization: { noEventMessage: '' } }));
  env.cloud.writeString(engine.bgPath, '{"type":"image","dark":true}');
  env.cloud.writeImage('/documents/Weather Cal/Original.jpg', { pixels: 'light original' });
  env.cloud.writeImage('/documents/Weather Cal/Original (Dark).jpg', { pixels: 'dark original' });
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ iCloud: true, dark: true, name: 'Imported' });
  destination.cloud.writeString('/documents/Other.js', 'other source');
  destination.cloud.writeString('/library/weather-cal-preferences-Other', 'other preferences');
  await execute(exported, destination, 'Imported');
  const restored = destination.cloud.readString('/documents/Imported.js');
  assert.equal(restored, source);
  assert.deepEqual(JSON.parse(destination.cloud.readString('/library/weather-cal-preferences-Imported')), await engine.getSettings());
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Imported.jpg'), { pixels: 'light original' });
  assert.deepEqual(destination.cloud.readImage('/documents/Weather Cal/Imported (Dark).jpg'), { pixels: 'dark original' });
  destination.globals.Script.completionCount = 0;
  await execute(restored, destination, 'Imported');
  const widget = required(destination.globals.Script.widget);
  assert.deepEqual(texts(widget), ['Round trip', 'Imported']);
  assert.deepEqual(widget.backgroundImage, { pixels: 'dark original' });
  assert.equal(destination.cloud.readString('/documents/Other.js'), 'other source');
  assert.equal(destination.cloud.readString('/library/weather-cal-preferences-Other'), 'other preferences');
});

test('final converter completes when the native file picker rejects', async () => {
  const artifacts = await buildArtifacts();
  const env = createEnvironment({ responses: [{ fields: ['sample'] }] });
  env.globals.DocumentPicker.openFile = async () => { throw new Error('Picker cancelled'); };
  await execute(required(artifacts['weather-cal-converter.js']), env, 'Converter');
  assert.equal(env.exports.length, 0);
  assert(env.alerts.some(alert => /Picker cancelled/.test(alert.message)));
});
