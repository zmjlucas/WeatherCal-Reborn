import { describe, expect, it } from 'vitest';
import { LayoutError } from '#source/layout/errors';
import { parseLayout } from '#source/layout/parser';

function diagnostic(source: string) {
  try {
    parseLayout(source);
    throw new Error('Expected parsing to reject the layout');
  } catch (error) {
    expect(error).toBeInstanceOf(LayoutError);
    return (error as LayoutError).diagnostic;
  }
}

describe('parseLayout', () => {
  it('preserves recursive manual groups and distinguishes free from ordered regions', () => {
    const root = parseLayout('column(gap: 6)[date, row[flow[current, future], auto[rain, battery]]]');
    expect(root).toMatchObject({ type: 'column', id: '0', props: { gap: 6 } });
    expect(root.children[1]).toMatchObject({ type: 'row', id: '0.1' });
    expect(root.children[1]?.children).toMatchObject([
      { type: 'flow', id: '0.1.0', children: [{ name: 'current' }, { name: 'future' }] },
      { type: 'auto', id: '0.1.1', children: [{ name: 'rain' }, { name: 'battery' }] },
    ]);
  });

  it('keeps repeated module instances distinct and source IDs stable across whitespace', () => {
    const compact = parseLayout('row[current,current]');
    const spaced = parseLayout(' /* heading */ row [\n current, // second copy\n current,\n ]');
    expect(compact.children.map(node => node.id)).toEqual(['0.0', '0.1']);
    expect(spaced.children.map(node => node.id)).toEqual(['0.0', '0.1']);
    expect(spaced.children[1]?.source).toMatchObject({ line: 3, column: 2 });
  });

  it('decodes JSON strings while preserving punctuation and comment text inside strings', () => {
    const root = parseLayout(String.raw`text("Good morning, (Lucas) [1] // /* \"你好\"\n\u2600")`);
    expect(root.parameter).toBe('Good morning, (Lucas) [1] // /* "你好"\n☀');
  });

  it('separates layout properties from module options and preserves positional parameters', () => {
    const root = parseLayout('text("hello", width: 90, variant: "wide", textAlign: "end", prefix: "x", enabled: true, values: [1, false, ["a", 2.5]],)');
    expect(root.props).toEqual({ width: 90, variant: 'wide', textAlign: 'end' });
    expect(root.parameter).toBe('hello');
    expect(root.options).toEqual({ prefix: 'x', enabled: true, values: [1, false, ['a', 2.5]] });
  });

  it('normalizes scalar and four-sided padding without adding implicit properties', () => {
    const root = parseLayout('column(padding: 3)[current(padding: [1, 2, 3, 4])]');
    expect(root.props).toEqual({ padding: [3, 3, 3, 3] });
    expect(root.children[0]?.props).toEqual({ padding: [1, 2, 3, 4] });
    expect(parseLayout('date').props).toEqual({});
  });

  it('represents fixed and flexible spaces inside manual containers', () => {
    const root = parseLayout('row[space, space(4), space(0), space(grow: 2), battery]');
    expect(root.children.slice(0, 4)).toMatchObject([
      { type: 'space', props: {} },
      { type: 'space', length: 4, props: {} },
      { type: 'space', length: 0, props: {} },
      { type: 'space', props: { grow: 2 } },
    ]);
  });

  it('accepts empty manual containers, decimal exponents and zero minimums', () => {
    expect(parseLayout('row(width: 1.2e2, minWidth: 0, grow: 0)[]').props)
      .toEqual({ width: 120, minWidth: 0, grow: 0 });
    expect(parseLayout('column[]').children).toEqual([]);
  });

  it('retains unknown module names for registry validation without evaluating names', () => {
    expect(parseLayout('my_custom(option: "x")')).toMatchObject({
      type: 'item', name: 'my_custom', options: { option: 'x' },
    });
  });

  it('reports line, column and source path at a duplicate property', () => {
    const problem = diagnostic('column[\n  current(width: 20,\n    width: 30)\n]');
    expect(problem).toMatchObject({
      code: 'DUPLICATE_PROPERTY', nodeId: '0.0', source: { line: 3, column: 5 },
    });
  });

  it('reports the missing separator at the next node, including CRLF line endings', () => {
    expect(diagnostic('column[\r\n date\r\n current]')).toMatchObject({
      code: 'SYNTAX_ERROR', source: { line: 3, column: 2 },
    });
  });

  it.each([
    '', 'date, current', 'row', 'row(date)[]', 'column[date current]',
    'column[date,,current]', 'text(3)', 'text("a", "b")', 'date()',
    'current(width: 1 + 2)', 'current(enabled: null)', 'text("unterminated)',
    String.raw`text("bad\x20escape")`, 'text("line\nbreak")',
    'column[date] /* unfinished', 'column[/* nested /* */ */date]',
    'current(width: 1e309)', 'current(width: NaN)', 'current(width: Infinity)',
  ])('rejects malformed or nonliteral input: %s', source => {
    const problem = diagnostic(source);
    expect(problem.source?.line).toBeGreaterThanOrEqual(1);
    expect(problem.source?.column).toBeGreaterThanOrEqual(1);
  });

  it.each([
    'row(mystery: 2)[]', 'auto(align: "center")[date]',
    'flow(justify: "between")[date]', 'column(variant: "wide")[]',
    'current(gap: 8)', 'current(align: "center")', 'current(justify: "start")',
    'current(width: 0)', 'current(height: -2)', 'current(minWidth: -1)',
    'current(maxHeight: 0)', 'current(grow: -1)', 'column(gap: -1)[]',
    'current(width: "20")', 'current(padding: [1, 2])', 'current(padding: [1, -2, 3, 4])',
    'current(padding: true)', 'current(textAlign: "stretch")', 'current(variant: false)',
    'row(align: "wide")[]', 'column(justify: "stretch")[]',
    'current(minWidth: 30, maxWidth: 20)', 'current(minHeight: 30, maxHeight: 20)',
    'current(width: 20, minWidth: 30)', 'current(height: 30, maxHeight: 20)',
  ])('rejects invalid common attributes: %s', source => {
    expect(diagnostic(source).code).toBe('INVALID_PROPERTY');
  });

  it.each(['auto[]', 'flow[]', 'space', 'auto[space]', 'flow[space(4)]',
    'row[space(-1)]', 'row[space(width: 4)]', 'row[space(4, grow: 1)]'])
    ('rejects invalid automatic regions or spaces: %s', source => {
      expect(diagnostic(source).source).toBeDefined();
    });

  it.each([
    'row[current(width: 40, grow: 1)]', 'column[current(height: 40, grow: 1)]',
    'auto[current(grow: 0)]', 'flow[column(grow: 1)[current]]',
  ])('rejects ambiguous parent-axis growth: %s', source => {
    expect(diagnostic(source).code).toBe('INVALID_PROPERTY');
  });

  it('allows fixed dimensions with explicit zero growth and cross-axis growth', () => {
    expect(parseLayout('row[current(width: 40, grow: 0)]').children[0]?.props.grow).toBe(0);
    expect(parseLayout('row[current(height: 40, grow: 1)]').children[0]?.props.grow).toBe(1);
  });

  it('bounds node count while accepting the final allowed node', () => {
    expect(parseLayout(`row[${Array(127).fill('current').join(',')}]`).children).toHaveLength(127);
    expect(diagnostic(`row[${Array(128).fill('current').join(',')}]`).code).toBe('LAYOUT_LIMIT_EXCEEDED');
  });

  it('bounds recursive depth before JavaScript recursion can overflow', () => {
    expect(parseLayout(`${'row['.repeat(11)}date${']'.repeat(11)}`).type).toBe('row');
    expect(diagnostic(`${'row['.repeat(12)}date${']'.repeat(12)}`).code).toBe('LAYOUT_LIMIT_EXCEEDED');
  });

  it.each(['auto', 'flow'])('bounds %s direct children while allowing manual atomic groups', type => {
    expect(parseLayout(`${type}[${Array(12).fill('row[date,current]').join(',')}]`).children).toHaveLength(12);
    expect(diagnostic(`${type}[${Array(13).fill('date').join(',')}]`).code).toBe('LAYOUT_LIMIT_EXCEEDED');
  });
});
