import type { WeatherCalContext } from '../types/context';
import { parseWeatherResponse } from '../types/data';
import type { WeatherResponse } from '../types/data';
import { parseQWeatherPart } from './qweather-response';
import { resolveWeatherUnits } from './weather-units';
import { withQWeatherSession } from './qweather-session';

export function normalizeQWeatherHost(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/^https:\/\//, '').replace(/\/$/, '');
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+qweatherapi\.com$/.test(host) ? host : null;
}

export function getQWeatherHost(widgetName: string): string | null {
  const name = 'weather-cal-qweather-host:' + widgetName;
  return Keychain.contains(name) ? normalizeQWeatherHost(Keychain.get(name)) : null;
}

/** Only the Keychain maps this random cache namespace to an account host. */
export function qweatherCacheScope(host: string): string {
  const name = 'weather-cal-qweather-cache-scope:' + host;
  if (!Keychain.contains(name)) Keychain.set(name, UUID.string());
  return Keychain.get(name);
}

export async function loadQWeather(context: WeatherCalContext, latitude: number, longitude: number, locale: string, maxAge: number): Promise<WeatherResponse | null> {
  const host = getQWeatherHost(context.name);
  if (!host) {
    context.data.weatherError = 'Configure QWeather API Host in Other settings.';
    return null;
  }
  const scope = qweatherCacheScope(host);
  let fallback: WeatherResponse | null = null;
  try {
    return await withQWeatherSession(host, scope, async request => {
      const units = resolveWeatherUnits(context.settings.widget.units);
      const point = latitude.toFixed(2) + '/' + longitude.toFixed(2);
      // Schema 2 retains daytime/nighttime probabilities discarded by older caches.
      const identity = JSON.stringify(['qweather-v1', scope, point, locale, units, 2]);
      const path = context.getDataCachePath('qweather-cache', identity);
      if (context.fm.fileExists(path) && context.fm.isFileStoredIniCloud(path)) await context.fm.downloadFileFromiCloud(path);
      const cached = context.getCache(path, 15, maxAge);
      fallback = cached?.identity === identity ? parseWeatherResponse(cached.response) : null;
      if (fallback?.current && !cached?.cacheExpired) return fallback;
      const result: WeatherResponse = {};
      const attributions = new Set<string>();
      for (const kind of ['current', 'hourly', 'daily'] as const) {
        const count = kind === 'hourly' ? '&hours=24' : kind === 'daily' ? '&days=8' : '';
        const parsed = await request('/weather/v1/' + kind + '/' + point + '?lang=' + encodeURIComponent(locale) + count,
          raw => parseQWeatherPart(kind, raw, units));
        for (const attribution of parsed.attributions || []) attributions.add(attribution);
        Object.assign(result, parsed);
      }
      result.attributions = [...attributions];
      context.fm.writeString(path, JSON.stringify({ identity, response: result }));
      delete context.data.weatherError;
      return result;
    });
  } catch (cause) {
    context.data.weatherError = cause instanceof Error ? cause.message : 'QWeather unavailable.';
    return fallback;
  }
}
