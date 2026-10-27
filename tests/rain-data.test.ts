import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { rainContext, rainPayload, rainNow, rainHost } from './helpers/rain';
import { initializedContext } from './helpers/context';
import { required } from './helpers/scriptable';

test('rain requests longitude first with header auth and reuses its cache across contexts', async t => {
  const { service, requests, local } = await rainContext(t, { request: async (url, _kind, req) => {
    assert.equal(req.headers['X-QW-Api-Key'], 'fake-rain-key');
    const parsed = new URL(url);
    assert.equal(parsed.pathname, '/v7/minutely/5m');
    assert.equal(parsed.searchParams.get('location'), '121.48,31.23');
    assert.equal(parsed.searchParams.get('lang'), 'en');
    assert.equal(url.includes('fake-rain-key'), false);
    return rainPayload();
  } });
  await Promise.all([service.setupRain(), service.setupRain()]);
  assert.equal(service.data.rain?.forecast?.summary, 'Rain in 20 minutes');
  assert.deepEqual(service.data.rain?.outlook, { state: 'starts', time: rainNow + 20 * 60000, kind: 'rain' });
  const second = await initializedContext();
  second.fm = local;
  second.locale = service.locale;
  second.data.location = required(service.data.location);
  await second.setupRain();
  assert.deepEqual(second.data.rain, service.data.rain);
  assert.equal(requests.length, 1);
  for (const [path, file] of local.store) {
    assert.equal((path + file.value).includes('fake-rain-key'), false);
    assert.equal((path + file.value).includes(rainHost), false);
  }
});

test('rain refreshes a fresh legacy cache without a summary while preserving its parsed forecast', async t => {
  const { service, requests, local } = await rainContext(t);
  await service.setupRain();
  for (const [path, file] of local.store) {
    if (!path.includes('rain-cache')) continue;
    const cached = JSON.parse(file.value);
    delete cached.response.summary;
    file.value = JSON.stringify(cached);
  }
  await service.setupRain();
  assert.equal(requests.length, 2);
  assert.equal(service.data.rain?.forecast?.summary, 'Rain in 20 minutes');
  assert.deepEqual(service.data.rain?.outlook, { state: 'starts', time: rainNow + 20 * 60000, kind: 'rain' });
});

for (const [name, amounts, state, minutes] of [
  ['rain stopping', Array.from({ length: 24 }, (_, i) => i < 7 ? 0.2 : 0), 'stops', 35],
  ['dry', Array(24).fill(0), 'clear', 120],
  ['ongoing', Array(24).fill(0.2), 'ongoing', 120],
] as const) {
  test(`rain assesses ${name} using the available horizon`, async t => {
    const { service } = await rainContext(t, { request: async () => rainPayload(amounts) });
    await service.setupRain();
    assert.deepEqual(service.data.rain?.outlook, { state, time: rainNow + minutes * 60000, kind: 'rain' });
  });
}

test('rain recalculates the covering bin and rejects stale data even when newly fetched', async t => {
  const { service, local } = await rainContext(t);
  await service.setupRain();
  service.now = new Date(rainNow + 20 * 60000);
  vi.setSystemTime(service.now);
  await service.setupRain();
  assert.equal(service.data.rain?.outlook, null);
  // A recent file timestamp cannot make a stale API update fresh.
  for (const [path, file] of local.store) if (path.includes('rain-cache')) file.modified = service.now;
  await service.setupRain();
  assert.equal(service.data.rain?.outlook, null);
});

test('rain refreshes after five minutes and uses a bounded fallback during failure', async t => {
  let fail = false;
  const { service, requests } = await rainContext(t, { request: async () => {
    if (fail) throw new Error('offline');
    return rainPayload(Array.from({ length: 24 }, (_, i) => i < 2 ? 0 : 0.1));
  } });
  await service.setupRain();
  fail = true;
  for (const [minutes, expected] of [[4, 'starts'], [6, 'starts'], [12, 'ongoing'], [16, null]] as const) {
    service.now = new Date(rainNow + minutes * 60000);
    vi.setSystemTime(service.now);
    await service.setupRain();
    assert.equal(service.data.rain?.outlook?.state ?? null, expected);
  }
  assert.equal(requests.length, 2);
});

for (const mutation of ['empty', 'gap', 'duplicate', 'invalid-amount', 'unknown-type', 'future-update', 'future-first-bin', 'body-error'] as const) {
  test(`rain rejects ${mutation} instead of reporting no precipitation`, async t => {
    const raw = rainPayload(Array(24).fill(0));
    if (mutation === 'empty') raw.minutely = [];
    if (mutation === 'gap') raw.minutely.splice(1, 1);
    if (mutation === 'duplicate') raw.minutely[1]!.fxTime = raw.minutely[0]!.fxTime;
    if (mutation === 'invalid-amount') raw.minutely[1]!.precip = '';
    if (mutation === 'unknown-type') raw.minutely[1]!.type = 'unknown';
    if (mutation === 'future-update') raw.updateTime = new Date(rainNow + 60000).toISOString();
    if (mutation === 'future-first-bin') raw.minutely.shift();
    if (mutation === 'body-error') raw.code = '204';
    const { service } = await rainContext(t, { request: async () => raw });
    await service.setupRain();
    assert.equal(service.data.rain?.outlook, null);
  });
}

