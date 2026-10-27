import type { LayoutNode, WidgetFamily } from './types';
import { uniqueStructures } from './candidates';

/** Family preferences choose topology only. Actual item measurements choose sizes. */
export function presets(node: LayoutNode, family: WidgetFamily): Generator<LayoutNode> {
  let sequence = 0;
  const gap = node.props.gap ?? 8;
  function group(type: 'row' | 'column', children: LayoutNode[], root = false): LayoutNode {
    return { ...node, type, name: '$preset', id: root ? node.id : `${node.id}~preset${sequence++}`,
      props: root ? node.props : {gap}, options: {}, children };
  }
  function* proposals(): Generator<LayoutNode> {
    const children = node.children;
    const orders = [children];
    // Small sets can afford all permutations. Larger sets leave ordering search
    // to the general width/area heuristics instead of factorial enumeration.
    if (node.type === 'auto' && children.length <= 3) {
      for (let i = 0; i < children.length; i++) {
        const rotated = [...children.slice(i), ...children.slice(0, i)];
        orders.push(rotated, [...rotated].reverse());
      }
    }
    const patterns = family === 'small' ? ['side', 'column', 'band', 'row', 'grid']
      : family === 'medium' ? ['row', 'side', 'band', 'grid', 'column']
      : ['column', 'band', 'grid', 'side', 'row'];
    for (const pattern of patterns) for (const order of orders) {
      if (pattern === 'row' || pattern === 'column') yield group(pattern, order, true);
      else if (pattern === 'grid' && order.length > 2) {
        const rows: LayoutNode[] = [];
        for (let i = 0; i < order.length; i += 2) {
          const pair = order.slice(i, i + 2);
          rows.push(pair.length === 1 ? pair[0]! : group('row', pair));
        }
        yield group('column', rows, true);
      } else if (order.length >= 3) {
        yield pattern === 'side'
          ? group('row', [order[0]!, group('column', order.slice(1))], true)
          : group('column', [order[0]!, group('row', order.slice(1))], true);
      }
    }
  }
  return uniqueStructures(proposals());
}
