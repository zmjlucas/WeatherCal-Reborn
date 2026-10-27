import type { LayoutNode } from './types';

/** Slicing layouts only: every candidate can be rendered as native nested stacks. */
export function* structures(node: LayoutNode, widthHint: (node: LayoutNode) => number, preferredAreaHint: (node: LayoutNode) => number): Generator<LayoutNode> {
  const gap = node.props.gap ?? 8;
  let sequence = 0;
  const seen = new Set<string>();
  const orders = [node.children];
  if (node.type === 'auto') {
    // Evaluate in source order, so budget use never depends on sort's comparison order.
    const hints = node.children.map(child => ({ child, width: widthHint(child), area: preferredAreaHint(child) }));
    orders.push([...hints].sort((a, b) => b.width - a.width || a.child.id.localeCompare(b.child.id)).map(hint => hint.child));
    orders.push([...hints].sort((a, b) => b.area - a.area || a.child.id.localeCompare(b.child.id)).map(hint => hint.child));
  }
  for (const order of orders) {
    const signature = order.map(n => n.id).join(',');
    if (seen.has(signature)) continue;
    seen.add(signature);
    for (const columns of [1, order.length, 2, 3]) {
      if (columns > order.length || columns < 1) continue;
      const rows: LayoutNode[] = [];
      for (let i = 0; i < order.length; i += columns) {
        const children = order.slice(i, i + columns);
        rows.push(children.length === 1 ? children[0]! : {
          ...node, type: 'row', name: '$row', id: `${node.id}~${sequence}:${i}`,
          props: { gap }, options: {}, children,
        });
      }
      yield rows.length === 1 && rows[0]!.name === '$row'
        ? { ...rows[0]!, id: node.id, props: node.props }
        : { ...node, type: 'column', name: '$column', children: rows };
      sequence++;
    }
    if (order.length < 3) continue;
    const bands = node.type === 'flow' ? [0, order.length - 1] : order.map((_, index) => index);
    for (const band of bands) {
      const rest = order.filter((_, index) => index !== band);
      for (const columns of [rest.length, 2, 3]) {
        if (columns > rest.length) continue;
        const rows: LayoutNode[] = [];
        for (let i = 0; i < rest.length; i += columns) {
          rows.push({ ...node, type: 'row', name: '$row', id: `${node.id}~${sequence}:${i}`,
            props: { gap }, options: {}, children: rest.slice(i, i + columns) });
        }
        for (const end of node.type === 'flow' ? [band !== 0] : [false, true]) {
          yield { ...node, type: 'column', name: '$column', children: end ? [...rows, order[band]!] : [order[band]!, ...rows] };
        }
        sequence++;
      }
    }
  }
}
