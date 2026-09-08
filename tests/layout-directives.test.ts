import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createWeatherCal } from '#source/create';
import { installScriptable, texts } from './helpers/scriptable';

test('alignment directives work before the first row or column', async t => {
  installScriptable(t);
  for (const layout of ['center\nrow\ncolumn\ntext(Hello)', 'row\nleft\ncolumn\ntext(Hello)', 'right\nrow\ncolumn\ntext(Hello)']) {
    const widget = await createWeatherCal().createWidget(layout, 'Alignment', false);
    assert.deepEqual(texts(widget), ['Hello']);
  }
});

test('custom metadata leaves callable built-in layout items available', async t => {
  installScriptable(t);
  const custom = { text: 'label', battery: 7, active: true };
  const widget = await createWeatherCal().createWidget('row\ncolumn\ntext(Hello)', 'Metadata', false, custom);
  assert.deepEqual(texts(widget), ['Hello']);
});

test('custom directives preserve their receiver and shared empty column before layout setup', async t => {
  installScriptable(t);
  let first: unknown;
  let second: unknown;
  const custom = {
    count: 0,
    prepare(this: { count: number }, column: unknown) { this.count++; first = column; },
    inspect(this: { count: number }, column: unknown) { this.count++; second = column; },
  };
  const widget = await createWeatherCal().createWidget('prepare\ninspect\nrow\ncolumn\ntext(Hello)', 'Custom directives', false, custom);
  assert.deepEqual(texts(widget), ['Hello']);
  assert.equal(custom.count, 2);
  assert.deepEqual(first, {});
  assert.equal(first, second);
});
