import { test } from 'vitest';
import assert from 'node:assert/strict';
import { planLayout } from '#source/layout/planner';
import type { ItemVariant, LayoutNode, LayoutProps, Measurement, PreparedItem, ResolvedNode } from '#source/layout/types';

function node(type: LayoutNode['type'], id: string, children: LayoutNode[] = [], props: LayoutProps = {}): LayoutNode {
  return { type, id, name: type === 'item' ? id : type, children, props, options: {}, source: { offset: 0, line: 1, column: 1 } };
}
function item(width: number, height: number | ((width: number) => number)): PreparedItem {
  return { state: 'ready', effects: {}, render() {}, variants: [{ id: 'normal', minWidth: width, preferredWidth: width,
    adaptationCost: 0, measure: w => ({ requiredHeight: typeof height === 'number' ? height : height(w), preferredHeight: typeof height === 'number' ? height : height(w), confidence: 'estimated' }) }] };
}
function leaves(root: ResolvedNode): string[] { return root.type === 'item' ? [root.id] : root.children.flatMap(leaves); }
const viewport = (width: number, height: number) => ({ width, height, confidence: 'estimated' as const, source: 'test' });

test('auto can move a wide middle item into a full-width band without losing instances', () => {
  const children = ['a', 'b', 'c'].map(id => node('item', id));
  const items = new Map([['a', item(60, 80)], ['b', item(180, 20)], ['c', item(60, 80)]]);
  const result = planLayout(node('auto', 'root', children), viewport(180, 108), items);
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.deepEqual([...leaves(result.tree)].sort(), ['a', 'b', 'c']);
  assert.notDeepEqual(leaves(result.tree), ['a', 'b', 'c']);
  const ordered = planLayout(node('flow', 'root', children), viewport(180, 108), items);
  assert.equal(ordered.ok, false);
});

test('flow preserves order through adaptive groups and duplicate module instances', () => {
  const children = ['a', 'b', 'c', 'd'].map(id => node('item', id));
  const items = new Map(children.map(n => [n.id, item(40, 20)]));
  const result = planLayout(node('flow', 'root', children), viewport(100, 80), items);
  assert(result.ok);
  assert.deepEqual(leaves(result.tree), ['a', 'b', 'c', 'd']);
});

test('two nested auto regions share a parent budget with weighted surplus', () => {
  const first = node('auto', 'first', [node('item', 'a')], { grow: 1 });
  const second = node('auto', 'second', [node('item', 'b')], { grow: 2 });
  const result = planLayout(node('column', 'root', [first, second], { gap: 10 }), viewport(120, 200), new Map([['a', item(40, 20)], ['b', item(40, 20)]]));
  assert(result.ok);
  assert.equal(result.tree.children[0]!.box.height, 70);
  assert.equal(result.tree.children[1]!.box.height, 120);
  assert.equal(result.tree.children[1]!.box.y, 80);
});

test('a fixed manual subtree stays atomic while auto moves it', () => {
  const group = node('column', 'group', [node('item', 'a'), node('item', 'c')], { width: 60, gap: 0 });
  const result = planLayout(node('auto', 'root', [group, node('item', 'b')]), viewport(180, 100), new Map([['a', item(40, 20)], ['b', item(80, 60)], ['c', item(40, 20)]]));
  assert(result.ok);
  const grouped = result.tree.children.find(n => n.id === 'group');
  assert(grouped);
  assert.equal(grouped.box.width, 60);
  assert.deepEqual(leaves(grouped), ['a', 'c']);
});

test('height measurements follow allocated widths and respect padding and gaps', () => {
  const root = node('row', 'root', [node('item', 'a', [], { grow: 1 }), node('item', 'b', [], { width: 40 })], { gap: 10, padding: [5, 5, 5, 5] });
  const result = planLayout(root, viewport(120, 60), new Map([['a', item(20, w => Math.ceil(200 / w) * 10)], ['b', item(40, 20)]]));
  assert(result.ok);
  assert.equal(result.tree.children[0]!.box.width, 60);
  assert.equal(result.tree.children[0]!.box.x, 5);
  assert.equal(result.tree.children[1]!.box.x, 75);
  assert.equal(result.tree.contentBox.width, 110);
});

