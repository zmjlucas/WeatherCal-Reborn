const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable, texts } = require('./helpers/scriptable');
function create() {
  return Object.assign({}, require('../src/widget'), require('../src/layout/engine'), require('../src/core/formatting'), require('../src/preferences/defaults'), require('../src/preferences/store'));
}

test('text layouts preserve parenthesized parameters, fixed sizes, custom overrides and alignment', async t => {
  installScriptable(t);
  const code = create();
  const widget = await code.createWidget('row(80)\ncolumn(90)\nright\ntext(Hello (world))\nspace(7)', 'A', false, {
    text(column, value) { code.provideText(value, column, null, true); }
  });
  assert.deepEqual(texts(widget), ['Hello (world)']);
  assert.equal(widget.children[0].size.height, 80);
  const column = widget.children[0].children[0];
  assert.equal(column.size.width, 90);
  assert.equal(column.children[0].children[0].type, 'spacer');
  assert.equal(column.children[1].length, 7);
});

test('ASCII layouts flush the last row without a trailing separator', async t => {
  installScriptable(t);
  const code = create();
  const widget = await code.createWidget('--------------------\n|first    |  90    |\n|         | second |', 'ASCII', false, {
    first(column) { column.addText('first'); }, second(column) { column.addText('second'); }
  });
  assert.deepEqual(texts(widget), ['first', 'second']);
  assert.equal(widget.children[0].children[1].size.width, 90);
});

test('widget creation accepts legacy settings and does not leak paths, data or customization across runs', async t => {
  const env = installScriptable(t);
  const code = create();
  code.initialize('Old', false);
  const settings = await code.getSettings();
  settings.layout = 'row\ncolumn\nvalue';
  let first = true;
  await code.createWidget(settings, 'Old', false, { value(column) { column.addText('old'); code.data.marker = true; } });
  env.cloud.writeString('/library/weather-cal-New', JSON.stringify({ type: 'color', color: 'abc123' }));
  const widget = await code.createWidget('row\ncolumn\nvalue', 'New', true, { value(column) { column.addText(code.data.marker ? 'stale' : 'new'); first = false; } });
  assert.equal(first, false);
  assert.deepEqual(texts(widget), ['new']);
  assert.equal(code.fm, env.cloud);
  assert.equal(code.prefPath, '/library/weather-cal-preferences-New');
  assert.equal(widget.backgroundColor.hex, 'abc123');
});

test('custom backgrounds work without a stored background and image backgrounds hydrate iCloud', async t => {
  const env = installScriptable(t, { iCloud: true, dark: true });
  const code = create();
  const widget = await code.createWidget('row\ncolumn', 'Custom', true, { background(widget) { widget.backgroundColor = Color.red(); } });
  assert.equal(widget.backgroundColor.hex, 'ff0000');
  env.cloud.writeString('/library/weather-cal-Image', JSON.stringify({ type: 'image', dark: true }));
  env.cloud.writeImage('/documents/Weather Cal/Image (Dark).jpg', { fixture: 'dark' });
  const imageWidget = await code.createWidget('row\ncolumn', 'Image', true);
  assert.deepEqual(imageWidget.backgroundImage, { fixture: 'dark' });
  assert(env.downloads.includes('/documents/Weather Cal/Image (Dark).jpg'));
});

test('automatic and custom gradients preserve day/night and color stop configuration', async t => {
  const env = installScriptable(t);
  const code = create();
  env.local.writeString('/library/weather-cal-Gradient', JSON.stringify({ type: 'gradient', initialColor: '111111', finalColor: '222222' }));
  const custom = await code.createWidget('row\ncolumn', 'Gradient', false);
  assert.deepEqual(custom.backgroundGradient.colors.map(x => x.hex), ['111111', '222222']);
  env.local.writeString('/library/weather-cal-Auto', '{"type":"auto"}');
  code.setupGradient = async () => ({ color: () => [Color.black(), Color.gray()], position: () => [0, 1] });
  const automatic = await code.createWidget('row\ncolumn', 'Auto', false);
  assert.deepEqual(automatic.backgroundGradient.locations, [0, 1]);
});
