import type { WeatherCalContext } from '../types/context';
import { parseWeatherResponse } from '../types/data';
import type { WeatherResponse } from '../types/data';
import { parseQWeatherPart } from './qweather-response';
import { resolveWeatherUnits } from './weather-units';
import { getQWeatherHost, withQWeatherState } from './qweather-state';

/** Cache selection and weather interpretation stay with the provider loader;
 * host credentials, cooldown and pacing belong to qweather-state. */
export async function loadQWeather(context: WeatherCalContext, latitude: number, longitude: number, locale: string, maxAge: number): Promise<WeatherResponse | null> {
  const host = getQWeatherHost(context.name);
  if (!host) {
    context.data.weatherError = 'Configure QWeather API Host in Other settings.';
    return null;
  }
  let fallback: WeatherResponse | null = null;
  try {
    return await withQWeatherState(host, async state => {
      const units = resolveWeatherUnits(context.settings.widget.units);
      const point = latitude.toFixed(2) + '/' + longitude.toFixed(2);
      // Schema 2 retains daytime/nighttime probabilities discarded by older caches.
      // Daily interval fields are additive: keep legacy current/hourly fallback data.
      const identity = JSON.stringify(['qweather-v1', state.cacheScope, point, locale, units, 2]);
      const path = context.getDataCachePath('qweather-cache', identity);
      if (context.fm.fileExists(path) && context.fm.isFileStoredIniCloud(path)) await context.fm.downloadFileFromiCloud(path);
      const cached = context.getCache(path, 15, maxAge);
      fallback = cached?.identity === identity ? parseWeatherResponse(cached.response) : null;
      if (fallback?.current && !cached?.cacheExpired) return fallback;

      const refreshed = await state.refresh(async request => {
        const result: WeatherResponse = {};
        const attributions = new Set<string>();
        for (const kind of ['current', 'hourly', 'daily'] as const) {
          const count = kind === 'hourly' ? '&hours=24' : kind === 'daily' ? '&days=8&localTime=true' : '';
          const raw = await request('/weather/v1/' + kind + '/' + point + '?lang=' + encodeURIComponent(locale) + count);
          const parsed = parseQWeatherPart(kind, raw, units);
          if (!parsed) throw new Error('QWeather response unavailable');
          for (const attribution of parsed.attributions || []) attributions.add(attribution);
          Object.assign(result, parsed);
        }
        result.attributions = [...attributions];
        context.fm.writeString(path, JSON.stringify({ identity, response: result }));
        return result;
      });
      if (!refreshed.ok) {
        context.data.weatherError = refreshed.error;
        return fallback;
      }
      delete context.data.weatherError;
      return refreshed.value;
    });
  } catch {
    context.data.weatherError = 'QWeather cache unavailable.';
    return fallback;
  }
}
