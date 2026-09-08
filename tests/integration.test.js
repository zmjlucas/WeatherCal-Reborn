const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { bundle } = require('../scripts/bundle');
const { createEnvironment, installScriptable, texts } = require('./helpers/scriptable');

const layout = 'row\ncolumn\ndate\ngreeting\nevents\nreminders\ncurrent\nfuture\nforecast\ndaily\nhourly\nsunrise\nsunset\ncovid\ntext(Hello (world))\nbattery\nweek\nsymbol(star.fill)\nnews';

test('complete widget renders every built-in item offline using production modules', async t => {
  installScriptable(t);
  const { createWeatherCal } = require('../src/index');
  const code = createWeatherCal();
  const widget = await code.createWidget(layout, 'Full', false);
  const output = texts(widget);
  assert(output.includes('Hello (world)'));
  assert(output.includes('57%'));
  assert(output.includes('--°'));
  assert(output.includes('Enjoy the rest of your day.'));
  assert.equal(code.data.weather.forecast.length, 8);
});

test('bundled engine runs in a clean Scriptable context without Node or leaked globals', async () => {
  const env = createEnvironment();
  const context = { ...env.globals, Date, module: { exports: {}, filename: '/documents/weather-cal-code.js' } };
  const initialKeys = Object.keys(context).sort();
  vm.createContext(context);
  vm.runInContext('"use strict";\n' + bundle(require.resolve('../src/index')), context);
  const widget = await context.module.exports.createWidget(layout, 'Bundle', false);
  assert(texts(widget).includes('Hello (world)'));
  assert.deepEqual(Object.keys(context).sort(), initialKeys);
});

test('launcher downloads only the reborn engine, imports it, sets widget and completes', async () => {
  const engine = bundle(require.resolve('../src/index'));
  const env = createEnvironment({ iCloud: true, request: async () => '// Variables used by Scriptable.\n' + engine });
  const context = { ...env.globals, Date, module: { filename: '/documents/My Widget.js' } };
  context.importModule = name => {
    const inner = { ...env.globals, Date, module: { exports: {}, filename: '/documents/' + name + '.js' } };
    vm.runInNewContext(env.cloud.readString('/documents/' + name + '.js'), inner);
    return inner.module.exports;
  };
  const launcher = fs.readFileSync(require.resolve('../src/scriptable/launcher.js'), 'utf8');
  await vm.runInNewContext('(async () => {\n' + launcher + '\n})()', context);
  assert(env.requests.some(url => url.includes('WeatherCal-Reborn/releases/latest/download/weather-cal-code.js')));
  assert(env.downloads.includes('/documents/weather-cal-code.js'));
  assert(env.globals.Script.widget);
  assert.equal(env.globals.Script.completed, true);
});

test('launcher honors preview size and an exit from setup without a network request', async () => {
  const launcher = fs.readFileSync(require.resolve('../src/scriptable/launcher.js'), 'utf8');
  for (const preview of ['small', 'medium', 'large', undefined]) {
    const env = createEnvironment();
    env.local.writeString('/documents/weather-cal-code.js', 'installed');
    env.globals.config.runsInApp = true;
    env.globals.config.runsInWidget = false;
    const widget = new env.Stack();
    let renders = 0;
    const context = { ...env.globals, module: { filename: '/documents/Widget.js' }, importModule: () => ({
      runSetup: async () => preview, createWidget: async () => { renders++; return widget; }
    }) };
    await vm.runInNewContext('(async () => {\n' + launcher + '\n})()', context);
    assert.equal(widget.preview, preview);
    assert.equal(renders, preview ? 1 : 0);
    assert.equal(env.globals.Script.completed, true);
    assert.equal(env.requests.length, 0);
  }
});

test('the widget keeps local items available when calendar and reminder access is denied', async t => {
  const { texts } = require('./helpers/scriptable');
  installScriptable(t);
  globalThis.CalendarEvent.between = async () => { throw Error('Calendar access denied'); };
  globalThis.Reminder.allIncomplete = async () => { throw Error('Reminder access denied'); };
  const context = require('../src/create').createWeatherCal();
  const widget = await context.createWidget('row\ncolumn\ndate\nevents\nreminders\nbattery\ntext(Local information)', 'Limited Permissions', false);
  assert.deepEqual(context.data.events, []);
  assert.deepEqual(context.data.reminders, []);
  assert(texts(widget).includes('57%'));
  assert(texts(widget).includes('Local information'));
  assert(texts(widget).some(value => value.includes(context.now.getFullYear().toString())));
});

test('exporting a custom background without persisted appearance preserves the working launcher', async t => {
  const env = installScriptable(t);
  const { createWeatherCal } = require('../src/create');
  const engine = createWeatherCal();
  const source = '// Variables used by Scriptable.\nconst custom = { background(widget) { widget.backgroundColor = Color.red(); } };\n';
  env.local.writeString('/documents/Custom.js', source);
  const widget = await engine.createWidget('row\ncolumn', 'Custom', false, {
    background(widget) { widget.backgroundColor = Color.red(); }
  });
  assert.equal(widget.backgroundColor.hex, 'ff0000');
  const exported = await engine.exportWidget();
  const destination = createEnvironment({ name: 'Imported Custom' });
  await vm.runInNewContext('(async () => {' + exported + '\n})()', {
    ...destination.globals, module: { filename: '/documents/Imported Custom.js' }
  });
  assert.equal(destination.local.readString('/documents/Imported Custom.js'), source);
});
