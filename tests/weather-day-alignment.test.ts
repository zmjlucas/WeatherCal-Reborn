import { afterEach, expect, test, vi } from 'vitest';
import type { TestContext } from 'vitest';
import { initializedContext } from './helpers/context';
import { installScriptable, required, texts } from './helpers/scriptable';
import { qweatherPayload } from './helpers/qweather';

function days(offset = '+08:00') {
  return [27, 28, 29, 30].map(day => ({
    forecastStartTime: `2026-10-${day}T00:00${offset}`,
    forecastEndTime: `2026-10-${day + 1}T00:00${offset}`,
    temperatureMax: { value: day, unit: '°C' }, temperatureMin: { value: day - 10, unit: '°C' },
    daytime: { condition: { code: '100', text: 'Clear' }, precipitation: { probability: (day - 20) / 10 } },
    nighttime: { precipitation: { probability: 0.1 } },
    astro: { sunrise: `2026-10-${day}T06:00${offset}`, sunset: `2026-10-${day}T18:00${offset}` },
  }));
}
async function fixture(t: TestContext, daily = days(), initial = '2026-10-27T23:58:00+08:00') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(initial));
  let offline = false;
  const env = installScriptable(t, { request: async url => {
    if (offline) throw new Error('Offline');
    return url.includes('/daily/') ? { days: daily } : qweatherPayload(url);
  } });
  const service = await initializedContext(env);
  service.settings.widget.units = 'metric';
  service.locale = 'en_US';
  service.now = new Date(initial);
  service.data.location = { latitude: 39.92, longitude: 116.41 };
  env.secrets.set('weather-cal-qweather-host:' + service.name, 'test.re.qweatherapi.com');
  env.secrets.set('weather-cal-qweather-key:test.re.qweatherapi.com', 'fake-key');
  return { ...env, service, goOffline() { offline = true; }, advance(time: string) { service.now = new Date(time); vi.setSystemTime(service.now); } };
}
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

for (const [offset, deviceZone] of [['+08:00', 'America/Los_Angeles'], ['-07:00', 'Pacific/Kiritimati']] as const) {
  test(`a fresh cache crosses location midnight (${offset}) independently of device zone ${deviceZone}`, async t => {
    vi.stubEnv('TZ', deviceZone);
    const f = await fixture(t, days(offset), `2026-10-27T23:58:00${offset}`);
    await f.service.setupWeather();
    expect(f.service.data.weather?.todayHigh).toBe(27);
    f.advance(`2026-10-28T00:01:00${offset}`);
    await f.service.setupWeather();
    await f.service.setupSunrise();
    expect(f.service.data.weather?.todayHigh).toBe(28);
    expect(f.service.data.weather?.todayLow).toBe(18);
    expect(f.service.data.weather?.forecast.slice(0, 3).map(day => day.High)).toEqual([28, 29, 30]);
    expect(f.service.data.weather?.tomorrowRainByPeriod).toEqual({ daytime: 90, nighttime: 10 });
    expect(f.service.data.sun).toEqual({ sunrise: Date.parse(`2026-10-28T06:00${offset}`), sunset: Date.parse(`2026-10-28T18:00${offset}`), tomorrow: Date.parse(`2026-10-29T06:00${offset}`) });
    expect(f.requests).toHaveLength(3);
  });
}

test('stale offline fallback aligns high/low and solar values without overwriting cache', async t => {
  const f = await fixture(t);
  await f.service.setupWeather();
  const cachePath = required([...f.local.store.keys()].find(path => path.includes('qweather-cache')));
  const cached = f.local.readString(cachePath);
  f.goOffline(); f.advance('2026-10-28T00:20:00+08:00');
  await f.service.setupWeather(); await f.service.setupSunrise();
  expect(f.service.data.weather?.currentTemp).toBe(20);
  expect(f.service.data.weather?.todayHigh).toBe(28);
  expect(f.service.data.sun).toEqual({ sunrise: Date.parse('2026-10-28T06:00+08:00'), sunset: Date.parse('2026-10-28T18:00+08:00'), tomorrow: Date.parse('2026-10-29T06:00+08:00') });
  expect(f.local.readString(cachePath)).toBe(cached);
  expect(f.service.data.weatherError).toBeTruthy();
});