test('snow is never described as rain alone', async t => {
  const { service } = await rainContext(t, { request: async () => {
    const raw = rainPayload();
    raw.minutely.forEach(point => { point.type = 'snow'; });
    return raw;
  } });
  await service.setupRain();
  assert.equal(service.data.rain?.outlook?.kind, 'snow');
});

test('mixed precipitation uses a neutral description and respects a shorter horizon', async t => {
  const { service } = await rainContext(t, { request: async () => {
    const raw = rainPayload([0.1, 0.2, 0.1]);
    raw.minutely[1]!.type = 'snow';
    return raw;
  } });
  await service.setupRain();
  assert.deepEqual(service.data.rain?.outlook, { state: 'ongoing', time: rainNow + 15 * 60000, kind: 'precipitation' });
});

test('concurrent minutely and weather loads share pacing without duplicating requests', async t => {
  let active = 0;
  const { service, requests, delays } = await rainContext(t, { request: async url => {
    active++;
    assert.equal(active, 1);
    await Promise.resolve();
    active--;
    if (url.includes('/minutely/')) return rainPayload();
    if (url.includes('/current/')) return { temperature: { value: 20, unit: '°C' } };
    if (url.includes('/hourly/')) return { hours: [{ temperature: { value: 20, unit: '°C' } }] };
    return { days: [{ temperatureMax: { value: 25, unit: '°C' }, temperatureMin: { value: 15, unit: '°C' } }] };
  } });
  await Promise.all([service.setupRain(), service.setupWeather(), service.setupRain(), service.setupSunrise()]);
  assert.equal(requests.length, 4);
  assert.equal(delays.length, 3);
  assert.equal(service.data.rain?.outlook?.state, 'starts');
  assert.equal(service.data.weather?.currentTemp, 68);
});

test('weather HTTP 429 also prevents a subsequent minutely request', async t => {
  const { service, requests } = await rainContext(t, { request: async (_url, _kind, req) => {
    req.response.statusCode = 429;
    return { error: { status: 429 } };
  } });
  await service.setupWeather();
  await service.setupRain();
  assert.equal(requests.length, 1);
});

test('HTTP 429 with an unreadable body still shares the host cooldown', async t => {
  const { service, requests } = await rainContext(t, { request: async (_url, _kind, req) => {
    req.response.statusCode = 429;
    throw new Error('Invalid JSON');
  } });
  await service.setupRain();
  await service.setupWeather();
  assert.equal(requests.length, 1);
});

test('minutely errors do not suppress basic weather requests', async t => {
  const { service, requests } = await rainContext(t, { request: async url => {
    if (url.includes('/minutely/')) return { code: '204' };
    if (url.includes('/current/')) return { temperature: { value: 20, unit: '°C' } };
    if (url.includes('/hourly/')) return { hours: [{ temperature: { value: 20, unit: '°C' } }] };
    return { days: [{ temperatureMax: { value: 25, unit: '°C' }, temperatureMin: { value: 15, unit: '°C' } }] };
  } });
  await service.setupRain();
  await service.setupWeather();
  await service.setupRain();
  assert.equal(service.data.weather?.currentTemp, 68);
  assert.equal(requests.length, 4);
});

test('legacy body 429 shares cooldown with basic weather across contexts', async t => {
  const { service, requests, local } = await rainContext(t, { request: async (_url, _kind, req) => {
    req.response.headers = { 'Retry-After': '3600' };
    return { code: '429' };
  } });
  await service.setupRain();
  const second = await initializedContext();
  second.fm = local;
  second.data.location = required(service.data.location);
  await second.setupWeather();
  assert.equal(requests.length, 1);
});

test('consecutive minutely 429 responses increase the shared retry delay', async t => {
  const { service, requests } = await rainContext(t, { request: async () => ({ code: '429' }) });
  for (const [minutes, count] of [[0, 1], [16, 2], [32, 2], [47, 3], [78, 3], [108, 4]] as const) {
    service.now = new Date(rainNow + minutes * 60000);
    vi.setSystemTime(service.now);
    await service.setupRain();
    assert.equal(requests.length, count, `at minute ${minutes}`);
  }
});

test('OpenWeather, missing credentials and invalid coordinates make no minutely requests', async t => {
  const { service, requests, secrets } = await rainContext(t);
  service.settings.weather.provider = 'openweather';
  await service.setupRain();
  service.settings.weather.provider = 'qweather';
  service.data.location = { latitude: 100, longitude: 0 };
  await service.setupRain();
  service.data.location = { latitude: 31, longitude: 121 };
  secrets.clear();
  await service.setupRain();
  assert.equal(requests.length, 0);
  assert.equal(service.data.rain?.outlook, null);
});

test('saving a changed key clears minutely cooldown while re-saving the same key retains it', async t => {
  const { service, requests } = await rainContext(t, {
    responses: [0, { fields: [rainHost, 'fake-rain-key'] }, 0, 0, { fields: [rainHost, 'corrected-key'] }, 0],
    request: async (_url, _kind, req) => req.headers['X-QW-Api-Key'] === 'corrected-key' ? rainPayload() : { code: '403' }
  });
  await service.setupRain();
  assert.equal(await service.selectWeatherProvider(), true);
  await service.setupRain();
  assert.equal(requests.length, 1);
  assert.equal(await service.selectWeatherProvider(), true);
  assert.equal('rain' in service.data, false);
  await service.setupRain();
  assert.equal(requests.length, 2);
  assert.equal(service.data.rain?.outlook?.state, 'starts');
});
