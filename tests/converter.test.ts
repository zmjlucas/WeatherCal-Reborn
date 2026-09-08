import { convertWidget } from '#source/converter';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, texts, runtime } from './helpers/scriptable';

test('converter produces an executable custom item with safe parameter text and no root presentation', async t => {
  const env = installScriptable(t);
  const input = `const widget = new ListWidget();
widget.addText(args.widgetParameter);
if (config.runsInApp) { await widget.presentLarge(); }
Script.setWidget(widget);
Script.complete();
return widget;`;
  const output = convertWidget(input, 'example', { parameter: 'a"b\\c\n${literal}' });
  const custom: unknown = new Function('return ({' + output + '})')();
  assert(custom !== null && typeof custom === 'object' && 'example' in custom && typeof custom.example === 'function');
  const column = new env.Stack();
  await custom.example(column);
  assert.deepEqual(texts(column), ['a"b\\c\n${literal}']);
  assert.equal(column.children[0]!.cornerRadius, 20);
  assert.equal(runtime.Script.completed, undefined);
});

test('converter rejects invalid names and scripts without a widget declaration', () => {
  assert.throws(() => convertWidget('const x = new ListWidget()', 'bad-name'), /name/);
  assert.throws(() => convertWidget('const x = 1', 'example'), /ListWidget/);
});

test('converter preserves nested call syntax, dollar-prefixed names and literal code examples', async t => {
  const env = installScriptable(t);
  const source = `const $w = new ListWidget();
$w.addText('Script.complete() and args.widgetParameter');
$w.addText(args.widgetParameter);
$w.refreshAfterDate = new Date(Date.now() + 1000);
if (config.runsInApp) { await $w.presentLarge(); }
Script.setWidget(($w));`;
  runtime.config.runsInApp = true;
  const output = convertWidget(source, 'example', { parameter: 'value' });
  const custom: unknown = new Function('return ({' + output + '})')();
  assert(custom !== null && typeof custom === 'object' && 'example' in custom && typeof custom.example === 'function');
  const column = new env.Stack();
  await custom.example(column);
  assert.deepEqual(texts(column), ['Script.complete() and args.widgetParameter', 'value']);
  assert.equal(column.children[0]!.refreshAfterDate, undefined);
});

test('converter preserves comments, regular expressions and template literals while adapting executable calls', async t => {
  const env = installScriptable(t);
  const input = 'const widget = new ListWidget();\n' +
    '// Script.complete(); args.widgetParameter\n' +
    '/* widget.presentLarge(); */\n' +
    'const pattern = /Script\\.complete\\(\\)|args\\.widgetParameter/g;\n' +
    'const template = `literal Script.complete() ${"template value"}`;\n' +
    'widget.addText(template);\n' +
    'widget.addText(String(pattern.test("Script.complete()")));\n' +
    'widget.addText(args.widgetParameter);\n' +
    'Script.setWidget(widget); Script.complete();';
  const output = convertWidget(input, 'example', { parameter: '', padding: 0, cornerRadius: 0 });
  assert(output.includes('// Script.complete(); args.widgetParameter'));
  assert(output.includes('/* widget.presentLarge(); */'));
  const custom: unknown = new Function('return ({' + output + '})')();
  assert(custom !== null && typeof custom === 'object' && 'example' in custom && typeof custom.example === 'function');
  const column = new env.Stack();
  await custom.example(column);
  assert.deepEqual(texts(column), ['literal Script.complete() template value', 'true', '']);
  assert.deepEqual(column.children[0]?.padding, [0, 0, 0, 0]);
  assert.equal(column.children[0]?.cornerRadius, 0);
  assert.equal(runtime.Script.completionCount, 0);
});
