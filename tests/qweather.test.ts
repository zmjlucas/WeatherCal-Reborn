import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, required, runtime } from './helpers/scriptable';
import { initializedContext } from './helpers/context';
import type { EnvironmentOptions } from './helpers/scriptable';
import type { TestContext } from 'vitest';

const host = 'test.re.qweatherapi.com';

test('default units follow device region and isolate QWeather caches when the region changes', async t => {
  const { service, requests } = await setup(t);
  service.settings = await service.getSettings();
  service.locale = 'en_US';
  for (const [locale, temperature] of [
    ['zh_Hans_CN', 20], ['en_US', 68], ['en_GB', 20], ['en_BS', 68],
    ['en_LR', 20], ['en', 20], ['invalid_locale!', 20], ['zh_Hant_TW', 20]
  ] as const) {
    runtime.Device.locale = () => locale;
    await service.setupWeather();
    assert.equal(service.data.weather?.currentTemp, temperature, locale);
  }
  assert.equal(requests.length, 6);
});

test('saved manual units override device region and saved auto continues following it', async t => {
  const { service } = await setup(t);
  for (const [units, locale, temperature] of [
    ['imperial', 'zh_CN', 68], ['metric', 'en_US', 20], ['auto', 'en_US', 68], ['auto', 'zh_CN', 20]
  ] as const) {
    service.fm.writeString(service.prefPath, JSON.stringify({ widget: { units } }));
    service.settings = await service.getSettings();
    runtime.Device.locale = () => locale;
    await service.setupWeather();
    assert.equal(service.data.weather?.currentTemp, temperature);
    assert.equal((await service.getSettings(true)).widget.units.val, units);
  }
});

function payload(url: string): unknown {
  const metadata = { attributions: ['QWeather test data'] };
  if (url.includes('/current/')) return { metadata, condition: { code: '100', text: '晴' }, temperature: { value: 20, unit: '°C' } };
  if (url.includes('/hourly/')) return { metadata, hours: [
    { forecastTime: '2026-10-26T12:00+08:00', temperature: { value: 21, unit: '°C' }, condition: { code: '101', text: '多云' }, precipitation: { probability: 0 } },
    { forecastTime: '2026-10-26T13:00+08:00', temperature: { value: 22, unit: '°C' }, condition: { code: '305', text: '小雨' }, precipitation: { probability: 0.35 } }
  ] };
  if (url.includes('/daily/')) return { metadata, days: [0, 1].map(day => ({
    forecastStartTime: `2026-10-${26 + day}T00:00+08:00`,
    temperatureMax: { value: 24, unit: '°C' }, temperatureMin: { value: 10, unit: '°C' },
    daytime: { condition: { code: '104', text: '阴' }, precipitation: { probability: 0.3 } },
    nighttime: { condition: { code: '305', text: '雨' }, precipitation: { probability: 0.6 } },
    astro: { sunrise: `2026-10-${26 + day}T06:00+08:00`, sunset: `2026-10-${26 + day}T18:00+08:00` }
  })) };
  throw new Error('Unexpected endpoint');
}
async function setup(t: TestContext, options: EnvironmentOptions = {}) {
  const env = installScriptable(t, { request: async url => payload(url), ...options });
  const service = await initializedContext(env);
  service.now = new Date('2026-10-26T12:30:00+08:00');
  service.settings.widget.units = 'metric';
  env.secrets.set('weather-cal-qweather-host:' + service.name, host);
  service.data.location = { latitude: 39.9234, longitude: 116.4123 };
  env.secrets.set('weather-cal-qweather-key:' + host, 'fake-key');
  return { service, ...env };
}

test('QWeather cache files contain neither credentials nor the account host', async t => {
  const { service, local, cloud } = await setup(t);
  service.fm = cloud;
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, 20);
  for (const [path, file] of [...local.store, ...cloud.store]) {
    assert.equal((path + file.value).includes(host), false);
    assert.equal((path + file.value).includes('fake-key'), false);
  }
});

