const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable } = require('./helpers/scriptable');

test('cache distinguishes refresh age, hard expiry, never-refresh and malformed content', t => {
  const env = installScriptable(t);
  const code = Object.assign({ fm: env.local, now: new Date('2026-09-08T12:00:00Z') }, require('../src/core/storage'));
  env.local.writeString('/cache', '{"temp":20}');
  env.local.store.get('/cache').modified = new Date('2026-09-08T11:30:00Z');
  assert.equal(code.getCache('/cache', 1, 60).cacheExpired, true);
  assert.equal(code.getCache('/cache', 60, 60).temp, 20);
  assert.equal(code.getCache('/cache', -1).cacheExpired, undefined);
  assert.equal(code.getCache('/cache', 0).cacheExpired, true);
  assert.equal(code.getCache('/cache', 1, 15), null);
  env.local.writeString('/cache', 'invalid');
  assert.equal(code.getCache('/cache'), null);
});

test('text formatting applies inheritance, capitalization and dynamic colors', t => {
  const env = installScriptable(t, { dark: true });
  const code = Object.assign({ settings: { widget: { instantDark: true } }, format: { defaultText: { font: 'regular', size: '14', color: 'ffffff', dark: '123456', caps: '' } }, enum: { caps: { upper: 'upper', lower: 'lower', title: 'title' } } }, require('../src/core/formatting'));
  const stack = new env.Stack();
  const text = code.provideText('Hello world', stack, { caps: 'upper', size: '18' }, false, 'https://example.com');
  assert.equal(text.text, 'HELLO WORLD');
  assert.equal(text.font.size, 18);
  assert.equal(text.textColor.hex, '123456');
  assert.equal(text.url, 'https://example.com');
  assert.equal(code.provideText(null, stack).text, '--');
});

test('temperature drawing handles equal bounds and missing weather without invalid coordinates', t => {
  installScriptable(t);
  const code = Object.assign({ data: { weather: { currentTemp: 10, todayHigh: 10, todayLow: 10 } }, format: {}, provideColor: () => Color.white() }, require('../src/core/drawing'));
  assert.doesNotThrow(() => code.provideTempBar());
  code.data.weather = { currentTemp: null, todayHigh: null, todayLow: null };
  assert.doesNotThrow(() => code.provideTempBar());
  assert.equal(code.provideConditionSymbol(999).symbol, 'exclamationmark.circle');
});
