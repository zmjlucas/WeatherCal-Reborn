import type { Box, LayoutNode, ResolvedNode, TextAlignment } from './types';
import { distribute, mainGrow, paddingOf } from './geometry';

export interface Candidate {
  node: LayoutNode; type: ResolvedNode['type']; width: number;
  minHeight: number; preferredHeight: number; maxHeight: number;
  children: Candidate[]; cost: number; deviation: number; area: number; count: number;
  signature: string; variant?: string;
}

/** Final placement changes blank space only, never the selected content or topology. */
export function place(candidate: Candidate, box: Box, inherited: TextAlignment = 'start'): ResolvedNode {
  const { node } = candidate;
  const [top, right, bottom, left] = paddingOf(node);
  const contentBox = { x: box.x + left, y: box.y + top, width: box.width - left - right, height: box.height - top - bottom };
  const textAlign = node.props.textAlign ?? inherited;
  const result: ResolvedNode = { type: candidate.type, id: node.id, name: node.name, box, contentBox, textAlign, children: [] };
  if (candidate.variant !== undefined) result.variant = candidate.variant;
  if (!candidate.children.length) return result;
  const row = candidate.type === 'row';
  const gap = node.props.gap ?? 8;
  const available = (row ? contentBox.width : contentBox.height) - gap * (candidate.children.length - 1);
  const lengths = row ? candidate.children.map(c => c.width) : distribute(candidate.children.map(c => ({
    min: c.minHeight, preferred: c.preferredHeight, max: c.maxHeight, grow: mainGrow(c.node, 'column'),
  })), available);
  if (!lengths) throw new Error('Selected layout no longer fits its allocated frame.');
  const unused = Math.max(0, available - lengths.reduce((a, b) => a + b, 0));
  const justify = node.props.justify ?? 'start';
  const extraGap = justify === 'between' && lengths.length > 1 ? unused / (lengths.length - 1) : 0;
  let cursor = (row ? contentBox.x : contentBox.y) + (justify === 'center' ? unused / 2 : justify === 'end' ? unused : 0);
  const align = node.props.align ?? 'stretch';
  for (let i = 0; i < candidate.children.length; i++) {
    const child = candidate.children[i]!;
    const crossAvailable = row ? contentBox.height : contentBox.width;
    const cross = row ? Math.min(child.maxHeight, crossAvailable, align === 'stretch' ? crossAvailable : child.preferredHeight) : child.width;
    const offset = align === 'end' ? crossAvailable - cross : align === 'center' ? (crossAvailable - cross) / 2 : 0;
    const childBox = row
      ? { x: cursor, y: contentBox.y + offset, width: lengths[i]!, height: cross }
      : { x: contentBox.x + offset, y: cursor, width: cross, height: lengths[i]! };
    result.children.push(place(child, childBox, textAlign));
    cursor += lengths[i]! + gap + extraGap;
  }
  return result;
}
