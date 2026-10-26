import { dataCacheFilename } from './cache';
import { finiteNumber, record } from '../types/json';

export type QWeatherRequest = <T>(path: string, parse: (raw: unknown) => T | null) => Promise<T>;
const queue = new Map<string, Promise<unknown>>();
const retryInterval = 15 * 60 * 1000;

/** Serialize an account's consumers, including cache checks. A service-specific
 * failure must not disable other products; 429 and pacing are always shared.
 * File coordination across separate Scriptable processes remains best effort. */
export async function withQWeatherSession<T>(host: string, scope: string, work: (request: QWeatherRequest) => Promise<T>, service?: string): Promise<T> {
  const previous = queue.get(host) || Promise.resolve();
  const task = previous.catch(() => {}).then(async () => {
    const files = FileManager.local();
    const ratePath = files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-rate', scope));
    const failurePath = service ? files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-' + service + '-rate', scope)) : ratePath;
    let rate: Record<string, unknown> = {};
    let failure: Record<string, unknown> = {};
    try { rate = record(JSON.parse(files.readString(ratePath))); } catch { }
    try { failure = record(JSON.parse(files.readString(failurePath))); } catch { }
    let activeRequest: Request | undefined;
    let raw: unknown;
    let status: number | undefined;
    const request: QWeatherRequest = async (path, parse) => {
      for (const limit of [rate, failure]) {
        if (finiteNumber(limit.retryAt) && Date.now() < limit.retryAt) {
          throw new Error(typeof limit.reason === 'string' ? limit.reason : 'QWeather is cooling down.');
        }
      }
      const keyName = 'weather-cal-qweather-key:' + host;
      if (!Keychain.contains(keyName) || !Keychain.get(keyName).trim()) throw new Error('Configure QWeather API key in Other settings.');
      const delay = finiteNumber(rate.nextRequestAt) ? Math.max(0, rate.nextRequestAt - Date.now()) : 0;
      if (delay) await new Promise<void>(resolve => { Timer.schedule(delay, false, resolve); });
      rate.nextRequestAt = Date.now() + 1000;
      files.writeString(ratePath, JSON.stringify(rate));
      activeRequest = new Request('https://' + host + path);
      activeRequest.headers = { 'X-QW-Api-Key': Keychain.get(keyName), Accept: 'application/json' };
      activeRequest.timeoutInterval = 15;
      activeRequest.onRedirect = () => { throw new Error('Unexpected QWeather redirect'); };
      raw = undefined;
      status = undefined;
      raw = await activeRequest.loadJSON();
      const body = record(raw);
      const legacyStatus = typeof body.code === 'string' && /^\d{3}$/.test(body.code) ? Number(body.code) : undefined;
      const httpStatus = activeRequest.response?.statusCode;
      const errorStatus = record(body.error).status;
      status = httpStatus !== undefined && httpStatus !== 200 ? httpStatus : finiteNumber(errorStatus) ? errorStatus : legacyStatus ?? httpStatus;
      const parsed = parse(raw);
      if ((status !== undefined && status !== 200) || parsed === null) throw new Error('QWeather response unavailable');
      return parsed;
    };
    try {
      const result = await work(request);
      if (activeRequest) files.writeString(failurePath, JSON.stringify({ nextRequestAt: rate.nextRequestAt, failures: 0 }));
      return result;
    } catch (cause) {
      if (!activeRequest) throw cause; // Cache reads, missing credentials and active cooldowns do not extend retries.
      status ??= activeRequest.response?.statusCode;
      const failures = finiteNumber(failure.failures) ? Math.min(failure.failures + 1, 6) : 1;
      let retryAt = Date.now() + Math.min(retryInterval * 2 ** (failures - 1), 6 * 60 * 60 * 1000);
      for (const [name, header] of Object.entries(activeRequest.response?.headers || {})) {
        if (name.toLowerCase() !== 'retry-after' || typeof header !== 'string') continue;
        const value = header.trim();
        const supplied = /^\d+$/.test(value) ? Date.now() + Number(value) * 1000 : Date.parse(value);
        if (Number.isFinite(supplied)) retryAt = Math.max(retryAt, supplied);
      }
      const errorType = record(record(raw).error).type;
      if (status === 429 && typeof errorType === 'string' && errorType.includes('over-monthly-limit')) {
        const now = new Date();
        retryAt = Math.max(retryAt, Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 2));
      }
      if (status === 400 || status === 401 || status === 403) retryAt = Math.max(retryAt, Date.now() + 24 * 60 * 60 * 1000);
      const reason = status === 429 ? 'QWeather rate limit reached; using cached data when available.' : 'QWeather unavailable; check credentials, permissions and connection.';
      files.writeString(status === 429 ? ratePath : failurePath, JSON.stringify({ nextRequestAt: rate.nextRequestAt, retryAt, failures, reason }));
      throw new Error(reason);
    }
  });
  queue.set(host, task);
  try { return await task; } finally { if (queue.get(host) === task) queue.delete(host); }
}
