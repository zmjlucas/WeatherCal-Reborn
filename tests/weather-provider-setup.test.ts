import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, required } from './helpers/scriptable';
import { qweatherPayload } from './helpers/qweather';
import { initializedContext } from './helpers/context';
import { scriptFixture } from './helpers/script-format';
import { saveQWeatherCredentials } from '#source/data/qweather-state';

test('configured QWeather credentials stay out of preferences and shareable exports', async t => {
  const host = 'private.re.qweatherapi.com';
  const key = 'private-test-secret';
  const env = installScriptable(t, { responses: [0, { fields: [host, key] }, 0], request: async url => qweatherPayload(url) });
  const service = await initializedContext(env);
  env.local.writeString('/documents/Test Widget.js', scriptFixture());
  assert.equal(await service.selectWeatherProvider(), true);
  const exported = await service.exportWidget();
  assert.equal(exported.includes(host), false);
  assert.equal(exported.includes(key), false);
  for (const file of [...env.local.store.values(), ...env.cloud.store.values()]) {
    assert.equal(file.value.includes(host), false);
    assert.equal(file.value.includes(key), false);
  }
});

test('QWeather setup verifies credentials before saving and confirms success', async t => {
  let verified = false;
  const env = installScriptable(t, {
    responses: [0, { fields: [' https://test.re.qweatherapi.com/ ', ' fake-secret '] }, 0],
    request: async (url, _kind, request) => {
      assert.equal(env.secrets.has('weather-cal-qweather-key:test.re.qweatherapi.com'), false);
      assert.equal(env.secrets.has('weather-cal-qweather-host:Test Widget'), false);
      assert.equal(request.headers['X-QW-Api-Key'], 'fake-secret');
      assert.equal(url.includes('fake-secret'), false);
      assert.match(url, /^https:\/\/test\.re\.qweatherapi\.com\/weather\/v1\/current\//);
      verified = true;
      return qweatherPayload(url);
    }
  });
  const service = await initializedContext(env);
  assert.equal(await service.selectWeatherProvider(true), true);
  const prefs = await service.getSettings();
  assert.equal(prefs.weather.provider, 'qweather');
  assert.equal(env.secrets.get('weather-cal-qweather-host:' + service.name), 'test.re.qweatherapi.com');
  assert.equal(env.secrets.get('weather-cal-qweather-key:test.re.qweatherapi.com'), 'fake-secret');
  assert.equal([...env.local.store.values()].some(file => file.value.includes('fake-secret')), false);
  assert.equal(verified, true);
  assert.equal(env.requests.length, 1);
  assert.match(required(env.alerts.at(-1)).title, /verified/i);
  assert.deepEqual(required(env.alerts.at(-1)).actions, ['Continue']);
});

for (const failure of ['unauthorized', 'forbidden', 'rate limit', 'server error', 'API error', 'legacy error', 'malformed', 'offline', 'redirect'] as const) {
  test(`QWeather ${failure} verification preserves the existing configuration and reports failure`, async t => {
    const env = installScriptable(t, {
      responses: [0, { fields: ['replacement.re.qweatherapi.com', 'replacement-secret'] }, 0],
      request: async (url, _kind, request) => {
        if (failure === 'offline') throw new Error('Offline replacement-secret');
        if (failure === 'malformed') return {};
        if (failure === 'API error') return { error: { status: 401, detail: 'replacement-secret' } };
        if (failure === 'legacy error') return { ...qweatherPayload(url) as object, code: '401' };
        if (failure === 'redirect') {
          request.onRedirect?.({ url: 'https://unexpected.test' });
          return qweatherPayload(url);
        }
        request.response.statusCode = failure === 'unauthorized' ? 401 : failure === 'forbidden' ? 403 : failure === 'rate limit' ? 429 : 500;
        return qweatherPayload(url);
      }
    });
    const context = await initializedContext(env);
    saveQWeatherCredentials(context.name, 'original.re.qweatherapi.com', 'original-secret');
    context.fm.writeString(context.prefPath, JSON.stringify({ weather: { provider: 'openweather' }, widget: { preview: 'small' } }));
    context.settings.weather.provider = 'openweather';
    context.data.weatherError = 'previous error';
    const secrets = new Map(env.secrets);
    const files = new Map(env.local.store);
    assert.equal(await context.selectWeatherProvider(), false);
    assert.deepEqual(env.secrets, secrets);
    assert.deepEqual(env.local.store, files);
    assert.equal(context.settings.weather.provider, 'openweather');
    assert.equal(context.data.weatherError, 'previous error');
    assert.equal(env.requests.length, 1);
    const alert = required(env.alerts.at(-1));
    assert.match(alert.title, /verification failed/i);
    assert.equal((alert.title + alert.message).includes('replacement-secret'), false);
    assert.equal((alert.title + alert.message).includes('original-secret'), false);
  });
}

test('a rejected replacement key for the same host keeps the working key', async t => {
  const host = 'test.re.qweatherapi.com';
  const env = installScriptable(t, {
    responses: [0, { fields: [host, 'invalid-replacement'] }, 0],
    request: async (_url, _kind, request) => {
      assert.equal(request.headers['X-QW-Api-Key'], 'invalid-replacement');
      request.response.statusCode = 401;
      throw new Error('Unauthorized');
    }
  });
  const context = await initializedContext(env);
  saveQWeatherCredentials(context.name, host, 'working-key');
  assert.equal(await context.selectWeatherProvider(), false);
  assert.equal(env.secrets.get('weather-cal-qweather-key:' + host), 'working-key');
  assert.match(required(env.alerts.at(-1)).message, /host.*key/i);
});

test('first-run offline verification does not create credentials or preferences', async t => {
  const env = installScriptable(t, { responses: [0, { fields: ['test.re.qweatherapi.com', 'new-key'] }, 0] });
  const context = await initializedContext(env);
  const files = new Map(env.local.store);
  assert.equal(await context.selectWeatherProvider(true), false);
  assert.equal(env.secrets.size, 0);
  assert.deepEqual(env.local.store, files);
  assert.match(required(env.alerts.at(-1)).title, /verification failed/i);
});

test('blank QWeather key verifies the entered host saved key before switching hosts', async t => {
  const env = installScriptable(t, {
    responses: [0, { fields: [' HTTPS://SECOND.RE.QWEATHERAPI.COM/ ', ' '] }, 0],
    request: async (url, _kind, request) => {
      assert.match(url, /^https:\/\/second\.re\.qweatherapi\.com\//);
      assert.equal(request.headers['X-QW-Api-Key'], 'second-key');
      return qweatherPayload(url);
    }
  });
  const context = await initializedContext(env);
  saveQWeatherCredentials(context.name, 'first.re.qweatherapi.com', 'first-key');
  saveQWeatherCredentials('Second', 'second.re.qweatherapi.com', 'second-key');
  assert.equal(await context.selectWeatherProvider(), true);
  assert.equal(env.requests.length, 1);
  assert.equal(env.secrets.get('weather-cal-qweather-host:' + context.name), 'second.re.qweatherapi.com');
  assert.match(required(env.alerts.at(-1)).title, /verified/i);
  assert.deepEqual(required(env.alerts.at(-1)).actions, ['OK']);
});

for (const key of ['same-key', '']) {
  for (const accepted of [true, false]) {
    test(`${accepted ? 'successful' : 'failed'} verification of ${key ? 'the same' : 'a blank'} QWeather key preserves the active cooldown`, async t => {
      const host = 'test.re.qweatherapi.com';
      let verifying = false;
      const env = installScriptable(t, { request: async (url, _kind, request) => {
        if (verifying && accepted) return qweatherPayload(url);
        request.response = { statusCode: 429, headers: { 'Retry-After': '7200' } };
        return { error: { status: 429 } };
      } });
      const context = await initializedContext(env);
      context.data.location = { latitude: 39.92, longitude: 116.41 };
      saveQWeatherCredentials(context.name, host, 'same-key');
      await context.setupWeather();
      assert.equal(env.requests.length, 1);

      verifying = true;
      env.responses.push(0, { fields: [host, key] }, 0);
      assert.equal(await context.selectWeatherProvider(), accepted);
      await context.setupWeather();
      assert.equal(env.requests.length, 2);
      assert.equal(context.data.weather?.currentTemp, null);
      assert(context.data.weatherError);
    });
  }
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
    saveQWeatherCredentials(context.name, hostname, 'old-key');
    await context.setupWeather();
  }
  assert.equal(env.requests.length, 2);

  env.responses.push(0, { fields: [host, 'replacement'] }, 0);
  assert.equal(await first.selectWeatherProvider(), true);
  await first.setupWeather();
  await second.setupWeather();
  assert.equal(first.data.weather?.currentTemp, 20);
  assert.equal(second.data.weather?.currentTemp, null);
  assert.equal(env.requests.length, 6);
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
  assert.equal(env.requests.length, 5);

  for (const [path, file] of env.local.store) {
    if (path.includes('qweather-cache')) file.modified = new Date(context.now.getTime() - 16 * 60000);
  }
  malformed = true;
  await context.setupWeather();
  assert.equal(context.data.weather?.currentTemp, 20);
  assert.equal(env.requests.length, 6);
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
  assert.equal(env.requests.length, 4);
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