test('UTC-formatted provider boundaries still identify the location day', async t => {
  const daily = days();
  for (const day of daily) {
    day.forecastStartTime = new Date(day.forecastStartTime).toISOString();
    day.forecastEndTime = new Date(day.forecastEndTime).toISOString();
  }
  const f = await fixture(t, daily, '2026-10-28T00:01:00+08:00');
  await f.service.setupWeather(); await f.service.setupSunrise();
  expect(f.service.data.weather?.todayHigh).toBe(28);
  expect(f.service.data.sun?.sunrise).toBe(Date.parse('2026-10-28T06:00+08:00'));
});

test('a 25-hour location day advances only at its provider end boundary', async t => {
  const daily = days('+01:00').slice(0, 2);
  daily[0]!.forecastStartTime = '2026-10-25T00:00+02:00';
  daily[0]!.forecastEndTime = '2026-10-26T00:00+01:00';
  daily[1]!.forecastStartTime = '2026-10-26T00:00+01:00';
  daily[1]!.forecastEndTime = '2026-10-27T00:00+01:00';
  daily[0]!.astro = { sunrise: '2026-10-25T06:00+01:00', sunset: '2026-10-25T18:00+01:00' };
  daily[1]!.astro = { sunrise: '2026-10-26T06:00+01:00', sunset: '2026-10-26T18:00+01:00' };
  const f = await fixture(t, daily, '2026-10-25T23:58:00+01:00');
  await f.service.setupWeather(); expect(f.service.data.weather?.todayHigh).toBe(27);
  f.advance('2026-10-26T00:01:00+01:00');
  await f.service.setupWeather(); expect(f.service.data.weather?.todayHigh).toBe(28);
  await f.service.setupSunrise();
  expect(f.service.data.sun?.sunrise).toBe(Date.parse('2026-10-26T06:00+01:00'));
  expect(f.requests).toHaveLength(3);
});

for (const problem of ['missing start', 'missing end', 'ambiguous date', 'invalid date', 'reversed interval'] as const) {
  test(`${problem} makes daily and solar values unavailable instead of guessing a day`, async t => {
    const daily = days();
    const today = daily[1]!;
    if (problem === 'missing start') Reflect.deleteProperty(today, 'forecastStartTime');
    if (problem === 'missing end') Reflect.deleteProperty(today, 'forecastEndTime');
    if (problem === 'ambiguous date') today.forecastStartTime = '2026-10-28T00:00';
    if (problem === 'invalid date') today.forecastStartTime = 'not-a-date';
    if (problem === 'reversed interval') today.forecastEndTime = '2026-10-27T00:00+08:00';
    const f = await fixture(t, daily, '2026-10-28T00:01:00+08:00');
    await f.service.setupWeather(); await f.service.setupSunrise();
    expect(f.service.data.weather?.currentTemp).toBe(20);
    expect(f.service.data.weather?.todayHigh).toBeNull();
    expect(f.service.data.sun).toEqual({ sunrise: null, sunset: null, tomorrow: null });
  });
}

test('an undated gap does not promote a later forecast into tomorrow', async t => {
  const daily = days();
  Reflect.deleteProperty(daily[2]!, 'forecastStartTime');
  const f = await fixture(t, daily, '2026-10-28T00:01:00+08:00');
  await f.service.setupWeather(); await f.service.setupSunrise();
  expect(f.service.data.weather?.todayHigh).toBe(28);
  expect(f.service.data.weather?.forecast[1]?.High).toBeNull();
  expect(f.service.data.weather?.tomorrowRainByPeriod).toEqual({ daytime: null, nighttime: null });
  expect(f.service.data.sun?.tomorrow).toBeNull();
});

