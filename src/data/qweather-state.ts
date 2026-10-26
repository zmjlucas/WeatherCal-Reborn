import { dataCacheFilename } from './cache';
import { finiteNumber, record } from '../types/json';

const queue = new Map<string, Promise<unknown>>();
const refreshInterval = 15 * 60 * 1000;

type QWeatherRequest = (path: string) => Promise<unknown>;
export type QWeatherRefresh<T> = { ok: true; value: T } | { ok: false; error: string };

/** A host's consumer runs inside its queue, so it can recheck cached weather
 * before asking refresh to enforce credentials, cooldown and request pacing. */
export interface QWeatherState {
  readonly cacheScope: string;
  refresh<T>(operation: (request: QWeatherRequest) => Promise<T>): Promise<QWeatherRefresh<T>>;
}

function normalizeQWeatherHost(input: string): string | null {
  const host = input.trim().toLowerCase().replace(/^https:\/\//, '').replace(/\/$/, '');
  return /^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+qweatherapi\.com$/.test(host) ? host : null;
}

export function getQWeatherHost(widgetName: string): string | null {
  const name = 'weather-cal-qweather-host:' + widgetName;
  return Keychain.contains(name) ? normalizeQWeatherHost(Keychain.get(name)) : null;
}

/** Only Keychain maps the random cache namespace to an account host. */
function qweatherCacheScope(host: string): string {
  const name = 'weather-cal-qweather-cache-scope:' + host;
  if (!Keychain.contains(name)) Keychain.set(name, UUID.string());
  return Keychain.get(name);
}

/** Validate before writing. Blank input retains the entered host's key; only
 * a changed key clears that host's cooldown, never its weather cache namespace. */
export function saveQWeatherCredentials(widgetName: string, hostInput: string, keyInput: string): 'host' | 'key' | null {
  const host = normalizeQWeatherHost(hostInput);
  if (!host) return 'host';
  const keyName = 'weather-cal-qweather-key:' + host;
  const previous = Keychain.contains(keyName) ? Keychain.get(keyName) : '';
  const key = keyInput.trim() || previous;
  if (!key || /[\r\n]/.test(key)) return 'key';
  Keychain.set(keyName, key);
  Keychain.set('weather-cal-qweather-host:' + widgetName, host);
  if (key !== previous) {
    const files = FileManager.local();
    const path = files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-rate', qweatherCacheScope(host)));
    if (files.fileExists(path)) files.remove(path);
  }
  return null;
}

/** Same-host consumers serialize within this runtime. Persisted local cooldown
 * is best-effort coordination across launches, not an atomic cross-process lock.
 * Callers supply a host obtained through getQWeatherHost. */
export async function withQWeatherState<T>(host: string, consume: (state: QWeatherState) => Promise<T>): Promise<T> {
  const files = FileManager.local();
  const previous = queue.get(host) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const scope = qweatherCacheScope(host);
    return consume({
      cacheScope: scope,
      async refresh<Value>(operation: (request: QWeatherRequest) => Promise<Value>): Promise<QWeatherRefresh<Value>> {
        const keyName = 'weather-cal-qweather-key:' + host;
        if (!Keychain.contains(keyName) || !Keychain.get(keyName).trim()) {
          return { ok: false, error: 'Configure QWeather API key in Other settings.' };
        }
        // Throttling stays local even when weather caches and preferences use iCloud.
        const path = files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-rate', scope));
        let rate: Record<string, unknown> = {};
        try { rate = record(JSON.parse(files.readString(path))); } catch { }
        if (finiteNumber(rate.retryAt) && Date.now() < rate.retryAt) {
          return { ok: false, error: typeof rate.reason === 'string' ? rate.reason : 'QWeather is cooling down.' };
        }
        let activeRequest: Request | undefined;
        let raw: unknown;
        try {
          const value = await operation(async endpoint => {
            const delay = finiteNumber(rate.nextRequestAt) ? Math.max(0, rate.nextRequestAt - Date.now()) : 0;
            if (delay) await new Promise<void>(resolve => { Timer.schedule(delay, false, resolve); });
            rate.nextRequestAt = Date.now() + 1000;
            files.writeString(path, JSON.stringify(rate));
            activeRequest = new Request('https://' + host + endpoint);
            activeRequest.headers = { 'X-QW-Api-Key': Keychain.get(keyName), Accept: 'application/json' };
            activeRequest.timeoutInterval = 15;
            activeRequest.onRedirect = () => { throw new Error('Unexpected QWeather redirect'); };
            raw = await activeRequest.loadJSON();
            const status = activeRequest.response?.statusCode;
            if (status !== undefined && status !== 200) throw new Error('QWeather response unavailable');
            return raw;
          });
          files.writeString(path, JSON.stringify({ nextRequestAt: rate.nextRequestAt, failures: 0 }));
          return { ok: true, value };
        } catch {
          const error = record(record(raw).error);
          const status = activeRequest?.response?.statusCode ?? error.status;
          const failures = finiteNumber(rate.failures) ? Math.min(rate.failures + 1, 6) : 1;
          let retryAt = Date.now() + Math.min(refreshInterval * 2 ** (failures - 1), 6 * 60 * 60 * 1000);
          const headers = activeRequest?.response?.headers || {};
          for (const [name, header] of Object.entries(headers)) {
            if (name.toLowerCase() !== 'retry-after' || typeof header !== 'string') continue;
            const supplied = header.trim();
            const time = /^\d+$/.test(supplied) ? Date.now() + Number(supplied) * 1000 : Date.parse(supplied);
            if (Number.isFinite(time)) retryAt = Math.max(retryAt, time);
          }
          if (status === 429 && typeof error.type === 'string' && error.type.includes('over-monthly-limit')) {
            const now = new Date();
            retryAt = Math.max(retryAt, Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2));
          }
          if (status === 400 || status === 401 || status === 403) retryAt = Math.max(retryAt, Date.now() + 24 * 60 * 60 * 1000);
          const reason = status === 429 ? 'QWeather rate limit reached; using cached data when available.' : 'QWeather unavailable; check credentials, permissions and connection.';
          files.writeString(path, JSON.stringify({ retryAt, failures, reason }));
          return { ok: false, error: reason };
        }
      }
    });
  });
  queue.set(host, task);
  try { return await task; } finally { if (queue.get(host) === task) queue.delete(host); }
}
