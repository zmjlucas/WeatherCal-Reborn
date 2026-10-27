import { LayoutError } from './errors';
import type { Viewport, WidgetLayoutOptions } from './types';

type ConfiguredViewports = Partial<Record<'small' | 'medium' | 'large', string>>;

/** Dimensions describe the zero-padding ListWidget area in logical points.
 * Screen dimensions are deliberately not substituted for widget dimensions. */
export function resolveViewport(configured: ConfiguredViewports, options: WidgetLayoutOptions = {}, actualFamily?: string | null): Viewport {
  const family = actualFamily ?? options.family;
  if (family !== 'small' && family !== 'medium' && family !== 'large') {
    throw new LayoutError({ code: 'FAMILY_UNSUPPORTED', message: `Choose small, medium or large before planning (received ${family ?? 'no family'}).` });
  }
  if (actualFamily && options.family && actualFamily !== options.family) {
    throw new LayoutError({ code: 'FAMILY_CONFLICT', message: `Requested ${options.family}, but the active widget is ${actualFamily}.` });
  }
  const value = configured[family]?.trim();
  if (!options.viewport && !value) {
    throw new LayoutError({ code: 'VIEWPORT_UNKNOWN', message: `Set ${family} viewport to width x height in Overall settings, or pass options.viewport (logical points).` });
  }
  const match = value?.match(/^(\d+(?:\.\d+)?)\s*[x×,]\s*(\d+(?:\.\d+)?)$/i);
  const width = options.viewport?.width ?? Number(match?.[1]);
  const height = options.viewport?.height ?? Number(match?.[2]);
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) {
    throw new LayoutError({ code: 'VIEWPORT_INVALID', message: 'Viewport width and height must be finite positive numbers in logical points.' });
  }
  return { width, height, confidence: 'estimated', source: options.viewport ? `explicit:${family}` : `preferences:${family}` };
}
