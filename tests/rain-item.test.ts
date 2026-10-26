import { test, vi } from 'vitest';
import type { TestContext } from 'vitest';
import assert from 'node:assert/strict';
import { rainContext, rainPayload, rainNow } from './helpers/rain';
import { texts, descendants } from './helpers/scriptable';
import type { EnvironmentOptions } from './helpers/scriptable';

async function renderContext(t: TestContext, options: EnvironmentOptions = {}) {
  const env = await rainContext(t, options);
  env.service.widget = new env.Stack();
  env.service.formatTime = date => date.toLocaleTimeString('en-GB', { timeZone: 'Asia/Shanghai', hour: '2-digit', minute: '2-digit' });
  return env;
}

test('rain item renders absolute onset and update times without depending on future weather settings', async t => {
  const { service, Stack, requests } = await renderContext(t);
  service.settings.weather.showRain = false;
  service.settings.weather.tomorrowShownAtHour = '0';
  const column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['Rain expected around 12:20', 'Updated 12:00 · QWeather']);
  assert.equal(descendants(column).find(node => node.text.includes('QWeather'))?.url, 'https://www.qweather.com/');
  assert.equal(service.widget.refreshAfterDate?.getTime(), rainNow + 5 * 60000);
  service.widget.refreshAfterDate = new Date(rainNow + 60000);
  await service.rain(new Stack());
  assert.equal(service.widget.refreshAfterDate.getTime(), rainNow + 60000);
  assert.equal(requests.length, 1);
});

for (const [amounts, expected] of [
  [Array.from({ length: 24 }, (_, i) => i < 7 ? 0.2 : 0), 'Rain expected to stop around 12:35'],
  [Array(24).fill(0.2), 'Rain expected through 14:00'],
  [Array(24).fill(0), 'No precipitation expected through 14:00']
] as const) {
  test(`rain item displays ${expected}`, async t => {
    const { service, Stack } = await renderContext(t, { request: async () => rainPayload(amounts) });
    const column = new Stack();
    await service.rain(column);
    assert.equal(texts(column)[0], expected);
  });
}

test('rain item uses Chinese weather language and never extends the cached forecast window', async t => {
  let broken = false;
  const { service, Stack, requests } = await renderContext(t, { request: async () => {
    if (broken) throw Error('Offline');
    const raw = rainPayload(Array(24).fill(0));
    return raw;
  } });
  service.settings.weather.locale = 'zh_Hans_CN';
  let column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['预计14:00前无降水', '更新于12:00 · 和风天气']);
  assert.equal(new URL(requests[0]!).searchParams.get('lang'), 'zh');
  broken = true;
  service.now = new Date(rainNow + 10 * 60000);
  vi.setSystemTime(service.now);
  column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['预计14:00前无降水', '更新于12:00 · 和风天气']);
  service.now = new Date(rainNow + 16 * 60000);
  vi.setSystemTime(service.now);
  column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['短临降水预报暂不可用']);
});

test('rain item describes snow separately', async t => {
  const { service, Stack } = await renderContext(t, { request: async () => {
    const raw = rainPayload();
    raw.minutely.forEach(point => { point.type = 'snow'; });
    return raw;
  } });
  service.settings.weather.locale = 'zh';
  const column = new Stack();
  await service.rain(column);
  assert.equal(texts(column)[0], '预计约12:20开始降雪');
});

test('rain item reports unavailable and requires QWeather rather than inventing clear conditions', async t => {
  const { service, Stack, requests } = await renderContext(t, { request: async () => ({ code: '204' }) });
  let column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['Rain forecast unavailable']);
  service.settings.weather.provider = 'openweather';
  column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['Rain nowcast requires QWeather']);
  assert.equal(requests.length, 1);
});

test('rain is available through real layouts and layouts without it make no minutely requests', async t => {
  const { service, requests } = await renderContext(t);
  const plain = await service.createWidget('row\ncolumn\ntext(Hello)', service.name, false);
  assert.deepEqual(texts(plain), ['Hello']);
  assert.equal(requests.length, 0);
  const widget = await service.createWidget('row\ncolumn\nrain', service.name, false);
  assert.deepEqual(texts(widget), ['Rain expected around 12:20', 'Updated 12:00 · QWeather']);
  assert.equal(requests.length, 1);
});
