import type { WidgetContainer } from '#source/types/rendering';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, texts, required, inspect, mockColor } from './helpers/scriptable';
import { createWeatherCal as create } from '#source/create';

test('text layouts preserve parenthesized parameters, fixed sizes, custom overrides and alignment', async t => {
  installScriptable(t);
  const code = create();
  const widget = inspect(await code.createWidget('row(80)\ncolumn(90)\nright\ntext(Hello (world))\nspace(7)', 'A', false, {
    text(column: WidgetContainer, value?: string | null) { code.provideText(value, column, null, true); }
  }));
  assert.deepEqual(texts(widget), ['Hello (world)']);
  assert.equal(widget.children[0]!.size.height, 80);
  const column = widget.children[0]!.children[0]!;
  assert.equal(column.size.width, 90);
  assert.equal(column.children[0]!.children[0]!.type, 'spacer');
  assert.equal(column.children[1]!.length, 7);
});

test('ASCII layouts flush the last row without a trailing separator', async t => {
  installScriptable(t);
  const code = create();
  const widget = inspect(await code.createWidget('--------------------\n|first    |  90    |\n|         | second |', 'ASCII', false, {
    first(column: WidgetContainer) { column.addText('first'); }, second(column: WidgetContainer) { column.addText('second'); }
  }));
  assert.deepEqual(texts(widget), ['first', 'second']);
  assert.equal(widget.children[0]!.children[1]!.size.width, 90);
});

test('widget creation accepts legacy settings and does not leak paths, data or customization across runs', async t => {
  const env = installScriptable(t);
  const code = create();
  code.initialize('Old', false);
  const settings = await code.getSettings();
  settings.layout = 'row\ncolumn\nvalue';
  let first = true;
  await code.createWidget(settings, 'Old', false, { value(column: WidgetContainer) { column.addText('old'); code.data.news = [{ title: 'Old marker', link: '', date: null }]; } });
  env.cloud.writeString('/library/weather-cal-New', JSON.stringify({ type: 'color', color: 'abc123' }));
  const widget = inspect(await code.createWidget('row\ncolumn\nvalue', 'New', true, { value(column: WidgetContainer) { column.addText(code.data.news?.some(item => item.title === 'Old marker') ? 'stale' : 'new'); first = false; } }));
  assert.equal(first, false);
  assert.deepEqual(texts(widget), ['new']);
  assert.equal(code.fm, env.cloud);
  assert.equal(code.prefPath, '/library/weather-cal-preferences-New');
  assert.equal(widget.backgroundColor.hex, 'abc123');
});

test('custom backgrounds work without a stored background and image backgrounds hydrate iCloud', async t => {
  const env = installScriptable(t, { iCloud: true, dark: true });
  const code = create();
  const widget = inspect(await code.createWidget('row\ncolumn', 'Custom', true, { background(widget) { widget.backgroundColor = mockColor('ff0000'); } }));
  assert.equal(widget.backgroundColor.hex, 'ff0000');
  env.cloud.writeString('/library/weather-cal-Image', JSON.stringify({ type: 'image', dark: true }));
  env.cloud.writeImage('/documents/Weather Cal/Image (Dark).jpg', { fixture: 'dark' });
  const imageWidget = inspect(await code.createWidget('row\ncolumn', 'Image', true));
  assert.deepEqual(imageWidget.backgroundImage, { fixture: 'dark' });
  assert(env.downloads.includes('/documents/Weather Cal/Image (Dark).jpg'));
});

test('automatic and custom gradients preserve day/night and color stop configuration', async t => {
  const env = installScriptable(t);
  const code = create();
  env.local.writeString('/library/weather-cal-Gradient', JSON.stringify({ type: 'gradient', initialColor: '111111', finalColor: '222222' }));
  const custom = inspect(await code.createWidget('row\ncolumn', 'Gradient', false));
  assert.deepEqual(custom.backgroundGradient.colors.map(x => x.hex), ['111111', '222222']);
  env.local.writeString('/library/weather-cal-Auto', '{"type":"auto"}');
  code.setupGradient = async () => ({ color: () => [mockColor('000000'), mockColor('888888')], position: () => [0, 1] });
  const automatic = inspect(await code.createWidget('row\ncolumn', 'Auto', false));
  assert.deepEqual(automatic.backgroundGradient.locations, [0, 1]);
});

test('separate widget instances retain independent preferences, custom callbacks and data', async t => {
  const env = installScriptable(t);
  const first = create();
  const second = create();
  env.local.writeString('/library/weather-cal-preferences-First', JSON.stringify({ localization: { morningGreeting: 'First' }, widget: { padding: 0, instantDark: false } }));
  await first.createWidget('row\ncolumn\nvalue', 'First', false, {
    value(column: WidgetContainer) { first.data.news = [{ title: 'First instance', link: '', date: null }]; column.addText('First'); }
  });
  const result = await second.createWidget('row\ncolumn\nvalue', 'Second', true, {
    value(column: WidgetContainer) { column.addText(second.data.news ? 'leaked' : 'Second'); }
  });
  assert.deepEqual(texts(result), ['Second']);
  assert.equal(first.settings.localization.morningGreeting, 'First');
  assert.equal(first.settings.widget.padding, 0);
  assert.equal(first.settings.widget.instantDark, false);
  assert.equal(first.fm, env.local);
  assert.equal(second.fm, env.cloud);
  assert.equal(required(first.data.news)[0]?.title, 'First instance');
  assert.notEqual(first.custom, second.custom);
});
