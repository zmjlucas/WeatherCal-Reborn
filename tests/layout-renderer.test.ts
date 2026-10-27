import { test, expect } from 'vitest';
import { renderLayout } from '#source/layout/renderer';
import { resolveViewport } from '#source/layout/viewport';
import { parseLayout } from '#source/layout/parser';
import { planLayout } from '#source/layout/planner';
import type { PreparedItem, PreparedItems } from '#source/layout/types';
import { installScriptable, inspect, type TestNode } from './helpers/scriptable';

const viewport = { width: 200, height: 100, confidence: 'estimated' as const, source: 'test' };
test('native backend renders measured boxes once with fixed padding and spacers', t => {
  const env = installScriptable(t);
  const root = parseLayout('column(padding: [4, 8, 6, 10], gap: 7, align: "end")[text("A", width: 60, height: 20), text("B", width: 80, height: 30)]');
  const rendered: Array<{ id: string; width: number; height: number }> = [];
  const item: PreparedItem = { state: 'ready', effects: { refreshAfterDate: new Date('2026-10-28') }, variants: [{ id: 'default', minWidth: 20, preferredWidth: 50, adaptationCost: 0, measure: () => ({ requiredHeight: 15, preferredHeight: 15, confidence: 'estimated' }) }], render(stack, placement) { rendered.push(placement); stack.addText(placement.id); } };
  const items: PreparedItems = new Map(root.children.map(node => [node.id, item]));
  const plan = planLayout(root, viewport, items);
  expect(plan.ok).toBe(true);
  if (!plan.ok) return;
  const widget = new env.Stack();
  renderLayout(widget, plan.tree, items);
  expect(rendered.map(x => [x.id, x.width, x.height])).toEqual([['0.0',60,20], ['0.1',80,30]]);
  expect(widget.padding).toEqual([0,0,0,0]);
  expect(widget.refreshAfterDate).toEqual(new Date('2026-10-28'));
  const spacers: number[] = [];
  const visit = (node: TestNode) => {
    if (node.type === 'spacer') { expect(node.length).toBeGreaterThan(0); spacers.push(node.length!); }
    if (node.type === 'stack' && node !== widget) { expect(node.size.width).toBeGreaterThan(0); expect(node.size.height).toBeGreaterThan(0); expect(node.padding).toEqual([0,0,0,0]); }
    node.children.forEach(visit);
  };
  visit(inspect(widget));
  expect(spacers).toEqual(expect.arrayContaining([10,8,4,6,7,122,102]));
});

test('viewport requires explicit dimensions and honors the selected preview family', () => {
  expect(() => resolveViewport({ large: '' }, { family: 'large' })).toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code: "VIEWPORT_UNKNOWN" }) }));
  expect(resolveViewport({ small: '150 x 150', large: '320 x 340' }, { family: 'small' })).toMatchObject({width:150,height:150});
  expect(resolveViewport({}, { family: 'medium', viewport: {width:300,height:140} })).toMatchObject({width:300,height:140});
  expect(() => resolveViewport({}, { family: 'small', viewport: {width:300,height:140} }, 'large')).toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code: "FAMILY_CONFLICT" }) }));
  expect(() => resolveViewport({}, {}, 'accessoryInline')).toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code: "FAMILY_UNSUPPORTED" }) }));
  expect(() => resolveViewport({ large: '320xNaN' }, {family:'large'})).toThrow(expect.objectContaining({ diagnostic: expect.objectContaining({ code: "VIEWPORT_INVALID" }) }));
});

test('padding-only frames never turn zero content dimensions into native auto sizing', t => {
  const env = installScriptable(t);
  const plan = planLayout(parseLayout('column[row(height: 10, padding: [5,0,5,0])[]]'), viewport, new Map());
  expect(plan.ok).toBe(true);
  if (!plan.ok) return;
  const widget = new env.Stack();
  renderLayout(widget, plan.tree, new Map());
  const visit = (node: TestNode) => {
    if (node.type === 'stack' && node !== widget) expect(node.size.width > 0 && node.size.height > 0).toBe(true);
    node.children.forEach(visit);
  };
  visit(widget);
});

test.each([
  ['row(align:"start",gap:0)[column(width:30)[],x]', 100,20,30,0],
  ['column(align:"start",gap:0)[row(height:30)[],x]',20,100,0,30],
] as const)('empty cross-axis frames preserve main-axis positions: %s', (source,width,height,x,y) => {
  const env = installScriptable();
  const ast = parseLayout(source);
  const item: PreparedItem = {state:'ready',effects:{},variants:[{id:'normal',minWidth:20,preferredWidth:20,adaptationCost:0,measure:()=>({requiredHeight:20,preferredHeight:20,confidence:'estimated'})}],render(stack) {stack.addText('X');}};
  const items = new Map([[ast.children[1]!.id,item]]);
  const plan = planLayout(ast, {...viewport,width,height},items);
  expect(plan.ok).toBe(true);
  if (!plan.ok) return;
  const widget = new env.Stack();
  renderLayout(widget,plan.tree,items);
  const positions: number[][] = [];
  function visit(node: TestNode,left: number,top: number): void {
    let cursor = 0;
    for (const child of node.children) {
      const horizontal = node.direction === 'horizontal';
      const childX = left + (horizontal ? cursor : 0);
      const childY = top + (horizontal ? 0 : cursor);
      if (child.type === 'text') positions.push([childX,childY]);
      visit(child,childX,childY);
      cursor += child.type === 'spacer' ? child.length! : horizontal ? child.size.width : child.size.height;
    }
  }
  visit(widget,0,0);
  expect(positions).toEqual([[x,y]]);
});
