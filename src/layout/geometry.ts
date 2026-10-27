import type { Insets, LayoutNode } from './types';

export interface Range { min: number; preferred: number; max: number; grow: number }
export const epsilon = 0.000001;
export const paddingOf = (node: LayoutNode): Insets => node.props.padding ?? [0, 0, 0, 0];

/** Restore natural sizes first; shrink only available slack, then distribute surplus. */
export function distribute(ranges: readonly Range[], available: number): number[] | undefined {
  if (available < -epsilon || ranges.some(r => r.min > r.max + epsilon)) return;
  const result = ranges.map(r => Math.max(r.min, Math.min(r.max, r.preferred)));
  const minimum = ranges.reduce((sum, r) => sum + r.min, 0);
  if (minimum > available + epsilon) return;
  let balance = available - result.reduce((a, b) => a + b, 0);
  if (balance < 0) {
    const slack = result.reduce((sum, size, i) => sum + size - ranges[i]!.min, 0);
    if (slack === 0) return result;
    return result.map((size, i) => size + balance * (size - ranges[i]!.min) / slack);
  }
  let eligible = ranges.map((r, i) => r.grow > 0 && result[i]! < r.max - epsilon ? i : -1).filter(i => i >= 0);
  while (balance > epsilon && eligible.length) {
    const totalWeight = eligible.reduce((sum, i) => sum + ranges[i]!.grow, 0);
    let used = 0;
    for (const i of eligible) {
      const addition = Math.min(balance * ranges[i]!.grow / totalWeight, ranges[i]!.max - result[i]!);
      result[i] = result[i]! + addition;
      used += addition;
    }
    balance -= used;
    eligible = eligible.filter(i => result[i]! < ranges[i]!.max - epsilon);
    if (used < epsilon) break;
  }
  return result;
}

export function mainGrow(node: LayoutNode, axis: 'row' | 'column'): number {
  if ((axis === 'row' ? node.props.width : node.props.height) !== undefined) return 0;
  if (node.type === 'space' && node.length !== undefined) return 0;
  return node.props.grow ?? (['auto', 'flow', 'space'].includes(node.type) ? 1 : 0);
}
