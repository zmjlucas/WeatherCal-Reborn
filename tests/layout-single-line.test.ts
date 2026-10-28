import { expect, test } from 'vitest';
import { intrinsic, measurePresentation } from '#source/items/presentation/geometry';
import { PresentationNode } from '#source/items/presentation/recording';
import { prepareBuiltin } from '#source/items/presentation/builtins';
import { prepareItems } from '#source/items/registry';
import { parseLayout } from '#source/layout/parser';
import { planLayout } from '#source/layout/planner';
import { renderLayout } from '#source/layout/renderer';
import { initializedContext } from './helpers/context';
import { descendants, installScriptable, mockColor, mockEvent, texts } from './helpers/scriptable';

const title = 'A moderately long meeting title with several normal words';
const location = 'A conference room with several normal words in its location';

test('single-line text keeps its natural preference but can fit a narrow native truncation frame', () => {
  const node = new PresentationNode('text', title);
  node.fontSize = 14;
  node.lineLimit = 1;
  expect(intrinsic(node).preferred).toBeCloseTo(495.08);
  expect(intrinsic(node).min).toBeLessThan(158);
  expect(measurePresentation(node, 100)).toBeCloseTo(20.9);
  expect(measurePresentation(node, 600)).toBeCloseTo(20.9);
});

for (const [family, width] of [['small', 158], ['medium', 338]] as const) {
  for (const layout of ['events', 'row(gap: 4)[events, text("Side")]']) {
    test(`three long calendar titles and locations fit ${family}: ${layout}`, async t => {
      const env = installScriptable(t);
      const host = await initializedContext(env);
      host.now = new Date(2026, 9, 28, 12);
      host.padding = 1;
      host.settings.events.showLocation = true;
      host.settings.events.showCalendarColor = 'none';
      host.format.eventTitle = { size: '14' };
      host.format.eventLocation = { size: '12' };
      host.data.events = [1, 2, 3].map(index => mockEvent({
        title: `${title} ${index}`, location, startDate: host.now, isAllDay: true,
        calendar: { color: mockColor('123456') },
      }));
      const entry = await prepareBuiltin('events', host, {});
      expect(entry.state).toBe('ready');
      const ast = parseLayout(layout);
      const items = await prepareItems(ast, host);
      const plan = planLayout(ast, { family, width, height: 158, confidence: 'estimated', source: 'test' }, items);
      expect(plan.ok, JSON.stringify(plan.diagnostics)).toBe(true);
      if (!plan.ok) return;
      expect(entry.variants[0]!.minWidth).toBeLessThan(158);
      expect(entry.variants[0]!.preferredWidth).toBeGreaterThan(300);
      const target = new env.Stack();
      renderLayout(target, plan.tree, items);
      for (const index of [1, 2, 3]) expect(texts(target)).toContain(`${title} ${index}`);
      const lines = descendants(target).filter(node => node.type === 'text' && (node.text.startsWith(title) || node.text === location));
      expect(lines).toHaveLength(6);
      expect(lines.every(node => node.lineLimit === 1)).toBe(true);
      expect(descendants(target).every(node => node.size.width <= width)).toBe(true);
    });
  }
}