test('grow saturation gives leftover space to other eligible siblings', () => {
  const root = node('column', 'root', [node('item', 'a', [], { grow: 1, maxHeight: 30 }), node('item', 'b', [], { grow: 1 })], { gap: 0 });
  const result = planLayout(root, viewport(100, 100), new Map([['a', item(20, 20)], ['b', item(20, 20)]]));
  assert(result.ok);
  assert.equal(result.tree.children[0]!.box.height, 30);
  assert.equal(result.tree.children[1]!.box.height, 70);
});

test('search limits are distinct from a fully explored no-fit result', () => {
  const root = node('auto', 'root', [node('item', 'a'), node('item', 'b')]);
  const items = new Map([['a', item(80, 80)], ['b', item(80, 80)]]);
  const limited = planLayout(root, viewport(100, 100), items, { maxMeasurements: 1 });
  assert.equal(limited.ok, false);
  assert(limited.diagnostics.some(d => d.code === 'SEARCH_LIMIT_REACHED'));
  const complete = planLayout(root, viewport(100, 100), items);
  assert.equal(complete.ok, false);
  assert(complete.diagnostics.some(d => d.code === 'NO_CANDIDATE_FITS'));
});

test('invalid measured geometry fails explicitly instead of producing native NaN frames', () => {
  const result = planLayout(node('item', 'a'), viewport(100, 100), new Map([['a', item(20, () => Number.NaN)]]));
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(d => d.code === 'ITEM_CONTRACT_INVALID'));
});

test.each(['row', 'column'] as const)('fixed spaces constrain only the %s main axis', axis => {
  const space = { ...node('space', 'blank'), length: 50 };
  const result = planLayout(node(axis, 'root', [space, node('item', 'a')], { gap: 0 }),
    axis === 'row' ? viewport(80, 20) : viewport(20, 80), new Map([['a', item(20, 20)]]));
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.equal(axis === 'row' ? result.tree.children[1]!.box.x : result.tree.children[1]!.box.y, 50);
});

test('zero and weighted flexible spaces preserve all content while splitting remaining space', () => {
  const root = node('row', 'root', [
    { ...node('space', 'zero'), length: 0 }, node('space', 'first'),
    node('space', 'second', [], { grow: 2 }), node('item', 'a'),
  ], { gap: 0 });
  const result = planLayout(root, viewport(110, 20), new Map([['a', item(20, 20)]]));
  assert(result.ok);
  assert.deepEqual(result.tree.children.map(child => child.box.width), [0, 30, 60, 20]);
  assert.deepEqual(leaves(result.tree), ['a']);
});

test.each(['start', 'center', 'end'] as const)('row %s alignment shrinks preferred height to the available cross axis', align => {
  const prepared = item(20, 20);
  prepared.variants = [{ ...prepared.variants[0]!, measure: () => ({ requiredHeight: 20, preferredHeight: 80, confidence: 'estimated' }) }];
  const result = planLayout(node('row', 'root', [node('item', 'a')], { align }), viewport(100, 40), new Map([['a', prepared]]));
  assert(result.ok);
  assert.equal(result.tree.children[0]!.box.y, 0);
  assert.equal(result.tree.children[0]!.box.height, 40);
});

test('frontier pruning retains lower-cost feasible combinations alongside the shortest ones', () => {
  const prepared = item(20, 10);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'compact', adaptationCost: 10 },
    { ...prepared.variants[0]!, id: 'natural', adaptationCost: 0, measure: () => ({ requiredHeight: 20, preferredHeight: 20, confidence: 'estimated' }) },
  ];
  const result = planLayout(node('column', 'root', [node('item', 'a'), node('item', 'b')], { gap: 0 }),
    viewport(100, 40), new Map([['a', prepared], ['b', prepared]]), { frontier: 2 });
  assert(result.ok);
  assert.deepEqual(result.tree.children.map(child => child.variant), ['natural', 'natural']);
});

