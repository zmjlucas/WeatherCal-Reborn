import { test, vi } from 'vitest';
import assert from 'node:assert/strict';
import { getQWeatherHost, saveQWeatherCredentials, withQWeatherState } from '#source/data/qweather-state';
import { installScriptable, required, runtime } from './helpers/scriptable';

const host = 'first.re.qweatherapi.com';
const otherHost = 'second.re.qweatherapi.com';

async function refresh(hostname = host) {
  return withQWeatherState(hostname, state => state.refresh(request => request('/weather/v1/current/39.92/116.41')));
}

test('credential rotation clears only its host cooldown and preserves the cache namespace', async t => {
  const env = installScriptable(t, { request: async (_url, _kind, request) => {
    if (request.headers['X-QW-Api-Key'] === 'replacement') return { temperature: 21 };
    request.response = { statusCode: 429, headers: { 'Retry-After': '7200' } };
    return { error: { status: 429 } };
  } });
  assert.equal(saveQWeatherCredentials('First', host, 'original'), null);
  assert.equal(saveQWeatherCredentials('Second', otherHost, 'other-key'), null);
  const scope = await withQWeatherState(host, async state => state.cacheScope);
  assert.equal((await refresh()).ok, false);
  assert.equal((await refresh(otherHost)).ok, false);
  assert.equal(env.requests.length, 2);

  for (const key of ['original', '']) {
    assert.equal(saveQWeatherCredentials('First', host, key), null);
    assert.equal((await refresh()).ok, false);
  }
  assert.equal(env.requests.length, 2);
  assert.equal(saveQWeatherCredentials('First', host, 'replacement'), null);
  assert.deepEqual(await refresh(), { ok: true, value: { temperature: 21 } });
  assert.equal(await withQWeatherState(host, async state => state.cacheScope), scope);
  assert.equal((await refresh(otherHost)).ok, false);
  assert.equal(env.requests.length, 3);
});

test('blank key input reuses the entered host credentials after host normalization', async t => {
  const env = installScriptable(t, { request: async (_url, _kind, request) => request.headers['X-QW-Api-Key'] });
  saveQWeatherCredentials('First', host, 'first-key');
  saveQWeatherCredentials('Second', otherHost, 'second-key');
  assert.equal(saveQWeatherCredentials('First', ' HTTPS://SECOND.RE.QWEATHERAPI.COM/ ', ' '), null);
  assert.equal(getQWeatherHost('First'), otherHost);
  assert.deepEqual(await refresh(otherHost), { ok: true, value: 'second-key' });
  assert.equal(env.requests.length, 1);
});

test('invalid credentials leave the previous configuration untouched without requests', t => {
  const env = installScriptable(t);
  saveQWeatherCredentials('Widget', host, 'saved-key');
  const before = new Map(env.secrets);
  for (const invalid of ['http://' + host, host + '.evil.test', host + '/path', host + ':443', '']) {
    assert.equal(saveQWeatherCredentials('Widget', invalid, 'new-key'), 'host');
  }
  assert.equal(saveQWeatherCredentials('Widget', otherHost, ''), 'key');
  assert.equal(saveQWeatherCredentials('Widget', host, 'line\nbreak'), 'key');
  assert.deepEqual(env.secrets, before);
  assert.equal(getQWeatherHost('Widget'), host);
  assert.equal(env.requests.length, 0);
});

test('missing credentials stop refresh before any transport call', async t => {
  const env = installScriptable(t);
  assert.equal(getQWeatherHost('Missing'), null);
  assert.equal((await refresh()).ok, false);
  assert.equal(env.requests.length, 0);
});

test('failed consumers release their host queue while other hosts can proceed', async t => {
  installScriptable(t);
  const order: string[] = [];
  let release = () => {};
  const gate = new Promise<void>(resolve => { release = resolve; });
  const first = withQWeatherState(host, async () => {
    order.push('first');
    await gate;
    throw new Error('consumer failed');
  });
  const failed = assert.rejects(first, /consumer failed/);
  const second = withQWeatherState(host, async () => { order.push('second'); return 2; });
  const other = withQWeatherState(otherHost, async () => { order.push('other'); return 3; });
  assert.equal(await other, 3);
  assert.deepEqual(order, ['first', 'other']);
  release();
  await failed;
  assert.equal(await second, 2);
  assert.equal(await withQWeatherState(host, async () => 4), 4);
  assert.deepEqual(order, ['first', 'other', 'second']);
});

test('refresh paces endpoints and reads the current key for every request', async t => {
  let now = Date.now();
  const times: number[] = [];
  const keys: string[] = [];
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
  t.onTestFinished(() => clock.mockRestore());
  installScriptable(t, { request: async (_url, _kind, request) => {
    times.push(now);
    keys.push(required(request.headers['X-QW-Api-Key']));
    if (keys.length === 1) saveQWeatherCredentials('Widget', host, 'rotated');
    return keys.length;
  } });
  runtime.Timer.schedule = (delay, _repeat, callback) => { now += delay; callback(); };
  saveQWeatherCredentials('Widget', host, 'original');
  const result = await withQWeatherState(host, state => state.refresh(async request => [
    await request('/current'), await request('/hourly'), await request('/daily')
  ]));
  assert.deepEqual(result, { ok: true, value: [1, 2, 3] });
  assert.deepEqual(keys, ['original', 'rotated', 'rotated']);
  assert.equal(required(times[1]) - required(times[0]), 1000);
  assert.equal(required(times[2]) - required(times[1]), 1000);
});

test('transient failures back off across attempts and success resets the failure count', async t => {
  let now = Date.now();
  let failing = true;
  const clock = vi.spyOn(Date, 'now').mockImplementation(() => now);
  t.onTestFinished(() => clock.mockRestore());
  const env = installScriptable(t, { request: async () => {
    if (failing) throw new Error('Offline');
    return 'available';
  } });
  runtime.Timer.schedule = (delay, _repeat, callback) => { now += delay; callback(); };
  saveQWeatherCredentials('Widget', host, 'saved-key');
  assert.equal((await refresh()).ok, false);
  now += 15 * 60000 - 1;
  await refresh();
  assert.equal(env.requests.length, 1);
  now += 1;
  await refresh();
  assert.equal(env.requests.length, 2);
  now += 30 * 60000 - 1;
  await refresh();
  assert.equal(env.requests.length, 2);
  now += 1;
  failing = false;
  assert.deepEqual(await refresh(), { ok: true, value: 'available' });
  failing = true;
  now += 1000;
  await refresh();
  now += 15 * 60000;
  await refresh();
  assert.equal(env.requests.length, 5);
});

test('response processing failures also start cooldown before another refresh', async t => {
  const env = installScriptable(t, { request: async () => ({ malformed: true }) });
  saveQWeatherCredentials('Widget', host, 'saved-key');
  const result = await withQWeatherState(host, state => state.refresh(async request => {
    await request('/current');
    throw new Error('Weather parsing or persistence failed');
  }));
  assert.equal(result.ok, false);
  assert.equal((await refresh()).ok, false);
  assert.equal(env.requests.length, 1);
});
