import { initializedContext } from './helpers/context';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, required, inspect, mockColor } from './helpers/scriptable';

test('cache distinguishes refresh age, hard expiry, never-refresh and malformed content', async t => {
  const env = installScriptable(t);
  const code = await initializedContext(env);
  code.now = new Date('2026-09-08T12:00:00Z');
  env.local.writeString('/cache', '{"temp":20}');
  required(env.local.store.get('/cache')).modified = new Date('2026-09-08T11:30:00Z');
  assert.equal(required(code.getCache('/cache', 1, 60)).cacheExpired, true);
  assert.equal(required(code.getCache('/cache', 60, 60)).temp, 20);
  assert.equal(required(code.getCache('/cache', -1)).cacheExpired, undefined);
  assert.equal(required(code.getCache('/cache', 0)).cacheExpired, true);
  assert.equal(code.getCache('/cache', 1, 15), null);
  env.local.writeString('/cache', 'invalid');
  assert.equal(code.getCache('/cache'), null);
});

test('text formatting applies inheritance, capitalization and dynamic colors', async t => {
  const env = installScriptable(t, { dark: true });
  const code = await initializedContext(env);
  code.settings.widget.instantDark = true;
  code.format.defaultText = { font: 'regular', size: '14', color: 'ffffff', dark: '123456', caps: '' };
  const stack = new env.Stack();
  const text = inspect(code.provideText('Hello world', stack, { caps: code.enum.caps.upper, size: '18' }, false, 'https://example.com'));
  assert.equal(text.text, 'HELLO WORLD');
  assert.equal(text.font.size, 18);
  assert.equal(text.textColor.hex, '123456');
  assert.equal(text.url, 'https://example.com');
  assert.equal(code.provideText(null, stack).text, '--');
});

test('temperature drawing handles equal bounds and missing weather without invalid coordinates', async t => {
  installScriptable(t);
  const code = await initializedContext();
  await code.setupWeather();
  Object.assign(required(code.data.weather), { currentTemp: 10, todayHigh: 10, todayLow: 10 });
  code.provideColor = () => mockColor('ffffff');
  assert.doesNotThrow(() => code.provideTempBar());
  Object.assign(required(code.data.weather), { currentTemp: null, todayHigh: null, todayLow: null });
  assert.doesNotThrow(() => code.provideTempBar());
  assert.equal(inspect(new (installScriptable(t).Stack)().addImage(code.provideConditionSymbol(999, false))).image.symbol, 'exclamationmark.circle');
});