test('nested automatic frontiers keep alternatives needed by competing siblings', () => {
  const first = node('auto', 'first', [node('item', 'a'), node('item', 'b')]);
  const second = node('flow', 'second', [node('item', 'c'), node('item', 'd')]);
  const items = new Map(['a', 'b', 'c', 'd'].map(id => [id, item(20, 30)]));
  const result = planLayout(node('column', 'root', [first, second], { gap: 10 }), viewport(100, 70), items);
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.deepEqual(leaves(result.tree).sort(), ['a', 'b', 'c', 'd']);
  assert.deepEqual(result.tree.children.map(child => child.box.height), [30, 30]);
  assert.deepEqual(leaves(result.tree.children[1]!), ['c', 'd']);
});

test('reaching the measurement count does not truncate candidates that need only cached measurements', () => {
  const children = [node('item', 'a', [], { width: 100 }), node('item', 'b', [], { width: 100 })];
  const result = planLayout(node('auto', 'root', children), viewport(100, 48),
    new Map([['a', item(100, 20)], ['b', item(100, 20)]]), { maxMeasurements: 2 });
  assert(result.ok);
  assert.equal(result.measurements, 2);
  assert(!result.diagnostics.some(problem => problem.code === 'SEARCH_TRUNCATED'));
});

test.each([null, undefined, {}])('a malformed measurement return produces a diagnostic: %j', value => {
  const prepared = item(20, 20);
  prepared.variants = [{ ...prepared.variants[0]!, measure: () => value as Measurement }];
  const result = planLayout(node('item', 'a'), viewport(100, 100), new Map([['a', prepared]]));
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(problem => problem.code === 'ITEM_CONTRACT_INVALID'));
});

test('malformed prepared variants fail without leaking a TypeError', () => {
  const prepared = item(20, 20);
  prepared.variants = [null as unknown as ItemVariant];
  const result = planLayout(node('item', 'a'), viewport(100, 100), new Map([['a', prepared]]));
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(problem => problem.code === 'ITEM_CONTRACT_INVALID'));
});

test.each([null, {}, { ...node('column', 'root'), children: null }])('malformed direct AST inputs return diagnostics: %j', root => {
  const result = planLayout(root as LayoutNode, viewport(100, 100), new Map());
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(problem => problem.code === 'INVALID_LAYOUT'));
});

test('cycles and duplicate node identities are rejected before solving', () => {
  const cyclic = node('column', 'root');
  cyclic.children.push(cyclic);
  const duplicate = node('column', 'root', [node('item', 'a'), node('item', 'a')]);
  for (const root of [cyclic, duplicate]) {
    const result = planLayout(root, viewport(100, 100), new Map([['a', item(20, 20)]]));
    assert.equal(result.ok, false);
    assert(result.diagnostics.some(problem => problem.code === 'INVALID_LAYOUT'));
  }
});

test('nonfinite AST properties are rejected before they enter geometry', () => {
  const root = node('row', 'root', [node('item', 'a')], { padding: [0, NaN, 0, 0] });
  const result = planLayout(root, viewport(100, 100), new Map([['a', item(20, 20)]]));
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(problem => problem.code === 'INVALID_LAYOUT'));
});

test('tiny numeric tolerance differences never create NaN allocations', () => {
  const result = planLayout(node('column', 'root', [node('item', 'a')], { gap: 0 }), viewport(100, 50 - 1e-8), new Map([['a', item(20, 50)]]));
  assert(result.ok);
  assert(Object.values(result.tree.children[0]!.box).every(Number.isFinite));
});

