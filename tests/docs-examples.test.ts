import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { parseLayout } from '#source/layout/parser';
import { planLayout } from '#source/layout/planner';
import { prepareItems } from '#source/items/registry';
import type { ItemModule, LayoutNode, PreparedItem, ResolvedNode } from '#source/layout/types';
import { initializedContext } from './helpers/context';
import { installScriptable, texts, descendants } from './helpers/scriptable';

function publishedExample(file: string, region: string, globals: Record<string, unknown> = {}) {
  const source = readFileSync(new URL(`../website/examples/${file}`, import.meta.url), 'utf8').replaceAll('\r\n', '\n');
  const snippet = source.split(`//#region ${region}\n`)[1]?.split(`//#endregion ${region}`)[0];
  assert(snippet, `Missing published region ${region}`);
  const scope = { ...globals };
  runInNewContext(snippet, scope, { filename: `${file}#${region}`, timeout: 1000 });
  assert.equal(typeof scope.layout, 'string');
  return { layout: scope.layout as string, custom: scope.custom as { items: Record<string, ItemModule> } | undefined };
}

// These dimensions describe controlled fixtures, not phone or weather measurements.
const viewport = { family: 'medium' as const, width: 320, height: 160, confidence: 'estimated' as const, source: 'documentation fixture' };
function prepared(): PreparedItem {
  return { state: 'ready', effects: {}, render() {}, variants: [{
    id: 'normal', minWidth: 40, preferredWidth: 70, adaptationCost: 0,
    measure: () => ({ requiredHeight: 24, preferredHeight: 24, confidence: 'estimated' }),
  }] };
}
function inputs(root: LayoutNode): Map<string, PreparedItem> {
  if (root.type === 'item') return new Map([[root.id, prepared()]]);
  return new Map(root.children.flatMap(child => [...inputs(child)]));
}
function nodes(root: ResolvedNode): ResolvedNode[] {
  return [root, ...root.children.flatMap(nodes)];
}

for (const label of ['auto', 'flow', 'manual', 'semi-auto'] as const) {
  test(`published ${label} example keeps every selected item inside its viewport`, () => {
    const root = parseLayout(publishedExample('layouts.js', label).layout);
    const result = planLayout(root, viewport, inputs(root));
    assert(result.ok, JSON.stringify(result.diagnostics));
    const all = nodes(result.tree);
    const names = all.filter(node => node.type === 'item').map(node => node.name);
    const expected = label === 'semi-auto' ? ['current', 'date', 'future', 'rain'] : ['current', 'future', 'rain'];
    assert.deepEqual([...names].sort(), expected);
    for (const { box } of all) {
      assert(box.x >= -0.001 && box.y >= -0.001);
      assert(box.x + box.width <= 320.001 && box.y + box.height <= 160.001);
    }
    if (label === 'flow') assert.deepEqual(names, ['current', 'rain', 'future']);
    if (label === 'manual') {
      assert.equal(result.tree.type, 'row');
      assert.deepEqual(result.tree.children.map(node => node.name), ['current', 'rain', 'future']);
      assert.equal(new Set(result.tree.children.map(node => node.box.y)).size, 1);
    }
    if (label === 'semi-auto') {
      const [date, automatic] = result.tree.children;
      assert(date && automatic);
      assert.equal(date.name, 'date');
      assert(date.box.y + date.box.height <= automatic.box.y);
    }
  });
}

for (const [region, code, limits] of [
  ['constraint-conflict', 'CONSTRAINT_CONFLICT', {}],
  ['no-candidate', 'NO_CANDIDATE_FITS', {}],
  ['search-limit', 'SEARCH_LIMIT_REACHED', { maxMeasurements: 1 }],
] as const) {
  test(`published failure example produces ${code}`, () => {
    const root = parseLayout(publishedExample('layouts.js', region).layout);
    const result = planLayout(root, viewport, inputs(root), limits);
    assert.equal(result.ok, false);
    assert(result.diagnostics.some(diagnostic => diagnostic.code === code), JSON.stringify(result.diagnostics));
  });
}

test('published custom item measures and renders its prepared label and font snapshot', async t => {
  const env = installScriptable(t);
  const host = await initializedContext(env);
  const { layout, custom } = publishedExample('custom-item.js', 'custom-item', env.globals);
  assert(custom);
  const root = parseLayout(layout);
  const items = await prepareItems(root, host, {
    ...custom.items,
    current: { async prepare() { return prepared(); } },
  });
  const result = planLayout(root, viewport, items);
  assert(result.ok, JSON.stringify(result.diagnostics));
  const status = nodes(result.tree).find(node => node.name === 'status');
  assert(status);
  const snapshot = items.get(status.id);
  assert(snapshot);
  const originalSize = Number(host.format.defaultText.size);
  host.format.defaultText.size = 40;
  for (const [textAlign, childTypes] of [
    ['start', ['text', 'spacer']],
    ['center', ['spacer', 'text', 'spacer']],
    ['end', ['spacer', 'text']],
  ] as const) {
    const target = new env.Stack();
    snapshot.render(target, { id: status.id, variant: 'normal', width: status.contentBox.width,
      height: status.contentBox.height, textAlign });
    assert.deepEqual(texts(target), ['Ready']);
    assert.equal(descendants(target).find(node => node.type === 'text')?.font.size, originalSize);
    assert.equal(target.children[0]?.direction, 'horizontal');
    assert.deepEqual(target.children[0]?.children.map(node => node.type), childTypes);
  }
});
