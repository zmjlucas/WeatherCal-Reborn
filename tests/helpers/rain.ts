import { vi } from 'vitest';
import type { TestContext } from 'vitest';
import { installScriptable } from './scriptable';
import type { EnvironmentOptions } from './scriptable';
import { initializedContext } from './context';

export const rainNow = Date.parse('2026-10-26T12:00:00+08:00');
export const rainHost = 'rain-test.re.qweatherapi.com';
export function rainPayload(amounts: number[] = Array.from({ length: 24 }, (_, i) => i >= 4 ? 0.1 : 0)) {
  return {
    code: '200', updateTime: new Date(rainNow).toISOString(), summary: 'Rain in 20 minutes',
    minutely: amounts.map((amount, index) => ({ fxTime: new Date(rainNow + index * 300000).toISOString(), precip: String(amount), type: 'rain' })),
    refer: { sources: ['QWeather'], license: ['QWeather Developers License'] }
  };
}
export async function rainContext(t: TestContext, options: EnvironmentOptions = {}) {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(rainNow);
  t.onTestFinished(() => { vi.useRealTimers(); });
  const env = installScriptable(t, { request: async () => rainPayload(), ...options });
  const service = await initializedContext(env);
  service.locale = 'en_US';
  service.data.location = { latitude: 31.2345, longitude: 121.4756 };
  env.secrets.set('weather-cal-qweather-host:' + service.name, rainHost);
  env.secrets.set('weather-cal-qweather-key:' + rainHost, 'fake-rain-key');
  return { service, ...env };
}