test('manual rows offer the preferred widths of lower-cost variants before compacting', () => {
  const prepared = item(20, 20);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'compact', adaptationCost: 5 },
    { ...prepared.variants[0]!, id: 'natural', minWidth: 40, preferredWidth: 40, adaptationCost: 0 },
  ];
  const result = planLayout(node('row', 'root', [node('item', 'a'), node('item', 'b')], { gap: 0 }),
    viewport(100, 20), new Map([['a', prepared], ['b', prepared]]));
  assert(result.ok);
  assert.deepEqual(result.tree.children.map(child => child.variant), ['natural', 'natural']);
  assert.deepEqual(result.tree.children.map(child => child.box.width), [40, 40]);
});

test('equal-cost variants are ranked by allocated height deviation before stable identity', () => {
  const prepared = item(20, 20);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'a_compact', measure: () => ({ requiredHeight: 20, preferredHeight: 20, confidence: 'estimated' }) },
    { ...prepared.variants[0]!, id: 'z_natural', measure: () => ({ requiredHeight: 20, preferredHeight: 80, confidence: 'estimated' }) },
  ];
  const result = planLayout(node('item', 'a'), viewport(20, 80), new Map([['a', prepared]]));
  assert(result.ok);
  assert.equal(result.tree.variant, 'z_natural');
});

test('maximum sizes remain hard constraints under stretch and centered alignment', () => {
  const root = node('column', 'root', [node('item', 'a', [], { maxWidth: 30, maxHeight: 25, grow: 1 })], { align: 'center' });
  const result = planLayout(root, viewport(100, 100), new Map([['a', item(20, 20)]]));
  assert(result.ok);
  assert.deepEqual(result.tree.children[0]!.box, { x: 40, y: 0, width: 20, height: 25 });
});

test('replanning the same snapshot is deterministic and does not mutate its source tree', () => {
  const root = node('auto', 'root', [node('item', 'a'), node('item', 'b'), node('item', 'c')]);
  const source = JSON.stringify(root);
  const items = new Map([['a', item(30, 40)], ['b', item(60, 20)], ['c', item(20, 30)]]);
  const first = planLayout(root, viewport(100, 100), items);
  assert(first.ok);
  assert.deepEqual(planLayout(root, viewport(100, 100), items), first);
  assert.equal(JSON.stringify(root), source);
});

test.each([{ frontier: 0 }, { maxCandidates: -1 }, { maxMeasurements: NaN }])('invalid budgets return diagnostics without measuring: %j', limits => {
  let called = false;
  const result = planLayout(node('item', 'a'), viewport(100, 100), new Map([['a', item(20, () => { called = true; return 20; })]]), limits);
  assert.equal(result.ok, false);
  assert(result.diagnostics.some(problem => problem.code === 'INVALID_LIMITS'));
  assert.equal(called, false);
});

test.each([false, true])('preferred area ordering finds tall and short rows while preserving manual groups: %s', grouped => {
  const names = ['a', 'b', 'c', 'd', 'e', 'f'];
  const heights = [100, 10, 100, 10, 100, 10];
  const children = names.map(id => grouped
    ? node('column', id, [node('item', `${id}1`), node('item', `${id}2`)], { gap: 0 })
    : node('item', id));
  const items = new Map(names.flatMap((id, index) => grouped
    ? [[`${id}1`, item(50, heights[index]! / 2)], [`${id}2`, item(50, heights[index]! / 2)]] as const
    : [[id, item(50, heights[index]!)]] as const));
  const result = planLayout(node('auto', 'root', children, { gap: 0 }), viewport(150, 110), items);
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.equal(result.strategy, 'search');
  assert.deepEqual(result.tree.children.map(row => row.children.map(child => child.id)), [['a', 'c', 'e'], ['b', 'd', 'f']]);
  assert.deepEqual(result.tree.children.map(row => row.box.height), [100, 10]);
  if (grouped) assert.deepEqual(leaves(result.tree.children[0]!.children[0]!), ['a1', 'a2']);
});

