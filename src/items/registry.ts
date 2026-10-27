import type { WeatherCalContext } from '../types/context';
import type { ItemModule, LayoutNode, PreparedItem, PreparedItems, Value } from '../layout/types';
import { DataSession } from '../layout/data-session';
import { builtinNames, prepareBuiltin } from './presentation/builtins';
import { LayoutError } from '../layout/errors';

export async function prepareItems(root: LayoutNode, host: WeatherCalContext, custom: Record<string, ItemModule> = {}, sharedSession?: DataSession): Promise<PreparedItems> {
  const registry = new Map<string, ItemModule>();
  for (const name of builtinNames) registry.set(name, {
    options: name === 'text' ? { text: 'string' } : name === 'symbol' ? { name: 'string' } : {},
    prepare: (context, options) => prepareBuiltin(name, context.host, options),
  });
  const fail = (node: LayoutNode, code: string, message: string): never => {
    throw new LayoutError({ code, message, nodeId: node.id, source: node.source });
  };
  for (const [name, module] of Object.entries(custom)) {
    if (['row', 'column', 'auto', 'flow', 'space'].includes(name)) fail(root, 'ITEM_CONTRACT_INVALID', `Reserved name cannot be registered: ${name}.`);
    if (!module || typeof module.prepare !== 'function') fail(root, 'ITEM_CONTRACT_INVALID', `${name} must provide prepare(context, options).`);
    registry.set(name, module);
  }
  const instances: Array<{ node: LayoutNode; module: ItemModule; options: Readonly<Record<string, Value>> }> = [];
  function validate(node: LayoutNode): void {
    if (node.type === 'item') {
      const module = registry.get(node.name);
      if (!module) return fail(node, 'UNKNOWN_ITEM', `Unknown content item: ${node.name}.`);
      const options = { ...node.options };
      if (node.parameter !== undefined) {
        const key = node.name === 'text' ? 'text' : node.name === 'symbol' ? 'name' : undefined;
        if (!key || !module.options?.[key]) fail(node, 'INVALID_PARAMETER', `${node.name} does not accept a positional string.`);
        if (key! in options) fail(node, 'DUPLICATE_PROPERTY', `${key} was provided twice.`);
        options[key!] = node.parameter;
      }
      for (const [key, value] of Object.entries(options)) {
        const type = module.options && Object.prototype.hasOwnProperty.call(module.options, key) ? module.options[key] : undefined;
        if (!type) fail(node, 'UNKNOWN_PROPERTY', `Unknown ${node.name} option: ${key}.`);
        if (typeof value !== type || typeof value === 'number' && !Number.isFinite(value)) fail(node, 'INVALID_PROPERTY', `${node.name}.${key} must be ${type}.`);
      }
      instances.push({ node, module, options: Object.freeze(options) });
    }
    node.children.forEach(validate);
  }
  validate(root);
  const session = sharedSession ?? new DataSession(host);
  const context = { host: session.host, get: <T>(key: string, load: () => Promise<T>) => session.get(key, load) };
  const prepared = new Map<string, PreparedItem>();
  for (const { node, module, options } of instances) {
    const item = await module.prepare(context, options);
    if (!item || !['ready', 'empty', 'error'].includes(item.state) || typeof item.render !== 'function' || !item.effects || !Array.isArray(item.variants) || !item.variants.length) fail(node, 'ITEM_CONTRACT_INVALID', `${node.name} returned an incomplete prepared item.`);
    const ids = new Set<string>();
    for (const variant of item.variants) {
      if (!variant || typeof variant.id !== 'string' || !variant.id || ids.has(variant.id) || typeof variant.measure !== 'function' ||
          !Number.isFinite(variant.minWidth) || variant.minWidth < 0 || !Number.isFinite(variant.preferredWidth) || variant.preferredWidth < variant.minWidth ||
          !Number.isFinite(variant.adaptationCost) || variant.adaptationCost < 0 || variant.maxWidth !== undefined && (!Number.isFinite(variant.maxWidth) || variant.maxWidth < variant.preferredWidth)) fail(node, 'ITEM_CONTRACT_INVALID', `${node.name} returned invalid variant dimensions.`);
      ids.add(variant.id);
    }
    if (node.props.variant && !ids.has(node.props.variant)) fail(node, 'INVALID_VARIANT', `${node.name} has no variant ${node.props.variant}.`);
    if (item.effects.refreshAfterDate !== undefined && (!(item.effects.refreshAfterDate instanceof Date) || !Number.isFinite(item.effects.refreshAfterDate.getTime()))) fail(node, 'ITEM_CONTRACT_INVALID', `${node.name} returned an invalid refresh date.`);
    prepared.set(node.id, item);
  }
  return prepared;
}
