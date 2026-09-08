const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable, texts } = require('./helpers/scriptable');

test('converter produces an executable custom item with safe parameter text and no root presentation', async t => {
  const env = installScriptable(t);
  const { convertWidget } = require('../src/converter');
  const input = `const widget = new ListWidget();
widget.addText(args.widgetParameter);
if (config.runsInApp) { await widget.presentLarge(); }
Script.setWidget(widget);
Script.complete();
return widget;`;
  const output = convertWidget(input, 'example', { parameter: 'a"b\\c\n${literal}' });
  const custom = new Function('return ({' + output + '})')();
  const column = new env.Stack();
  await custom.example(column);
  assert.deepEqual(texts(column), ['a"b\\c\n${literal}']);
  assert.equal(column.children[0].cornerRadius, 20);
  assert.equal(Script.completed, undefined);
});

test('converter rejects invalid names and scripts without a widget declaration', () => {
  const { convertWidget } = require('../src/converter');
  assert.throws(() => convertWidget('const x = new ListWidget()', 'bad-name'), /name/);
  assert.throws(() => convertWidget('const x = 1', 'example'), /ListWidget/);
});

test('converter preserves nested call syntax, dollar-prefixed names and literal code examples', async t => {
  const env = installScriptable(t);
  const { convertWidget } = require('../src/converter');
  const source = `const $w = new ListWidget();
$w.addText('Script.complete() and args.widgetParameter');
$w.addText(args.widgetParameter);
$w.refreshAfterDate = new Date(Date.now() + 1000);
if (config.runsInApp) { await $w.presentLarge(); }
Script.setWidget(($w));`;
  config.runsInApp = true;
  const output = convertWidget(source, 'example', { parameter: 'value' });
  const custom = new Function('return ({' + output + '})')();
  const column = new env.Stack();
  await custom.example(column);
  assert.deepEqual(texts(column), ['Script.complete() and args.widgetParameter', 'value']);
  assert.equal(column.children[0].refreshAfterDate, undefined);
});
