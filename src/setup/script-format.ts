// Licensed under MIT. See LICENSE.
import { parse } from 'acorn';
import type { AnyNode, Comment, Pattern } from 'acorn';

const forbidden = new Set(['process', 'window', 'document', 'globalThis', 'require', 'importModule',
  'exports', 'global', 'Buffer', '__dirname', '__filename', 'fetch', 'XMLHttpRequest', 'navigator',
  'localStorage', 'sessionStorage', 'setTimeout', 'setInterval', 'setImmediate', 'clearTimeout',
  'clearInterval', 'clearImmediate', 'Deno', 'Bun']);
const globals = new Set(('undefined NaN Infinity Object Function Boolean Symbol Error AggregateError EvalError RangeError ' +
  'ReferenceError SyntaxError TypeError URIError Number BigInt Math Date String RegExp Array Int8Array Uint8Array ' +
  'Uint8ClampedArray Int16Array Uint16Array Int32Array Uint32Array Float32Array Float64Array BigInt64Array ' +
  'BigUint64Array Map Set WeakMap WeakSet ArrayBuffer SharedArrayBuffer DataView Atomics JSON Promise Reflect Proxy ' +
  'Intl parseInt parseFloat isNaN isFinite decodeURI decodeURIComponent encodeURI encodeURIComponent escape unescape ' +
  'Alert args Calendar CalendarEvent CallbackURL Color config console Contact ContactsContainer ContactsGroup Data ' +
  'DateFormatter DatePicker Device Dictation DocumentPicker DrawContext FileManager Font Image Keychain LinearGradient ' +
  'ListWidget Location Mail Message Notification Pasteboard Path Photos Point QuickLook Rect RecurrenceRule ' +
  'RelativeDateTimeFormatter Reminder Request SFSymbol Safari Script ShareSheet Size Speech TextField Timer UITable ' +
  'UITableCell UITableRow URLScheme UUID WebView WidgetDate WidgetImage WidgetSpacer WidgetStack WidgetText XMLParser').split(' '));

// Acorn produces a closed ESTree union. Enumerating children keeps this validator
// independent of parser internals, including future additional AST properties.
function children(node: AnyNode): AnyNode[] {
  const output: AnyNode[] = [];
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      if (child && typeof child === 'object' && 'type' in child && typeof child.type === 'string' &&
          'start' in child && typeof child.start === 'number') output.push(child as AnyNode);
    }
  }
  return output;
}

