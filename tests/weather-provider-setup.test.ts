import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, required } from './helpers/scriptable';
import { qweatherPayload } from './helpers/qweather';
import { initializedContext } from './helpers/context';
import { scriptFixture } from './helpers/script-format';

test('configured QWeather credentials stay out of preferences and shareable exports', async t => {
  const host = 'private.re.qweatherapi.com';
  const key = 'private-test-secret';
  const env = installScriptable(t, { responses: [0, { fields: [host, key] }, 0] });
  const service = await initializedContext(env);
  env.local.writeString('/documents/Test Widget.js', scriptFixture());
  await service.selectWeatherProvider();
  const exported = await service.exportWidget();
  assert.equal(exported.includes(host), false);
  assert.equal(exported.includes(key), false);
  for (const file of [...env.local.store.values(), ...env.cloud.store.values()]) {
    assert.equal(file.value.includes(host), false);
    assert.equal(file.value.includes(key), false);
  }
});

test('QWeather setup stores key in Keychain and selects default without using network quota', async t => {
  const env = installScriptable(t, { responses: [0, { fields: [' https://test.re.qweatherapi.com/ ', ' fake-secret '] }, 0] });
  const service = await initializedContext(env);
  assert.equal(await service.selectWeatherProvider(true), true);
  const prefs = await service.getSettings();
  assert.equal(prefs.weather.provider, 'qweather');
  assert.equal(env.secrets.get('weather-cal-qweather-host:' + service.name), 'test.re.qweatherapi.com');
  assert.equal(env.secrets.get('weather-cal-qweather-key:test.re.qweatherapi.com'), 'fake-secret');
  assert.equal([...env.local.store.values()].some(file => file.value.includes('fake-secret')), false);
  assert.equal(env.requests.length, 0);
});

for (const key of ['same-key', '']) {
  test('saving ' + (key ? 'the same' : 'a blank') + ' QWeather key in setup preserves the active cooldown', async t => {
    const host = 'test.re.qweatherapi.com';
    const env = installScriptable(t, { request: async (_url, _kind, request) => {
      request.response = { statusCode: 429, headers: { 'Retry-After': '7200' } };
      return { error: { status: 429 } };
    } });
    const context = await initializedContext(env);
    context.data.location = { latitude: 39.92, longitude: 116.41 };
    env.responses.push(0, { fields: [host, 'same-key'] }, 0);
    assert.equal(await context.selectWeatherProvider(), true);
    await context.setupWeather();
    assert.equal(env.requests.length, 1);

    env.responses.push(0, { fields: [host, key] }, 0);
    assert.equal(await context.selectWeatherProvider(), true);
    await context.setupWeather();
    assert.equal(env.requests.length, 1);
    assert.equal(context.data.weather?.currentTemp, null);
    assert(context.data.weatherError);
  });
}

test('rotating a key through setup permits weather recovery without releasing another host', async t => {
  const host = 'first.re.qweatherapi.com';
  const secondHost = 'second.re.qweatherapi.com';
  const env = installScriptable(t, { request: async (url, _kind, request) => {
    if (request.headers['X-QW-Api-Key'] === 'replacement') return qweatherPayload(url);
    request.response = { statusCode: 429, headers: { 'Retry-After': '7200' } };
    return { error: { status: 429 } };
  } });
  const first = await initializedContext(env, 'First');
  const second = await initializedContext(env, 'Second');
  for (const [context, hostname] of [[first, host], [second, secondHost]] as const) {
    context.data.location = { latitude: 39.92, longitude: 116.41 };
    context.settings.widget.units = 'metric';
    env.responses.push(0, { fields: [hostname, 'old-key'] }, 0);
    assert.equal(await context.selectWeatherProvider(), true);
    await context.setupWeather();
  }
  assert.equal(env.requests.length, 2);

  env.responses.push(0, { fields: [host, 'replacement'] }, 0);
  assert.equal(await first.selectWeatherProvider(), true);
  await first.setupWeather();
  await second.setupWeather();
  assert.equal(first.data.weather?.currentTemp, 20);
  assert.equal(second.data.weather?.currentTemp, null);
  assert.equal(env.requests.length, 5);
});

