import type { Diagnostic, ItemVariant, LayoutNode, Measurement, PlanResult, PlanningLimits, PreparedItems, ResolvedNode, Viewport } from './types';
import { structures, uniqueStructures } from './candidates';
import { presets } from './presets';
import { distribute, epsilon, mainGrow, paddingOf } from './geometry';
import type { Range } from './geometry';
import { place } from './placement';
import type { Candidate } from './placement';

/** Pure, bounded planning. Native text measurements remain explicitly estimated. */
export function planLayout(root: LayoutNode, viewport: Viewport, items: PreparedItems, overrides: Partial<PlanningLimits> = {}): PlanResult {
  const limits = { maxCandidates: 256, maxMeasurements: 4096, frontier: 24, ...overrides };
  let measurements = 0, candidates = 0, truncated = false, estimated = viewport.confidence === 'estimated';
  let activeItems = items;
  let mode: 'manual' | 'presets' | 'search' = 'manual', fontScale = 1, hardLimited = false;
  let remainingPhases = 1, hasAutomatic = false;
  const phaseLimits = new Map<string, number>();
  const phaseCounts = new Map<string, number>();
  const adaptable = new Set<string>();
  const measured = new Map<string, Measurement>();
  const solved = new Map<string, Candidate[]>();
  const counts = new Map<string, number>();
  const spaceAxes = new Map<string, 'row' | 'column'>();
  const diagnostics: Diagnostic[] = [];
  const stop = {};
  function fail(code: string, message: string, node = root): never {
    const diagnostic: Diagnostic = { code, message };
    if (node && typeof node.id === 'string') diagnostic.nodeId = node.id;
    if (node?.source && typeof node.source.line === 'number' && typeof node.source.column === 'number') diagnostic.source = node.source;
    diagnostics.push(diagnostic);
    throw stop;
  }
  function variants(node: LayoutNode): readonly ItemVariant[] {
    const prepared = activeItems.get(node.id);
    if (!prepared || !Array.isArray(prepared.variants) || !prepared.variants.length) fail('ITEM_CONTRACT_INVALID', `No prepared variants for ${node.name}.`, node);
    const ids = new Set<string>();
    for (const v of prepared.variants) {
      if (!v || typeof v.id !== 'string' || !v.id || ids.has(v.id) ||
          ![v.minWidth, v.preferredWidth, v.adaptationCost].every(n => Number.isFinite(n) && n >= 0) || v.preferredWidth < v.minWidth ||
          (v.maxWidth !== undefined && (!Number.isFinite(v.maxWidth) || v.maxWidth < v.preferredWidth)) || typeof v.measure !== 'function') {
        fail('ITEM_CONTRACT_INVALID', `Invalid variant dimensions for ${node.name}.`, node);
      }
      ids.add(v.id);
    }
    const result = prepared.variants.filter(v => node.props.variant === undefined || node.props.variant === v.id);
    if (!result.length) fail('UNKNOWN_VARIANT', `Unknown ${node.name} variant: ${node.props.variant}.`, node);
    return result;
  }
  function measure(node: LayoutNode, variant: ItemVariant, width: number): Measurement | undefined {
    const key = `${node.id}:${variant.id}:${width}:${adaptable.has(node.id) ? fontScale : 1}`;
    const cached = measured.get(key);
    if (cached) return cached;
    if (measurements >= limits.maxMeasurements) { hardLimited = truncated = true; return; }
    measurements++;
    let value: Measurement;
    try { value = variant.measure(width); }
    catch { fail('ITEM_CONTRACT_INVALID', `Measuring ${node.name} failed.`, node); }
    if (!value || ![value.requiredHeight, value.preferredHeight].every(n => Number.isFinite(n) && n >= 0) ||
        value.preferredHeight < value.requiredHeight || !['calibrated', 'estimated'].includes(value.confidence)) {
      fail('ITEM_CONTRACT_INVALID', `Invalid height estimate for ${node.name}.`, node);
    }
    if (value.confidence === 'estimated') estimated = true;
    measured.set(key, value);
    return value;
  }
  function widthRange(node: LayoutNode, selected?: ItemVariant): Range {
    const [, right, , left] = paddingOf(node);
    const pad = left + right;
    let min = 0, preferred = 0, max = Infinity;
    if (node.type === 'item') {
      const list = selected ? [selected] : variants(node);
      min = Math.min(...list.map(v => v.minWidth));
      const cost = Math.min(...list.map(v => v.adaptationCost));
      preferred = Math.min(...list.filter(v => v.adaptationCost === cost).map(v => v.preferredWidth));
      max = Math.max(...list.map(v => v.maxWidth ?? Infinity));
    } else if (node.type === 'space') {
      if (spaceAxes.get(node.id) === 'row') {
        min = preferred = node.length ?? 0;
        if (node.length !== undefined) max = node.length;
      }
    } else if (node.children.length) {
      const ranges = node.children.map(child => widthRange(child));
      const gap = (node.props.gap ?? 8) * (ranges.length - 1);
      min = node.type === 'row' ? ranges.reduce((sum, r) => sum + r.min, gap) : Math.max(...ranges.map(r => r.min));
      preferred = node.type === 'row' ? ranges.reduce((sum, r) => sum + r.preferred, gap) : Math.max(...ranges.map(r => r.preferred));
    }
    min = Math.max(min + pad, node.props.minWidth ?? 0);
    preferred = Math.max(min, preferred + pad);
    max = Math.min(max + pad, node.props.maxWidth ?? Infinity);
    if (node.props.width !== undefined) { min = Math.max(min, node.props.width); preferred = max = Math.min(max, node.props.width); }
    return { min, preferred, max, grow: mainGrow(node, 'row') };
  }
  function widthOptions(node: LayoutNode): Range[] {
    const options = node.type === 'item'
      ? [...variants(node)].sort((a, b) => a.adaptationCost - b.adaptationCost || a.preferredWidth - b.preferredWidth || a.id.localeCompare(b.id))
        .map(variant => widthRange(node, variant))
      : [];
    options.push(widthRange(node));
    const seen = new Set<string>();
    return options.filter(range => {
      const key = `${range.min}:${range.preferred}:${range.max}`;
      if (range.min > range.max + epsilon || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  function prune(list: Candidate[]): Candidate[] {
    const sorted = list.sort((a, b) => a.minHeight - b.minHeight || a.cost - b.cost || a.deviation - b.deviation || a.signature.localeCompare(b.signature));
    const seen = new Set<string>();
    const result = sorted.filter(c => {
      const key = `${c.minHeight}:${c.cost}:${c.deviation}:${c.signature}`;
      if (seen.has(key)) return false;
      seen.add(key); return true;
    });
    if (result.length <= limits.frontier) return result;
    truncated = true;
    // Keep both small candidates and visually preferred candidates in the frontier.
    const quality = [...result].sort((a, b) => a.cost - b.cost || a.deviation - b.deviation || a.minHeight - b.minHeight);
    return [...new Set([...result.slice(0, Math.ceil(limits.frontier / 2)), ...quality.slice(0, Math.floor(limits.frontier / 2))])];
  }
  function finish(node: LayoutNode, candidate: Candidate): Candidate | undefined {
    const fixed = node.props.height;
    const min = Math.max(candidate.minHeight, node.props.minHeight ?? 0);
    const max = Math.min(candidate.maxHeight, node.props.maxHeight ?? Infinity, fixed ?? Infinity);
    if (min > max + epsilon) return;
    return { ...candidate, minHeight: fixed ?? min,
      preferredHeight: fixed ?? Math.min(max, Math.max(min, candidate.preferredHeight)), maxHeight: max };
  }
  function heightDeviation(candidate: Candidate, placed: ResolvedNode): number {
    return candidate.type === 'item'
      ? Math.abs(placed.box.height - candidate.preferredHeight) / Math.max(1, candidate.preferredHeight)
      : candidate.children.reduce((sum, child, index) => sum + heightDeviation(child, placed.children[index]!), 0);
  }
  function solve(node: LayoutNode, width: number): Candidate[] {
    const memoKey = `${node.id}:${node.name}:${node.type}:${node.children.map(n => n.id).join(',')}:${width}`;
    const memo = solved.get(memoKey);
    if (memo) return memo;
    const range = widthRange(node);
    if (width < range.min - epsilon || width > range.max + epsilon || !Number.isFinite(width)) return [];
    const [top, right, bottom, left] = paddingOf(node);
    const inner = width - left - right;
    const base: Candidate = { node, type: 'item', width, minHeight: 0, preferredHeight: 0, maxHeight: Infinity,
      children: [], cost: 0, deviation: 0, area: 0, count: 1, signature: node.id,
      ...(fontScale < 1 && adaptable.has(node.id) ? {fontScale} : {}) };
    let result: Candidate[] = [];
    if (node.type === 'item') {
      if (inner <= 0) return [];
      for (const v of variants(node)) {
        if (inner < v.minWidth - epsilon || inner > (v.maxWidth ?? Infinity) + epsilon) continue;
        const m = measure(node, v, inner);
        if (!m || m.requiredHeight <= 0) continue;
        const c = finish(node, { ...base, variant: v.id, minHeight: m.requiredHeight + top + bottom,
          preferredHeight: m.preferredHeight + top + bottom, cost: v.adaptationCost,
          deviation: Math.abs(inner - v.preferredWidth) / Math.max(1, v.preferredWidth), area: inner * m.requiredHeight, signature: `${node.id}:${v.id}` });
        if (c) result.push(c);
      }
    } else if (node.type === 'space') {
      const length = spaceAxes.get(node.id) === 'column' ? node.length : undefined;
      const c = finish(node, { ...base, type: 'space', minHeight: length ?? 0, preferredHeight: length ?? 0, maxHeight: length ?? Infinity });
      if (c) result.push(c);
    } else if (node.type === 'auto' || node.type === 'flow') {
      const areas = new Map(node.children.map(n => {
        const range = widthRange(n);
        const preferredWidth = Math.min(range.max, range.preferred);
        const preferred = [...solve(n, preferredWidth)].sort((a, b) => a.cost - b.cost || a.deviation - b.deviation ||
          a.preferredHeight - b.preferredHeight || a.signature.localeCompare(b.signature))[0];
        return [n.id, preferred ? Math.min(Number.MAX_VALUE, preferredWidth * preferred.preferredHeight) : 0] as const;
      }));
      const family = viewport.family ?? (viewport.width > viewport.height * 1.5 ? 'medium' : viewport.width <= 200 ? 'small' : 'large');
      const preferred = presets(node, family);
      const proposed = mode === 'presets' ? preferred
        : uniqueStructures(preferred, structures(node, n => widthRange(n).min, n => areas.get(n.id) ?? 0));
      for (const structure of proposed) {
        const count = counts.get(node.id) ?? 0;
        if (count >= limits.maxCandidates) { hardLimited = truncated = true; break; }
        const phaseCount = phaseCounts.get(node.id) ?? 0;
        // Preserve a substantial original-font search regardless of adapter
        // availability. Later stages share whatever earlier stages did not use.
        const phaseLimit = phaseLimits.get(node.id) ?? Math.max(1, fontScale === 1
          ? mode === 'presets' ? Math.min(32, Math.ceil(limits.maxCandidates / 8)) : Math.ceil(limits.maxCandidates / 2)
          : Math.ceil((limits.maxCandidates - count) / remainingPhases));
        phaseLimits.set(node.id, phaseLimit);
        if (phaseCount >= phaseLimit) { truncated = true; break; }
        phaseCounts.set(node.id, phaseCount + 1);
        counts.set(node.id, count + 1); candidates++;
        for (const c of solve(structure, width)) result.push({ ...c, node });
      }
    } else {
      const row = node.type === 'row';
      const gap = (node.props.gap ?? 8) * Math.max(0, node.children.length - 1);
      const automatic = node.name.startsWith('$');
      let widthSets: number[][] = [];
      if (row) {
        let rangeSets: Range[][] = [[]];
        for (const child of node.children) {
          const options = widthOptions(child);
          const next = rangeSets.flatMap(existing => options.map(option => [...existing, option]));
          if (next.length <= limits.frontier) rangeSets = next;
          else {
            truncated = true;
            const smallest = [...next].sort((a, b) => a.reduce((sum, r) => sum + r.min, 0) - b.reduce((sum, r) => sum + r.min, 0));
            const retained = new Set([...next.slice(0, Math.ceil(limits.frontier / 2)), ...smallest.slice(0, Math.floor(limits.frontier / 2))]);
            for (const option of next) {
              if (retained.size === limits.frontier) break;
              retained.add(option);
            }
            rangeSets = [...retained];
          }
        }
        for (const ranges of rangeSets) {
          const natural = distribute(ranges.map(r => ({ ...r, grow: automatic ? 1 : r.grow })), inner - gap);
          if (natural) widthSets.push(natural);
          if (automatic && node.children.length) {
            for (const mode of ['equal', 'minimum'] as const) {
              const distributed = distribute(ranges.map(r => ({ ...r,
                preferred: mode === 'equal' ? (inner - gap) / ranges.length : r.min,
                grow: mode === 'equal' ? 1 : Math.max(1, r.preferred) })), inner - gap);
              if (distributed) widthSets.push(distributed);
            }
          }
        }
        widthSets = [...new Map(widthSets.map(widths => [widths.join(','), widths])).values()];
      } else {
        widthSets = [[]];
      }
      for (const widths of widthSets) {
        let combinations: Candidate[][] = [[]];
        for (let i = 0; i < node.children.length; i++) {
          const child = node.children[i]!;
          const proposals = row ? [widths[i]!] : widthOptions(child).map(range =>
            Math.min(range.max, (node.props.align ?? 'stretch') === 'stretch' ? inner : Math.min(inner, range.preferred)));
          const choices = prune([...new Set(proposals)].flatMap(proposal => solve(child, proposal)));
          const next = combinations.flatMap(existing => choices.map(choice => [...existing, choice]));
          const ranked = next.map(children => ({ children,
            height: row ? Math.max(0, ...children.map(c => c.minHeight)) : children.reduce((sum, c) => sum + c.minHeight, 0),
            cost: children.reduce((sum, c) => sum + c.cost, 0),
            deviation: children.reduce((sum, c) => sum + c.deviation, 0),
            signature: children.map(c => c.signature).join(','),
          })).sort((a, b) => a.height - b.height || a.cost - b.cost || a.deviation - b.deviation || a.signature.localeCompare(b.signature));
          if (ranked.length <= limits.frontier) combinations = ranked.map(c => c.children);
          else {
            truncated = true;
            const quality = [...ranked].sort((a, b) => a.cost - b.cost || a.deviation - b.deviation || a.height - b.height || a.signature.localeCompare(b.signature));
            const retained = new Set([...ranked.slice(0, Math.ceil(limits.frontier / 2)), ...quality.slice(0, Math.floor(limits.frontier / 2))]);
            for (const choice of ranked) {
              if (retained.size === limits.frontier) break;
              retained.add(choice);
            }
            combinations = [...retained].map(c => c.children);
          }
          if (!combinations.length) break;
        }
        for (const children of combinations) {
          const height = (ideal: boolean) => (row ? Math.max(0, ...children.map(c => ideal ? c.preferredHeight : c.minHeight))
            : children.reduce((sum, c) => sum + (ideal ? c.preferredHeight : c.minHeight), gap)) + top + bottom;
          const c = finish(node, { ...base, type: node.type, children, minHeight: height(false), preferredHeight: height(true),
            cost: children.reduce((s, c) => s + c.cost, 0), deviation: children.reduce((s, c) => s + c.deviation, 0),
            area: children.reduce((s, c) => s + c.area, 0), count: children.reduce((s, c) => s + c.count, 1),
            signature: `${node.type}(${children.map(c => c.signature).join(',')})` });
          if (c) result.push(c);
        }
      }
    }
    result = prune(result);
    solved.set(memoKey, result);
    return result;
  }
  try {
    if (![viewport.width, viewport.height].every(n => Number.isFinite(n) && n > 0)) fail('VIEWPORT_UNKNOWN', 'A positive finite viewport is required.');
    if (!Object.values(limits).every(n => Number.isInteger(n) && n > 0)) fail('INVALID_LIMITS', 'Planning budgets must be positive integers.');
    const pending: { node: LayoutNode; parent?: LayoutNode; depth: number; automaticScope?: boolean }[] = [{ node: root, depth: 1 }];
    const ids = new Set<string>();
    while (pending.length) {
      const { node, parent, depth, automaticScope } = pending.pop()!;
      if (!node || typeof node !== 'object' || typeof node.id !== 'string' || !node.id || typeof node.name !== 'string' ||
          !['row', 'column', 'auto', 'flow', 'item', 'space'].includes(node.type) || !Array.isArray(node.children) ||
          !node.props || typeof node.props !== 'object' || Array.isArray(node.props)) {
        fail('INVALID_LAYOUT', 'Every layout node needs a type, unique ID, name, property object and child array.', node);
      }
      if (ids.has(node.id)) fail('INVALID_LAYOUT', 'Layout nodes must have distinct IDs and cannot form cycles.', node);
      ids.add(node.id);
      if (depth > 12 || ids.size > 128) fail('INVALID_LAYOUT', 'Use at most 128 nodes and 12 layout levels.', node);
      const automatic = node.type === 'auto' || node.type === 'flow';
      hasAutomatic ||= automatic;
      if (node.type === 'item' && automaticScope && items.get(node.id)?.atFontScale) adaptable.add(node.id);
      if ((automatic && (!node.children.length || node.children.length > 12)) ||
          ((node.type === 'item' || node.type === 'space') && node.children.length)) {
        fail('INVALID_LAYOUT', 'Automatic containers need 1–12 children; items and spaces cannot contain children.', node);
      }
      for (const key of ['width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight', 'grow', 'gap'] as const) {
        const value = node.props[key];
        if (value !== undefined && (!Number.isFinite(value) || value < 0 || (['width', 'height', 'maxWidth', 'maxHeight'].includes(key) && value === 0))) {
          fail('INVALID_LAYOUT', `${key} must be a finite valid dimension or weight.`, node);
        }
      }
      const padding = node.props.padding;
      if (padding !== undefined && (!Array.isArray(padding) || padding.length !== 4 || padding.some(edge => !Number.isFinite(edge) || edge < 0))) {
        fail('INVALID_LAYOUT', 'Padding requires four finite nonnegative edges.', node);
      }
      if (node.type === 'space') {
        if (!parent || (parent.type !== 'row' && parent.type !== 'column') ||
            (node.length !== undefined && (!Number.isFinite(node.length) || node.length < 0))) {
          fail('INVALID_LAYOUT', 'Spaces require a manual parent and a nonnegative finite length.', node);
        }
        spaceAxes.set(node.id, parent.type);
      }
      for (let i = node.children.length - 1; i >= 0; i--) pending.push({ node: node.children[i]!, parent: node, depth: depth + 1, automaticScope: automaticScope || automatic });
    }
    if ((root.props.width !== undefined && root.props.width !== viewport.width) || (root.props.height !== undefined && root.props.height !== viewport.height)) {
      fail('CONSTRAINT_CONFLICT', 'The root frame must match the viewport.');
    }
    const scales = adaptable.size ? [1, 0.9, 0.8, 0.7] : [1];
    const modes = hasAutomatic ? ['presets', 'search'] as const : ['manual'] as const;
    let phaseIndex = 0;
    for (const scale of scales) {
      fontScale = scale;
      if (scale < 1) {
        const scaled = new Map(items);
        for (const id of adaptable) {
          let item;
          try { item = items.get(id)!.atFontScale!(scale); }
          catch { fail('ITEM_CONTRACT_INVALID', `Font adaptation failed for ${id}.`); }
          if (!item || typeof item.render !== 'function') fail('ITEM_CONTRACT_INVALID', `Font adaptation returned an invalid item for ${id}.`);
          scaled.set(id, item);
        }
        activeItems = scaled;
      }
      for (const strategy of modes) {
        mode = strategy;
        remainingPhases = scales.length * modes.length - phaseIndex++;
        phaseCounts.clear(); phaseLimits.clear(); solved.clear();
        const choices = solve(root, viewport.width)
          .filter(c => c.minHeight <= viewport.height + epsilon && c.maxHeight >= viewport.height - epsilon)
          .map(candidate => {
            const tree = place(candidate, { x: 0, y: 0, width: viewport.width, height: viewport.height });
            return { candidate, tree, deviation: candidate.deviation + heightDeviation(candidate, tree) };
          });
        choices.sort((a, b) => a.candidate.cost - b.candidate.cost || a.deviation - b.deviation || b.candidate.area - a.candidate.area ||
          a.candidate.count - b.candidate.count || a.candidate.signature.localeCompare(b.candidate.signature));
        const selected = choices[0];
        if (!selected) continue;
        if (truncated) diagnostics.push({ code: 'SEARCH_TRUNCATED', message: 'Selected a complete layout from a bounded candidate frontier.' });
        if (scale < 1) diagnostics.push({code:'FONT_ADAPTED', message:`Automatic content uses ${Math.round(scale * 100)}% font sizes, with a 10pt lower bound for larger text.`});
        return { ok: true, tree: selected.tree, diagnostics,
          confidence: estimated ? 'estimated' : 'calibrated', measurements, candidates, strategy, fontScale: scale };
      }
    }
    fail(hardLimited ? 'SEARCH_LIMIT_REACHED' : 'NO_CANDIDATE_FITS', hardLimited
      ? 'Search budget reached before finding a complete layout.'
      : 'No preset or searched layout fits all selected content at readable sizes. Reduce content, padding or gaps, or use a larger widget.');
  } catch (error) {
    if (error !== stop) throw error;
    return { ok: false, diagnostics, measurements, candidates };
  }
}