function inspectSource(source: string, filename: string, checkReferences = true): Set<string> {
  const tree = parse(source, { ecmaVersion: 2020, sourceType: 'module', allowAwaitOutsideFunction: true });
  interface Scope { names: Set<string>; parent: Scope | undefined; functionScope: boolean }
  const root: Scope = { names: new Set(), parent: undefined, functionScope: true };
  const scopes = new Map<AnyNode, Scope>();
  const boundNodes = new Set<AnyNode>();
  function bind(pattern: Pattern, scope: Scope): void {
    if (pattern.type === 'Identifier') { scope.names.add(pattern.name); boundNodes.add(pattern); }
    else if (pattern.type === 'RestElement') bind(pattern.argument, scope);
    else if (pattern.type === 'AssignmentPattern') bind(pattern.left, scope);
    else if (pattern.type === 'ArrayPattern') { for (const item of pattern.elements) if (item) bind(item, scope); }
    else if (pattern.type === 'ObjectPattern') {
      for (const item of pattern.properties) bind(item.type === 'RestElement' ? item.argument : item.value, scope);
    }
  }
  function declarations(node: AnyNode, incoming: Scope): void {
    let scope = incoming;
    if ((node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') && node.id) bind(node.id, incoming);
    if (node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') {
      scope = { names: new Set(), parent: incoming, functionScope: true };
      if (node.type !== 'ArrowFunctionExpression') scope.names.add('arguments');
      if ('id' in node && node.id) bind(node.id, scope);
      for (const param of node.params) bind(param, scope);
    } else if (['BlockStatement', 'CatchClause', 'ForStatement', 'ForInStatement', 'ForOfStatement',
      'SwitchStatement', 'ClassDeclaration', 'ClassExpression'].includes(node.type)) {
      scope = { names: new Set(), parent: incoming, functionScope: false };
    }
    scopes.set(node, scope);
    if (node.type === 'VariableDeclaration') {
      let target = scope;
      if (node.kind === 'var') while (!target.functionScope && target.parent) target = target.parent;
      for (const item of node.declarations) bind(item.id, target);
    }
    if ((node.type === 'ClassDeclaration' || node.type === 'ClassExpression') && node.id) bind(node.id, scope);
    if (node.type === 'CatchClause' && node.param) bind(node.param, scope);
    for (const child of children(node)) declarations(child, scope);
  }
  declarations(tree, root);
  function visit(node: AnyNode, parent?: AnyNode): void {
    if (node.type.startsWith('Import') || node.type.startsWith('Export') ||
        (node.type === 'MetaProperty' && node.meta.name === 'import')) {
      throw new Error(`${filename}: runtime modules are not supported (${node.type}).`);
    }
    if (checkReferences && node.type === 'Identifier') {
      const property = parent && (
        (parent.type === 'MemberExpression' && parent.property === node && !parent.computed) ||
        ((parent.type === 'Property' || parent.type === 'MethodDefinition' || parent.type === 'PropertyDefinition') &&
          parent.key === node && !parent.computed && !('shorthand' in parent && parent.shorthand)) ||
        ((parent.type === 'LabeledStatement' || parent.type === 'BreakStatement' || parent.type === 'ContinueStatement') && parent.label === node));
      if (!property && !boundNodes.has(node)) {
        let scope = scopes.get(node);
        while (scope && !scope.names.has(node.name)) scope = scope.parent;
        if (node.name === 'module') {
          if (!(parent?.type === 'MemberExpression' && parent.object === node && !parent.computed &&
              parent.property.type === 'Identifier' && parent.property.name === 'filename')) {
            throw new Error(`${filename}: only Scriptable module.filename identity is supported.`);
          }
        } else if (forbidden.has(node.name) || (!scope && !globals.has(node.name))) {
          throw new Error(`${filename}: unsupported runtime reference ${node.name}.`);
        }
      }
    }
    for (const child of children(node)) visit(child, node);
  }
  visit(tree);
  return root.names;
}

/** Validate executable references, allowing the same words in text and properties. */
export function validateSource(source: string, filename = 'script.js'): void {
  inspectSource(source, filename);
}

const markers = ['// WeatherCal: user begin v1', '// WeatherCal: user end v1',
  '// WeatherCal: engine begin v1', '// WeatherCal: engine end v1'] as const;

export interface ScriptParts { prefix: string; user: string; engine: string }

/** Only real comments count as boundaries; quoted examples cannot split a script. */
export function splitScript(source: string): ScriptParts {
  if (!source.startsWith('// Variables used by Scriptable.')) throw new Error('Missing Scriptable metadata.');
  const comments: Comment[] = [];
  const tree = parse(source, { ecmaVersion: 2020, sourceType: 'module', allowAwaitOutsideFunction: true, onComment: comments });
  const found = markers.map(marker => comments.filter(comment => source.slice(comment.start, comment.end) === marker));
  const first = found[0]?.[0], second = found[1]?.[0], third = found[2]?.[0], fourth = found[3]?.[0];
  if (found.some(list => list.length !== 1) || !first || !second || !third || !fourth ||
      !(first.end < second.start && second.end < third.start && third.end < fourth.start)) {
    throw new Error('Unrecognized script structure. Install one.js manually to migrate a legacy widget.');
  }
  if (source.slice(second.end, third.start).trim() || source.slice(fourth.end).trim() ||
      tree.body.some(node => !((node.start >= first.end && node.end <= second.start) ||
        (node.start >= third.end && node.end <= fourth.start)))) {
    throw new Error('Executable code outside the editable and generated regions.');
  }
  validateSource(source);
  return { prefix: source.slice(0, first.start), user: source.slice(first.end, second.start), engine: source.slice(third.end, fourth.start) };
}

export function mergeScriptUpdate(installed: string, downloaded: string): string {
  const current = splitScript(installed);
  const next = splitScript(downloaded);
  const userBindings = inspectSource(current.user, 'user region', false);
  const engineBindings = inspectSource(next.engine, 'engine region', false);
  for (const name of userBindings) {
    if (engineBindings.has(name)) throw new Error(`The new engine conflicts with user variable ${name}.`);
  }
  const combined = `${current.prefix}${markers[0]}${current.user}${markers[1]}\n${markers[2]}${next.engine}${markers[3]}\n`;
  splitScript(combined); // Detect collisions between new engine bindings and user edits.
  return combined;
}

export function isInstallableScript(source: string): boolean {
  try { splitScript(source); return true; } catch { return false; }
}