test('area hints share cached measurements and preserve deterministic measurement budgets', () => {
  const names = ['a', 'b', 'c', 'd', 'e', 'f'];
  const heights = [100, 10, 100, 10, 100, 10];
  const calls: string[] = [];
  const items = new Map(names.map((id, index) => {
    const prepared = item(50, heights[index]!);
    prepared.variants = [{ ...prepared.variants[0]!, measure: width => {
      calls.push(`${id}:${width}`);
      return { requiredHeight: heights[index]!, preferredHeight: heights[index]!, confidence: 'estimated' };
    } }];
    return [id, prepared];
  }));
  const root = node('auto', 'root', names.map(id => node('item', id)), { gap: 0 });
  const first = planLayout(root, viewport(150, 110), items, { maxMeasurements: 6 });
  assert(first.ok, JSON.stringify(first.diagnostics));
  assert.equal(first.measurements, calls.length);
  assert.equal(new Set(calls).size, calls.length);
  assert.equal(calls.length, 6);
  const firstCalls = [...calls];
  calls.length = 0;
  assert.deepEqual(planLayout(root, viewport(150, 110), items, { maxMeasurements: 6 }), first);
  assert.deepEqual(calls, firstCalls);
});

test.each(['column', 'auto'] as const)('%s stretch retains a fitting variant with its own maximum width', type => {
  const prepared = item(20, 20);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'compact', preferredWidth: 40, maxWidth: 40 },
    { ...prepared.variants[0]!, id: 'large', minWidth: 80, preferredWidth: 100, maxWidth: 100, adaptationCost: 1,
      measure: () => ({ requiredHeight: 200, preferredHeight: 200, confidence: 'estimated' }) },
  ];
  const result = planLayout(node(type, 'root', [node('item', 'a')]), viewport(100, 40), new Map([['a', prepared]]));
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.equal(result.tree.children[0]!.variant, 'compact');
  assert.equal(result.tree.children[0]!.box.width, 40);
  assert.equal(result.tree.box.width, 100);
});

test.each(['row', 'auto'] as const)('%s growth respects variant-specific width caps for multiple siblings', type => {
  const widths: number[] = [];
  const prepared = item(20, 20);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'compact', preferredWidth: 40, maxWidth: 40, measure: width => {
      widths.push(width);
      return { requiredHeight: 60 - width, preferredHeight: 60 - width, confidence: 'estimated' };
    } },
    { ...prepared.variants[0]!, id: 'large', minWidth: 80, preferredWidth: 100, maxWidth: 100, adaptationCost: 1,
      measure: () => ({ requiredHeight: 200, preferredHeight: 200, confidence: 'estimated' }) },
  ];
  const children = ['a', 'b'].map(id => node('item', id, [], type === 'row' ? { grow: 1 } : {}));
  const result = planLayout(node(type, 'root', children, { gap: 0 }), viewport(100, 20), new Map([['a', prepared], ['b', prepared]]));
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.deepEqual(result.tree.children.map(child => [child.variant, child.box.width, child.box.height]), [['compact', 40, 20], ['compact', 40, 20]]);
  assert(widths.includes(40));
  assert(widths.every(width => width <= 40));
});

test('variant-specific caps cannot override an explicit width or the root viewport', () => {
  const prepared = item(20, 20);
  prepared.variants = [
    { ...prepared.variants[0]!, id: 'compact', preferredWidth: 40, maxWidth: 40 },
    { ...prepared.variants[0]!, id: 'large', minWidth: 80, preferredWidth: 100, maxWidth: 100, adaptationCost: 1,
      measure: () => ({ requiredHeight: 200, preferredHeight: 200, confidence: 'estimated' }) },
  ];
  for (const root of [node('item', 'a'), node('column', 'root', [node('item', 'a', [], { width: 100 })])]) {
    const result = planLayout(root, viewport(100, 40), new Map([['a', prepared]]));
    assert.equal(result.ok, false);
  }
});

