import { dataCacheFilename } from './cache';
import type { WeatherCalContext } from '../types/context';
import { parseWeatherResponse } from '../types/data';
import type { WeatherResponse } from '../types/data';
import { finiteNumber, record } from '../types/json';
import { parseQWeatherPart } from './qweather-response';

const queue = new Map<string, Promise<unknown>>();
const refreshInterval = 15 * 60 * 1000;

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

/** Persisted host cooldown is shared by widgets on this device. Files are not an
 * atomic cross-process lock; the provider's account limit remains authoritative. */
export async function loadQWeather(context: WeatherCalContext, latitude: number, longitude: number, locale: string, maxAge: number): Promise<WeatherResponse | null> {
  const host = getQWeatherHost(context.name);
  if (!host) {
    context.data.weatherError = 'Configure QWeather API Host in Other settings.';
    return null;
  }
  const files = FileManager.local();
  const previous = queue.get(host) || Promise.resolve();
  const task = previous.catch(() => {}).then(async (): Promise<WeatherResponse | null> => {
    const units = context.settings.widget.units;
    const lang = locale;
    const point = latitude.toFixed(2) + '/' + longitude.toFixed(2);
    const scope = qweatherCacheScope(host);
    const identity = JSON.stringify(['qweather-v1', scope, point, lang, units]);
    const path = context.getDataCachePath('qweather-cache', identity);
    if (context.fm.fileExists(path) && context.fm.isFileStoredIniCloud(path)) await context.fm.downloadFileFromiCloud(path);
    const cached = context.getCache(path, 15, maxAge);
    const fallback = cached?.identity === identity ? parseWeatherResponse(cached.response) : null;
    if (fallback?.current && !cached?.cacheExpired) return fallback;
    const keyName = 'weather-cal-qweather-key:' + host;
    if (!Keychain.contains(keyName) || !Keychain.get(keyName).trim()) {
      context.data.weatherError = 'Configure QWeather API key in Other settings.';
      return fallback;
    }
    // Use local storage for throttling even when widget preferences use iCloud.
    const ratePath = files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-rate', scope));
    let rate: Record<string, unknown> = {};
    try { rate = record(JSON.parse(files.readString(ratePath))); } catch { }
    if (finiteNumber(rate.retryAt) && Date.now() < rate.retryAt) {
      context.data.weatherError = typeof rate.reason === 'string' ? rate.reason : 'QWeather is cooling down.';
      return fallback;
    }
    let activeRequest: Request | undefined;
    let raw: unknown;
    try {
      const result: WeatherResponse = {};
      const attributions = new Set<string>();
      for (const kind of ['current', 'hourly', 'daily'] as const) {
        const delay = finiteNumber(rate.nextRequestAt) ? Math.max(0, rate.nextRequestAt - Date.now()) : 0;
        if (delay) await new Promise<void>(resolve => { Timer.schedule(delay, false, resolve); });
        rate.nextRequestAt = Date.now() + 1000;
        files.writeString(ratePath, JSON.stringify(rate));
        const count = kind === 'hourly' ? '&hours=24' : kind === 'daily' ? '&days=8' : '';
        activeRequest = new Request('https://' + host + '/weather/v1/' + kind + '/' + point + '?lang=' + encodeURIComponent(lang) + count);
        activeRequest.headers = { 'X-QW-Api-Key': Keychain.get(keyName), Accept: 'application/json' };
        activeRequest.timeoutInterval = 15;
        // Never forward credentials on an unexpected redirect.
        activeRequest.onRedirect = () => { throw new Error('Unexpected QWeather redirect'); };
        raw = await activeRequest.loadJSON();
        const status = activeRequest.response?.statusCode;
        const parsed = parseQWeatherPart(kind, raw, units);
        if ((status !== undefined && status !== 200) || !parsed) throw new Error('QWeather response unavailable');
        for (const attribution of parsed.attributions || []) attributions.add(attribution);
        Object.assign(result, parsed);
      }
      result.attributions = [...attributions];
      context.fm.writeString(path, JSON.stringify({ identity, response: result }));
      files.writeString(ratePath, JSON.stringify({ nextRequestAt: rate.nextRequestAt, failures: 0 }));
      delete context.data.weatherError;
      return result;
    } catch {
      const error = record(record(raw).error);
      const status = activeRequest?.response?.statusCode ?? error.status;
      const failures = finiteNumber(rate.failures) ? Math.min(rate.failures + 1, 6) : 1;
      let retryAt = Date.now() + Math.min(refreshInterval * 2 ** (failures - 1), 6 * 60 * 60 * 1000);
      const headers = activeRequest?.response?.headers || {};
      for (const [name, header] of Object.entries(headers)) {
        if (name.toLowerCase() !== 'retry-after' || typeof header !== 'string') continue;
        const value = header.trim();
        const supplied = /^\d+$/.test(value) ? Date.now() + Number(value) * 1000 : Date.parse(value);
        if (Number.isFinite(supplied)) retryAt = Math.max(retryAt, supplied);
      }
      if (status === 429 && typeof error.type === 'string' && error.type.includes('over-monthly-limit')) {
        const now = new Date();
        retryAt = Math.max(retryAt, Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2));
      }
      if (status === 400 || status === 401 || status === 403) retryAt = Math.max(retryAt, Date.now() + 24 * 60 * 60 * 1000);
      const reason = status === 429 ? 'QWeather rate limit reached; using cached data when available.' : 'QWeather unavailable; check credentials, permissions and connection.';
      files.writeString(ratePath, JSON.stringify({ retryAt, failures, reason }));
      context.data.weatherError = reason;
      return fallback;
    }
  });
  queue.set(host, task);
  try { return await task; } finally { if (queue.get(host) === task) queue.delete(host); }
}
