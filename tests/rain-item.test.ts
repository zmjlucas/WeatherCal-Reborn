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

test('rain item renders the API summary without depending on future weather settings', async t => {
  const { service, Stack, requests } = await renderContext(t);
  service.settings.weather.showRain = false;
  service.settings.weather.tomorrowShownAtHour = '0';
  const column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['Rain in 20 minutes']);
  assert.equal(descendants(column).find(node => node.type === 'text')?.url, 'https://www.qweather.com/');
  const cachedColumn = new Stack();
  await service.rain(cachedColumn);
  assert.deepEqual(texts(cachedColumn), ['Rain in 20 minutes']);
  assert.equal(requests.length, 1);
});

for (const [amounts, summary] of [
  [Array.from({ length: 24 }, (_, i) => i < 7 ? 0.2 : 0), 'Rain will stop in 35 minutes'],
  [Array(24).fill(0.2), 'Rain for the next two hours'],
  [Array(24).fill(0), 'No precipitation for the next two hours']
] as const) {
  test(`rain item displays the provider summary: ${summary}`, async t => {
    const { service, Stack } = await renderContext(t, { request: async () => ({ ...rainPayload(amounts), summary }) });
    const column = new Stack();
    await service.rain(column);
    assert.deepEqual(texts(column), [summary]);
  });
}

test('rain item displays the Chinese API summary only while the cached forecast is valid', async t => {
  let broken = false;
  const { service, Stack, requests } = await renderContext(t, { request: async () => {
    if (broken) throw Error('Offline');
    return { ...rainPayload(Array(24).fill(0)), summary: '未来两小时无降水' };
  } });
  service.settings.weather.locale = 'zh_Hans_CN';
  let column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['未来两小时无降水']);
  assert.equal(new URL(requests[0]!).searchParams.get('lang'), 'zh');
  broken = true;
  service.now = new Date(rainNow + 10 * 60000);
  vi.setSystemTime(service.now);
  column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['未来两小时无降水']);
  service.now = new Date(rainNow + 16 * 60000);
  vi.setSystemTime(service.now);
  column = new Stack();
  await service.rain(column);
  assert.deepEqual(texts(column), ['短临降水预报暂不可用']);
});

for (const summary of [undefined, null, '', '   ', 42]) {
  test(`rain item reports unavailable for summary ${JSON.stringify(summary)} while retaining parsed data`, async t => {
    const { service, Stack } = await renderContext(t, { request: async () => ({ ...rainPayload(), summary }) });
    const column = new Stack();
    await service.rain(column);
    assert.deepEqual(texts(column), ['Rain forecast unavailable']);
    assert.deepEqual(service.data.rain?.outlook, { state: 'starts', time: rainNow + 20 * 60000, kind: 'rain' });
  });
}

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
  service.writePreference(null, { widget: { refreshInterval: '25' } }, service.prefPath);
  const plain = await service.createWidget('row\ncolumn\ntext(Hello)', service.name, false);
  assert.deepEqual(texts(plain), ['Hello']);
  assert.equal(plain.refreshAfterDate?.toISOString(), '2026-10-26T04:25:00.000Z');
  assert.equal(requests.length, 0);
  const widget = await service.createWidget('row\ncolumn\nrain', service.name, false);
  assert.deepEqual(texts(widget), ['Rain in 20 minutes']);
  assert.equal(widget.refreshAfterDate?.toISOString(), '2026-10-26T04:25:00.000Z');
  assert.equal(requests.length, 1);
});