test('small presets fit a full-height side item beside a vertical pair', () => {
  const root = node('auto', 'root', ['a','b','c'].map(id => node('item', id)));
  const items = new Map([['a',item(80,80)],['b',item(40,30)],['c',item(40,30)]]);
  const result = planLayout(root, {...viewport(128,80),family:'small'}, items);
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.equal(result.strategy, 'presets');
  assert.equal(result.fontScale, 1);
  assert.deepEqual(leaves(result.tree).sort(), ['a','b','c']);
  assert.equal(result.tree.type, 'row');
});

test('font fallback adapts nested automatic content while leaving manual siblings and pinned variants intact', () => {
  function adaptive(scale = 1): PreparedItem { return {...item(20, 140 * scale), atFontScale: adaptive}; }
  const manual = {...item(20,20), atFontScale() { throw Error('Manual content must not resize'); }};
  const root = node('column','root',[
    node('item','title',[],{height:20}),
    node('auto','auto',[node('item','body',[],{variant:'normal'})]),
  ]);
  const result = planLayout(root, viewport(100,130), new Map([['title',manual],['body',adaptive()]]));
  assert(result.ok, JSON.stringify(result.diagnostics));
  assert.equal(result.tree.children[0]!.fontScale, undefined);
  assert.equal(result.tree.children[0]!.box.height,20);
  const body = result.tree.children[1]!.children[0]!;
  assert.equal(body.variant, 'normal');
  assert(body.fontScale! < 1 && body.fontScale! >= 0.7);
  assert(body.box.height >= 140 * body.fontScale!);
});

test('font retry stages share hard measurement and candidate budgets', () => {
  let calls = 0;
  function adaptive(scale = 1): PreparedItem {
    const prepared = item(20, 300 * scale);
    const measure = prepared.variants[0]!.measure;
    return {...prepared, variants:[{...prepared.variants[0]!, measure(width) {calls++; return measure(width);}}],atFontScale:adaptive};
  }
  const root = node('auto','root',[node('item','a'),node('item','b')]);
  const result = planLayout(root, viewport(100,60), new Map([['a',adaptive()],['b',adaptive()]]), {maxMeasurements:4,maxCandidates:6});
  assert.equal(result.ok, false);
  assert.equal(result.measurements,calls);
  assert(calls <= 4); assert(result.candidates <= 6);
  assert(result.diagnostics.some(d=>d.code === 'SEARCH_LIMIT_REACHED'));
});

test.each([false,true])('font adapters do not starve an existing original-size area-order solution: shrink=%s', shrink => {
  const heights = [100,10,100,10,100,10];
  const children = heights.map((_,index)=>node('item',String(index)));
  const items = new Map(children.map((child,index)=> {
    function adaptive(scale=1): PreparedItem {
      return {...item(50,heights[index]! * (shrink ? scale : 1)), atFontScale:adaptive};
    }
    return [child.id,adaptive()];
  }));
  const result = planLayout(node('auto','root',children,{gap:0}),viewport(150,110),items);
  assert(result.ok,JSON.stringify(result));
  assert.equal(result.fontScale,1);
  assert.equal(result.strategy,'search');
  assert.deepEqual(leaves(result.tree),['0','2','4','1','3','5']);
});

test('a searched plan retains a side preset needed by another automatic region', () => {
  const upper = node('auto','upper',['a','b','c'].map(id=>node('item',id)),{height:80});
  const heights = [100,10,100,10,100,10];
  const lower = node('auto','lower',heights.map((_,i)=>node('item',String(i))),{gap:0,height:110});
  const items = new Map([['a',item(80,80)],['b',item(40,30)],['c',item(40,30)],...heights.map((height,i)=>[String(i),item(50,height)] as const)]);
  const result = planLayout(node('column','root',[upper,lower],{gap:0}),viewport(150,190),items);
  assert(result.ok,JSON.stringify(result));
  assert.equal(result.tree.children[0]!.type,'row');
  assert.deepEqual(leaves(result.tree.children[1]!),['0','2','4','1','3','5']);
});
