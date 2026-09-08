const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable } = require('./helpers/scriptable');

function context(env) {
  return Object.assign({ fm: env.local, prefPath: '/library/prefs' },
    require('../src/preferences/defaults'), require('../src/preferences/store'));
}

test('persisted preferences merge missing nested fields while retaining false, zero and empty text', async t => {
  const env = installScriptable(t);
  const code = context(env);
  env.local.writeString(code.prefPath, JSON.stringify({ widget: { instantDark: false, padding: '0' }, font: { defaultText: { color: '123456' } }, localization: { noEventMessage: '' } }));
  const settings = await code.getSettings();
  assert.equal(settings.font.defaultText.color, '123456');
  assert.equal(settings.font.defaultText.size, '14');
  assert.equal(settings.widget.padding, '0');
  assert.equal(settings.widget.instantDark, false);
  assert.equal(settings.localization.noEventMessage, '');
  const editable = await code.getSettings(true);
  assert.equal(editable.font.defaultText.val.color, '123456');
  assert.equal(typeof editable.font.name, 'string');
});

test('settings remain available with malformed JSON or rejected calendar permissions', async t => {
  const env = installScriptable(t);
  const code = context(env);
  Calendar.forEvents = async () => { throw Error('Denied'); };
  Calendar.forReminders = async () => { throw Error('Denied'); };
  env.local.writeString(code.prefPath, '{');
  const editable = await code.getSettings(true);
  assert.deepEqual(editable.events.selectCalendars.options, []);
  assert.deepEqual(editable.reminders.selectLists.options, []);
  assert.equal(code.previewValue(), 'large');
});

test('render-time preference loading does not request calendar permissions', async t => {
  const env = installScriptable(t);
  let calls = 0;
  Calendar.forEvents = Calendar.forReminders = async () => { calls++; return []; };
  await context(env).getSettings();
  assert.equal(calls, 0);
});

test('multi-select editor toggles the chosen identifier and refreshes its rows', async t => {
  installScriptable(t);
  const editor = require('../src/preferences/editor');
  const table = new UITable();
  const selected = new Set();
  await editor.loadMultiTable(table, new Set([{ title: 'Work', identifier: 'work' }]), selected);
  await table.rows[0].onSelect();
  assert.deepEqual([...selected], ['work']);
  await table.rows[0].onSelect();
  assert.equal(selected.size, 0);
});

test('font editor preserves entered fields when choosing capitalization', async t => {
  const env = installScriptable(t, { responses: [
    { index: 0, fields: ['42', '123456', 'abcdef', 'bold'] },
    1
  ] });
  const code = Object.assign(context(env), require('../src/core/prompts'), require('../src/preferences/editor'));
  const preferences = await code.getSettings(true);
  const table = new UITable();
  await code.loadPrefsTable(table, preferences.font);
  await table.rows[0].onSelect();
  assert.deepEqual(preferences.font.defaultText.val, {
    size: '42', color: '123456', dark: 'abcdef', font: 'bold', caps: code.enum.caps.lower
  });
  assert.match(table.rows[0].cells[0].subtitle, /size 42 bold/);
});
