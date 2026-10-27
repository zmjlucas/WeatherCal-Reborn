import type { PreparedItems, ResolvedNode } from './types';

/** Fixed frame stacks and fixed spacers are the sole owners of outer geometry.
 * Coordinates are absolute in the plan, converted here into local offsets. */
export function renderLayout(widget: ListWidget, tree: ResolvedNode, items: PreparedItems): void {
  widget.spacing = 0;
  widget.setPadding(0, 0, 0, 0);
  function frame(parent: WidgetStack | ListWidget, width: number, height: number, horizontal: boolean): WidgetStack {
    const stack = parent.addStack();
    stack.size = new Size(width, height);
    stack.spacing = 0;
    stack.setPadding(0, 0, 0, 0);
    if (horizontal) stack.layoutHorizontally();
    else stack.layoutVertically();
    return stack;
  }
  function spacer(stack: WidgetStack, length: number): void {
    if (length > 1e-6) stack.addSpacer(length);
  }
  function render(parent: WidgetStack | ListWidget, node: ResolvedNode): void {
    const { box, contentBox: content } = node;
    // Zero-area spaces have no native representation: Size(0, 0) means auto.
    if (box.width <= 0 || box.height <= 0) return;
    const outer = frame(parent, box.width, box.height, true);
    if (node.type === 'space' || content.width <= 0 || content.height <= 0) return;
    spacer(outer, content.x - box.x);
    const middle = frame(outer, content.width, box.height, false);
    spacer(middle, content.y - box.y);
    const body = frame(middle, content.width, content.height, node.type === 'row');
    if (node.type === 'item') {
      const original = items.get(node.id);
      const item = node.fontScale === undefined ? original : original?.atFontScale?.(node.fontScale);
      if (!item || !node.variant) throw new Error(`Missing prepared item or variant: ${node.id}`);
      item.render(body, { id: node.id, variant: node.variant, width: content.width, height: content.height, textAlign: node.textAlign });
    } else {
      const horizontal = node.type === 'row';
      let cursor = horizontal ? content.x : content.y;
      for (const child of node.children) {
        const start = horizontal ? child.box.x : child.box.y;
        spacer(body, start - cursor);
        if (child.box.width > 0 && child.box.height > 0) {
          const slot = frame(body, horizontal ? child.box.width : content.width, horizontal ? content.height : child.box.height, !horizontal);
          const offset = horizontal ? child.box.y - content.y : child.box.x - content.x;
          spacer(slot, offset);
          render(slot, child);
          spacer(slot, (horizontal ? content.height - child.box.height : content.width - child.box.width) - offset);
        } else {
          // A zero cross-axis frame still reserves its planned main-axis extent.
          spacer(body, horizontal ? child.box.width : child.box.height);
        }
        cursor = start + (horizontal ? child.box.width : child.box.height);
      }
      spacer(body, (horizontal ? content.x + content.width : content.y + content.height) - cursor);
    }
    spacer(middle, box.y + box.height - content.y - content.height);
    spacer(outer, box.x + box.width - content.x - content.width);
  }
  render(widget, tree);
  for (const item of items.values()) {
    const date = item.effects.refreshAfterDate;
    if (date && (!widget.refreshAfterDate || date < widget.refreshAfterDate)) widget.refreshAfterDate = date;
  }
}