test('legacy undated QWeather caches retain current data without presenting unknown daily dates', async t => {
  const f = await fixture(t);
  await f.service.setupWeather();
  const path = required([...f.local.store.keys()].find(path => path.includes('qweather-cache')));
  const cache = JSON.parse(f.local.readString(path));
  for (const day of cache.response.daily) { delete day.forecastStart; delete day.forecastEnd; }
  f.local.writeString(path, JSON.stringify(cache));
  f.goOffline(); f.advance('2026-10-28T00:01:00+08:00');
  await f.service.setupWeather(); await f.service.setupSunrise();
  expect(f.service.data.weather?.currentTemp).toBe(20);
  expect(f.service.data.weather?.todayHigh).toBeNull();
  expect(f.service.data.sun).toEqual({ sunrise: null, sunset: null, tomorrow: null });
  expect(f.requests).toHaveLength(3);
});

test('OpenWeather keeps its existing daily DTO and solar interpretation', async t => {
  const env = installScriptable(t, { request: async () => ({ current: { temp: 20 }, daily: [
    { dt: 1793160000, temp: { max: 31, min: 12 }, sunrise: 1793140000, sunset: 1793180000 },
    { dt: 1793246400, temp: { max: 32, min: 13 }, sunrise: 1793226400, sunset: 1793266400, pop: 0.4 },
  ] }) });
  const service = await initializedContext(env);
  service.settings.weather.provider = 'openweather';
  service.data.location = { latitude: 39.92, longitude: 116.41 };
  env.local.writeString('/library/weather-cal-api-key', 'fake-key');
  env.local.writeString('/library/weather-cal-api-path', 'https://api.openweathermap.org/data/3.0/onecall');
  await service.setupWeather(); await service.setupSunrise();
  expect(service.data.weather?.todayHigh).toBe(31);
  expect(service.data.weather?.tomorrowRain).toBe(40);
  expect(service.data.sun).toEqual({ sunrise: 1793140000000, sunset: 1793180000000, tomorrow: 1793226400000 });
});

for (const horizontal of [false, true]) {
  for (const showToday of [false, true]) {
    test(`daily labels use provider calendar dates after cached midnight, horizontal=${horizontal}, showToday=${showToday}`, async t => {
      const f = await fixture(t, days('+14:00'), '2026-10-27T23:58:00+14:00');
      await f.service.setupWeather();
      f.advance('2026-10-28T00:01:00+14:00');
      await f.service.setupWeather();
      f.service.settings.weather.showToday = showToday;
      f.service.settings.weather.showDays = '2';
      // Model the native formatter's calendar-date output, independent of locale formatting.
      f.service.formatDate = date => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const target = new f.Stack();
      await f.service.daily(target, horizontal);
      expect(texts(target).filter(text => /^2026-/.test(text))).toEqual(showToday ? ['2026-10-28', '2026-10-29'] : ['2026-10-29', '2026-10-30']);
      expect(new URL(required(f.requests.find(url => url.includes('/daily/')))).searchParams.get('localTime')).toBe('true');
      expect(f.requests).toHaveLength(3);
    });
  }
}


test('an interval without a known local calendar date renders an unavailable label', async t => {
  const daily = days();
  for (const day of daily) {
    day.forecastStartTime = new Date(day.forecastStartTime).toISOString();
    day.forecastEndTime = new Date(day.forecastEndTime).toISOString();
  }
  const f = await fixture(t, daily, '2026-10-28T00:01:00+08:00');
  f.service.settings.weather.showToday = true;
  f.service.settings.weather.showDays = '1';
  const target = new f.Stack();
  await f.service.daily(target);
  expect(texts(target)).toEqual(['--', '28', '18']);
});