test('a key changed in setup retains fresh weather and its bounded stale fallback', async t => {
  const host = 'test.re.qweatherapi.com';
  let malformed = false;
  const keys: string[] = [];
  const env = installScriptable(t, { request: async (url, _kind, request) => {
    keys.push(required(request.headers['X-QW-Api-Key']));
    return malformed ? {} : qweatherPayload(url);
  } });
  const context = await initializedContext(env);
  context.settings.widget.units = 'metric';
  context.data.location = { latitude: 39.92, longitude: 116.41 };
  env.responses.push(0, { fields: [host, 'original'] }, 0);
  await context.selectWeatherProvider();
  await context.setupWeather();
  assert.equal(context.data.weather?.currentTemp, 20);

  env.responses.push(0, { fields: [host, 'replacement'] }, 0);
  await context.selectWeatherProvider();
  await context.setupWeather();
  assert.equal(context.data.weather?.currentTemp, 20);
  assert.equal(env.requests.length, 3);

  for (const [path, file] of env.local.store) {
    if (path.includes('qweather-cache')) file.modified = new Date(context.now.getTime() - 16 * 60000);
  }
  malformed = true;
  await context.setupWeather();
  assert.equal(context.data.weather?.currentTemp, 20);
  assert.equal(env.requests.length, 4);
  assert.equal(keys.at(-1), 'replacement');
});

test('fresh cached weather remains usable when its host key is missing', async t => {
  const host = 'test.re.qweatherapi.com';
  const env = installScriptable(t, { request: async url => qweatherPayload(url) });
  const context = await initializedContext(env);
  context.settings.widget.units = 'metric';
  context.data.location = { latitude: 39.92, longitude: 116.41 };
  env.responses.push(0, { fields: [host, 'original'] }, 0);
  await context.selectWeatherProvider();
  await context.setupWeather();
  env.secrets.delete('weather-cal-qweather-key:' + host);
  const { response } = await context.loadWeatherData(1, 60);
  assert.equal(response?.current?.temp, 20);
  assert.equal(env.requests.length, 3);
});

test('provider selection can switch to OpenWeather without removing the QWeather key', async t => {
  const env = installScriptable(t, { responses: [1, { fields: [' ow-key '] }, 0], request: async () => ({ current: { temp: 12 } }) });
  const service = await initializedContext(env);
  env.secrets.set('weather-cal-qweather-key:test.re.qweatherapi.com', 'q-key');
  assert.equal(await service.selectWeatherProvider(), true);
  assert.equal((await service.getSettings()).weather.provider, 'openweather');
  assert.equal(env.local.readString('/library/weather-cal-api-key'), 'ow-key');
  assert.equal(env.secrets.size, 1);
});

test('canceled or invalid QWeather setup leaves prior preferences and key intact', async t => {
  const env = installScriptable(t, { responses: [-1, 0, { index: 1, fields: ['test.re.qweatherapi.com', 'changed'] }, 0, { fields: ['https://evil.test', 'changed'] }, 0] });
  const service = await initializedContext(env);
  service.fm.writeString(service.prefPath, JSON.stringify({ weather: { provider: 'openweather' }, widget: { preview: 'small' } }));
  env.secrets.set('weather-cal-qweather-key:test.re.qweatherapi.com', 'saved');
  const before = service.fm.readString(service.prefPath);
  for (let index = 0; index < 3; index++) assert.equal(await service.selectWeatherProvider(), false);
  assert.equal(service.fm.readString(service.prefPath), before);
  assert.equal(env.secrets.get('weather-cal-qweather-key:test.re.qweatherapi.com'), 'saved');
  assert.equal(env.requests.length, 0);
});
