import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initializedContext } from './helpers/context';
import { installScriptable } from './helpers/scriptable';

for (const failure of ['401', 'offline', 'null', 'empty', 'invalid current', 'empty current', 'invalid temperature', 'API error with current', 'HTTP error with current'] as const) {
  test(`editing an OpenWeather key preserves the working key after ${failure}`, async t => {
    const env = installScriptable(t, {
      responses: [{ fields: [' fake-replacement-key '] }],
      request: async (_url, _kind, request) => {
        if (failure === 'offline') throw new Error('Offline');
        if (failure === '401') { request.response.statusCode = 401; return { cod: 401, message: 'Invalid API key' }; }
        if (failure === 'null') return null;
        if (failure === 'invalid current') return { current: 'invalid' };
        if (failure === 'empty current') return { current: {} };
        if (failure === 'invalid temperature') return { current: { temp: 'invalid' } };
        if (failure === 'API error with current') return { cod: 401, current: { temp: 21 } };
        if (failure === 'HTTP error with current') { request.response.statusCode = 503; return { current: { temp: 21 } }; }
        return {};
      },
    });
    const host = await initializedContext(env);
    const keyPath = '/library/weather-cal-api-key';
    const endpointPath = '/library/weather-cal-api-path';
    env.local.writeString(keyPath, 'fake-working-key');
    env.local.writeString(endpointPath, 'https://api.openweathermap.org/data/2.5/onecall');
    const original = env.local.store.get(keyPath);
    const originalEndpoint = env.local.store.get(endpointPath);
    assert.equal(await host.getWeatherKey(false), false);
    assert.equal(env.local.readString(keyPath), 'fake-working-key');
    assert.equal(env.local.store.get(keyPath), original);
    assert.equal(env.local.store.get(endpointPath), originalEndpoint);
  });
}

test('successful editing verifies the candidate before replacing the shared key', async t => {
  const seen: string[] = [];
  const env = installScriptable(t, {
    responses: [{ fields: [' fake-replacement-key '] }],
    request: async url => {
      assert.equal(new URL(url).searchParams.get('appid'), 'fake-replacement-key');
      seen.push(env.local.readString('/library/weather-cal-api-key'));
      return { current: { temp: 21 } };
    },
  });
  const host = await initializedContext(env);
  env.local.writeString('/library/weather-cal-api-key', 'fake-working-key');
  assert.equal(await host.getWeatherKey(false), true);
  assert.deepEqual(seen, ['fake-working-key']);
  assert.equal(env.local.readString('/library/weather-cal-api-key'), 'fake-replacement-key');
});

test('first-run setup still accepts a key waiting for activation', async t => {
  const env = installScriptable(t, {
    responses: [{ fields: [' fake-unactivated-key '] }],
    request: async () => ({ cod: 401, message: 'Not active' }),
  });
  const host = await initializedContext(env);
  assert.equal(await host.getWeatherKey(true), true);
  assert.equal(env.local.readString('/library/weather-cal-api-key'), 'fake-unactivated-key');
});
