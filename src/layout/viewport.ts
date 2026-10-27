import { LayoutError } from './errors';
import { screenProfiles } from './device-profiles';
import type { Viewport, WidgetLayoutOptions } from './types';

type ConfiguredViewports = Partial<Record<'small' | 'medium' | 'large', string>>;
type ReadScreen = () => {width: number; height: number};

/** Explicit dimensions > per-family override > screen profile. Device access is
 * lazy so unavailable host APIs cannot break explicit viewport overrides. */
export function resolveViewport(configured: ConfiguredViewports, options: WidgetLayoutOptions = {}, actualFamily?: string | null, readScreen?: ReadScreen): Viewport {
  const family = actualFamily ?? options.family;
  if (family !== 'small' && family !== 'medium' && family !== 'large') {
    throw new LayoutError({ code: 'FAMILY_UNSUPPORTED', message: `Choose small, medium or large before planning (received ${family ?? 'no family'}).` });
  }
  if (actualFamily && options.family && actualFamily !== options.family) {
    throw new LayoutError({ code: 'FAMILY_CONFLICT', message: `Requested ${options.family}, but the active widget is ${actualFamily}.` });
  }
  const value = configured[family]?.trim();
  if (!options.viewport && (!value || value.toLowerCase() === 'auto')) {
    let size;
    try { size = readScreen?.(); } catch { /* Manual overrides remain available. */ }
    if (size && [size.width, size.height].every(n => Number.isFinite(n) && n > 0)) {
      const width = Math.min(size.width, size.height);
      const height = Math.max(size.width, size.height);
      const key = `${width}x${height}`;
      const profile = screenProfiles[key];
      if (profile) {
        const [widgetWidth, widgetHeight] = profile.sizes[family === 'small' ? 0 : family === 'medium' ? 1 : 2];
        return {family, width:widgetWidth, height:widgetHeight, confidence:'estimated', source:`auto:${profile.source}:${key}:${family}`};
      }
      throw new LayoutError({code:'VIEWPORT_UNKNOWN', message:`No widget size profile for ${width} x ${height} pt. Set the ${family} viewport override to width x height in Overall settings.`});
    }
    throw new LayoutError({code:'VIEWPORT_UNKNOWN', message:`Cannot read device screen size. Set the ${family} viewport override to width x height in Overall settings, or pass options.viewport.`});
  }
  const match = value?.match(/^(\d+(?:\.\d+)?)\s*[x×,]\s*(\d+(?:\.\d+)?)$/i);
  const width = options.viewport?.width ?? Number(match?.[1]);
  const height = options.viewport?.height ?? Number(match?.[2]);
  if (![width, height].every(n => Number.isFinite(n) && n > 0)) {
    throw new LayoutError({ code: 'VIEWPORT_INVALID', message: 'Viewport width and height must be finite positive numbers in logical points.' });
  }
  return { family, width, height, confidence: 'estimated', source: options.viewport ? `explicit:${family}` : `preferences:${family}` };
}
