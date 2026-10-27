import { LayoutError } from './errors';
import { LayoutLexer } from './lexer';
import type { Token } from './lexer';
import type { Insets, LayoutNode, NodeType, Value } from './types';

const containers = new Set(['row', 'column', 'auto', 'flow']);
const commonProperties = new Set([
  'width', 'height', 'minWidth', 'maxWidth', 'minHeight', 'maxHeight',
  'grow', 'gap', 'padding', 'align', 'justify', 'textAlign', 'variant',
]);
const positiveProperties = new Set(['width', 'height', 'maxWidth', 'maxHeight']);
const nonnegativeProperties = new Set(['minWidth', 'minHeight', 'grow', 'gap']);

/** Parse one located layout tree. Module-specific options are validated by the registry. */
export function parseLayout(source: string): LayoutNode {
  const lexer = new LayoutLexer(source);
  let token = lexer.next();
  let nodeCount = 0;

  function fail(message: string, code = 'SYNTAX_ERROR', at: Token = token): never {
    throw new LayoutError({ code, message, nodeId: lexer.nodeId, source: at.source });
  }

  function is(symbol: string): boolean {
    return token.kind === 'symbol' && token.value === symbol;
  }

  function take(symbol?: string): Token {
    if (symbol !== undefined && !is(symbol)) fail(`Expected ${JSON.stringify(symbol)} here.`);
    const result = token;
    token = lexer.next();
    return result;
  }

  function value(depth = 0): Value {
    if (depth > 12) fail('Reduce nested parameter arrays to at most 12 levels.', 'LAYOUT_LIMIT_EXCEEDED');
    if (token.kind === 'string' || token.kind === 'number') return take().value;
    if (token.kind === 'identifier' && (token.value === 'true' || token.value === 'false')) {
      return take().value === 'true';
    }
    if (is('[')) {
      take('[');
      const values: Value[] = [];
      while (!is(']')) {
        values.push(value(depth + 1));
        if (!is(',')) break;
        take(',');
      }
      take(']');
      return values;
    }
    fail('Expected a finite number, JSON string, boolean or array of literal values.');
  }

  function node(id: string, depth: number, parent?: NodeType): LayoutNode {
    const previousId = lexer.nodeId;
    lexer.nodeId = id;
    if (++nodeCount > 128 || depth > 12) {
      fail('Use at most 128 nodes and 12 levels in one layout.', 'LAYOUT_LIMIT_EXCEEDED');
    }
    if (token.kind !== 'identifier') fail('Expected a layout node name.');
    const start = take();
    const name = String(start.value);
    const type: NodeType = containers.has(name) ? name as NodeType : name === 'space' ? 'space' : 'item';
    const result: LayoutNode = { type, name, id, source: start.source, props: {}, options: {}, children: [] };
    const properties = new Map<string, { value: Value; token: Token }>();
    if (is('(')) {
      take('(');
      const argument = token as Token;
      let positional = false;
      if (type === 'item' && argument.kind === 'string') {
        result.parameter = String(take().value);
        positional = true;
      } else if (type === 'space' && argument.kind === 'number') {
        const length = take();
        result.length = Number(length.value);
        if (result.length < 0) fail('Space length must be nonnegative.', 'INVALID_PROPERTY', length);
        positional = true;
      }
      if (positional && is(',')) {
        if (type === 'space') fail('A fixed space accepts only its length.');
        take(',');
      } else if (positional && !is(')')) {
        fail('Separate the string parameter from named properties with a comma.');
      }
      if (!positional || !is(')')) {
        do {
          if (token.kind !== 'identifier') fail('Expected a named property followed by a colon.');
          const key = take();
          const property = String(key.value);
          if (properties.has(property)) fail(`Property ${property} is repeated; keep one value.`, 'DUPLICATE_PROPERTY', key);
          take(':');
          properties.set(property, { value: value(), token: key });
          if (!is(',')) break;
          take(',');
        } while (!is(')'));
      }
      take(')');
    }

    for (const [property, entry] of properties) {
      const input = entry.value;
      const invalid = (message: string): never => fail(message, 'INVALID_PROPERTY', entry.token);
      if (type === 'space' && property !== 'grow') invalid('A flexible space accepts only grow.');
      if (!commonProperties.has(property)) {
        if (type !== 'item') invalid(`Unknown ${type} property ${property}.`);
        Object.defineProperty(result.options, property, { value: input, enumerable: true, writable: true, configurable: true });
        continue;
      }
      if ((property === 'gap' && !containers.has(type)) ||
          (['align', 'justify'].includes(property) && type !== 'row' && type !== 'column') ||
          (property === 'variant' && type !== 'item')) {
        invalid(`${property} does not apply to ${type} nodes.`);
      }
      let normalized: Value = input;
      if (positiveProperties.has(property) || nonnegativeProperties.has(property)) {
        const minimum = positiveProperties.has(property) ? 'positive' : 'nonnegative';
        if (typeof input !== 'number' || (minimum === 'positive' ? input <= 0 : input < 0)) {
          invalid(`${property} must be a ${minimum} number.`);
        }
      } else if (property === 'padding') {
        const edges = typeof input === 'number' ? [input, input, input, input] : input;
        if (!Array.isArray(edges) || edges.length !== 4 || edges.some(edge => typeof edge !== 'number' || edge < 0)) {
          invalid('Padding must be a nonnegative number or [top, right, bottom, left].');
        }
        normalized = edges as Insets;
      } else if (property === 'variant') {
        if (typeof input !== 'string') invalid('Variant must be a string registered by the item module.');
      } else {
        const allowed = property === 'align' ? ['start', 'center', 'end', 'stretch'] :
          property === 'justify' ? ['start', 'center', 'end', 'between'] : ['start', 'center', 'end'];
        if (typeof input !== 'string' || !allowed.includes(input)) invalid(`${property} must be one of ${allowed.join(', ')}.`);
      }
      (result.props as Record<string, Value>)[property] = normalized;
    }

    for (const dimension of ['Width', 'Height'] as const) {
      const min = result.props[`min${dimension}`];
      const max = result.props[`max${dimension}`];
      const fixed = result.props[dimension.toLowerCase() as 'width' | 'height'];
      if ((min !== undefined && max !== undefined && min > max) ||
          (fixed !== undefined && ((min !== undefined && fixed < min) || (max !== undefined && fixed > max)))) {
        fail(`The fixed, minimum and maximum ${dimension.toLowerCase()} must agree.`, 'INVALID_PROPERTY', start);
      }
    }
    if ((parent === 'auto' || parent === 'flow') && result.props.grow !== undefined) {
      fail('Direct children of auto/flow cannot specify grow; set size constraints instead.', 'INVALID_PROPERTY', properties.get('grow')!.token);
    }
    const fixedMainAxis = parent === 'row' ? result.props.width : parent === 'column' ? result.props.height : undefined;
    if (fixedMainAxis !== undefined && (result.props.grow ?? 0) > 0) {
      fail('Remove positive grow or the fixed size on the parent main axis.', 'INVALID_PROPERTY', properties.get('grow')!.token);
    }
    if (type === 'space' && parent !== 'row' && parent !== 'column') {
      fail('Place space directly inside a row or column.', 'INVALID_PROPERTY', start);
    }
    if (containers.has(type)) {
      take('[');
      while (!is(']')) {
        if ((type === 'auto' || type === 'flow') && result.children.length === 12) {
          fail('Use at most 12 direct children in auto/flow; group related items in a manual container.', 'LAYOUT_LIMIT_EXCEEDED');
        }
        result.children.push(node(`${id}.${result.children.length}`, depth + 1, type));
        if (!is(',')) break;
        take(',');
      }
      if ((type === 'auto' || type === 'flow') && !result.children.length) {
        fail('Add at least one child to auto/flow.', 'INVALID_PROPERTY', start);
      }
      take(']');
    }
    lexer.nodeId = previousId;
    return result;
  }

  const root = node('0', 1);
  if (token.kind !== 'eof') fail('A layout must contain exactly one root node.');
  return root;
}
