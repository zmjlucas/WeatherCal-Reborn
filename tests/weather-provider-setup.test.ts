import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable } from './helpers/scriptable';
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

test('QWeather attribution is rendered with weather including when high-low display is disabled', async t => {
  const env = installScriptable(t);
  const service = await initializedContext(env);
  service.setupWeather = async () => {
    service.data.weather = { currentTemp: 20, currentCondition: 800, currentDescription: 'Clear', todayHigh: 24, todayLow: 10, forecast: [], hourly: [], tomorrowRain: null, nextHourRain: null };
    service.data.weatherAttributions = ['Source statement'];
  };
  service.setupSunrise = async () => { service.data.sun = { sunrise: null, sunset: null, tomorrow: null }; };
  service.fm.writeString(service.prefPath, JSON.stringify({ weather: { showHighLow: false } }));
  const widget = await service.createWidget('row\n column\n current', service.name, false);
  const rendered = JSON.stringify(widget);
  assert.match(rendered, /QWeather/);
  assert.match(rendered, /Source statement/);
});