test('default provider loads QWeather through header auth and maps weather without inventing daily rain probability', async t => {
  const { service, requests } = await setup(t, { request: async (url, _kind, req) => {
    assert.equal(req.headers['X-QW-Api-Key'], 'fake-key');
    assert.equal(url.includes('fake-key'), false);
    return payload(url);
  } });
  await service.setupWeather();
  await service.setupSunrise();
  assert.equal(requests.length, 3);
  assert.match(required(requests[0]), /^https:\/\/test\.re\.qweatherapi\.com\/weather\/v1\/current\/39\.92\/116\.41\?/);
  const weather = required(service.data.weather);
  assert.equal(weather.currentTemp, 20);
  assert.equal(weather.currentCondition, 800);
  assert.equal(weather.currentDescription, '晴');
  assert.equal(weather.forecast[0]?.High, 24);
  assert.equal(weather.hourly[1]?.Condition, 500);
  assert.equal(weather.nextHourRain, 35);
  assert.equal(weather.tomorrowRain, null);
  assert.equal(service.data.sun?.sunrise, Date.parse('2026-10-26T06:00+08:00'));
});

test('QWeather caches across contexts, rounds location, serializes concurrent consumers and paces cold requests', async t => {
  const { service, requests, local, delays } = await setup(t);
  await Promise.all([service.setupWeather(), service.setupSunrise()]);
  assert.equal(requests.length, 3);
  assert.equal(delays.length >= 2, true);
  const second = await initializedContext();
  second.fm = local;
  second.now = service.now;
  second.settings.widget.units = 'metric';
  second.data.location = { latitude: 39.9235, longitude: 116.4124 };
  await second.setupWeather();
  assert.equal(second.data.weather?.currentTemp, 20);
  assert.equal(requests.length, 3);
});

test('QWeather rejects invalid hosts before sending a key, and missing credentials make no requests', async t => {
  const { service, requests, secrets } = await setup(t);
  for (const invalid of ['http://test.re.qweatherapi.com', 'test.re.qweatherapi.com.evil.test', 'test.re.qweatherapi.com@evil.test', 'test.re.qweatherapi.com/path', '']) {
    secrets.set('weather-cal-qweather-host:' + service.name, invalid);
    await service.setupWeather();
    assert.equal(service.data.weather?.currentTemp, null);
  }
  secrets.set('weather-cal-qweather-host:' + service.name, host);
  secrets.clear();
  await service.setupWeather();
  assert.equal(requests.length, 0);
});

test('QWeather stops on 429 and persists Retry-After cooldown across context instances and locations', async t => {
  const { service, requests, local } = await setup(t, { request: async (_url, _kind, req) => {
    req.response = { statusCode: 429, headers: { 'Retry-After': '7200' } };
    return { error: { status: 429, type: 'too-many-requests' } };
  } });
  await service.setupWeather();
  await service.setupSunrise();
  const second = await initializedContext();
  second.fm = local;
  second.now = service.now;
  second.settings.widget.units = 'metric';
  second.data.location = { latitude: 30, longitude: 120 };
  await second.setupWeather();
  assert.equal(requests.length, 1);
  assert.equal(second.data.weather?.currentTemp, null);
  assert([...local.store.values()].some(file => file.value.includes('retryAt')));
});

test('QWeather retains usable cache on malformed refresh and expires old weather', async t => {
  let broken = false;
  const { service, requests, local } = await setup(t, { request: async url => broken ? {} : payload(url) });
  await service.setupWeather();
  for (const [path, file] of local.store) if (path.includes('qweather-cache')) file.modified = new Date(service.now.getTime() - 16 * 60000);
  broken = true;
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, 20);
  assert.equal(requests.length, 4);
  for (const [path, file] of local.store) if (path.includes('qweather-cache')) file.modified = new Date(service.now.getTime() - 61 * 60000);
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, null);
  assert.equal(requests.length, 4);
});

test('QWeather converts temperatures to selected units and does not reuse OpenWeather data', async t => {
  const { service, requests } = await setup(t, { request: async url => url.includes('openweathermap') ? { current: { temp: 99 } } : payload(url) });
  service.settings.widget.units = 'imperial';
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, 68);
  service.settings.weather.provider = 'openweather';
  service.fm.writeString('/library/weather-cal-api-key', 'ow-key');
  service.fm.writeString('/library/weather-cal-api-path', 'https://api.openweathermap.org/data/3.0/onecall');
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, 99);
  service.settings.weather.provider = 'qweather';
  await service.setupWeather();
  assert.equal(service.data.weather?.currentTemp, 68);
  assert.equal(requests.length, 4);
});


test('QWeather next-hour forecast follows timestamps when the first forecast is already the next hour', async t => {
  const { service } = await setup(t, { request: async url => {
    if (url.includes('/hourly/')) return { hours: [
      { forecastTime: '2026-10-26T13:00+08:00', temperature: { value: 21, unit: '°C' }, precipitation: { probability: 0 } },
      { forecastTime: '2026-10-26T14:00+08:00', temperature: { value: 22, unit: '°C' }, precipitation: { probability: 0.35 } }
    ] };
    return payload(url);
  } });
  await service.setupWeather();
  assert.equal(service.data.weather?.nextHourRain, 0);
  assert.equal(service.data.weather?.hourly[0]?.Temp, 20);
  assert.equal(service.data.weather?.hourly[1]?.Temp, 21);
  service.now = new Date('2026-10-26T13:05:00+08:00');
  await service.setupWeather();
  assert.equal(service.data.weather?.nextHourRain, 35);
  assert.equal(service.data.weather?.hourly[0]?.Temp, 21);
});

test('QWeather cloudy conditions produce a cloud symbol instead of clear sun', async t => {
  const { service } = await setup(t);
  await service.setupWeather();
  assert.deepEqual(service.provideConditionSymbol(required(service.data.weather?.hourly[0]?.Condition), false), { symbol: 'cloud.sun.fill' });
});

test('QWeather uses supported device languages and translates legacy preference codes', async t => {
  const { service, requests } = await setup(t);
  service.locale = 'ko_KR';
  await service.setupWeather();
  assert.equal(new URL(required(requests.at(-1))).searchParams.get('lang'), 'ko');
  for (const [input, expected] of [['cz', 'cs'], ['zh-Hant-HK', 'zh-hant'], ['no', 'nb'], ['sp', 'es'], ['se', 'sv'], ['unsupported', 'en']]) {
    service.settings.weather.locale = input!;
    await service.setupWeather();
    assert.equal(new URL(required(requests.at(-1))).searchParams.get('lang'), expected);
  }
});

test('QWeather coalesces consumers when FileManager.local returns distinct wrappers', async t => {
  const { service, requests, local } = await setup(t);
  runtime.FileManager.local = () => Object.create(local) as typeof local;
  await Promise.all([service.setupWeather(), service.setupSunrise()]);
  assert.equal(requests.length, 3);
});

test('QWeather stores the shared cooldown in local storage even with an iCloud library path', async t => {
  const { service, requests, local, cloud } = await setup(t);
  cloud.libraryDirectory = () => '/cloud-library';
  const write = local.writeString.bind(local);
  local.writeString = (path, text) => { assert.match(path, /^\/library\//); write(path, text); };
  service.fm = cloud;
  await service.setupWeather();
  assert.equal(requests.length, 3);
  assert.equal(service.data.weather?.currentTemp, 20);
  assert([...cloud.store.keys()].some(path => path.startsWith('/cloud-library/weather-cal-qweather-cache')));
});


test('QWeather honors HTTP-date Retry-After and resumes only after the cooldown', async t => {
  const base = Date.now();
  const clock = vi.spyOn(Date, 'now').mockReturnValue(base);
  t.onTestFinished(() => clock.mockRestore());
  let limited = true;
  const { service, requests } = await setup(t, { request: async (url, _kind, request) => {
    if (limited) {
      request.response = { statusCode: 429, headers: { 'retry-after': new Date(base + 3600000).toUTCString() } };
      return { error: { status: 429 } };
    }
    return payload(url);
  } });
  await service.setupWeather();
  limited = false;
  clock.mockReturnValue(base + 3598000);
  await service.setupWeather();
  assert.equal(requests.length, 1);
  clock.mockReturnValue(base + 3601000);
  await service.setupWeather();
  assert.equal(requests.length, 4);
  assert.equal(service.data.weather?.currentTemp, 20);
  assert.equal(service.data.weatherError, undefined);
});

test('QWeather monthly quota errors do not retry on the next day', async t => {
  const base = Date.UTC(2026, 9, 26, 0);
  const clock = vi.spyOn(Date, 'now').mockReturnValue(base);
  t.onTestFinished(() => clock.mockRestore());
  const { service, requests } = await setup(t, { request: async (_url, _kind, request) => {
    request.response.statusCode = 429;
    return { error: { status: 429, type: 'https://dev.qweather.com/docs/resource/error-code/#over-monthly-limit' } };
  } });
  await service.setupWeather();
  clock.mockReturnValue(base + 86400000);
  await service.setupWeather();
  assert.equal(requests.length, 1);
});
