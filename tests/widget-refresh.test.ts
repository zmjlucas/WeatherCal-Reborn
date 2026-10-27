import assert from 'node:assert/strict';
import { afterEach, beforeEach, test, vi } from 'vitest';
import { createWeatherCal } from '#source/create';
import { installScriptable, required } from './helpers/scriptable';
import { initializedContext } from './helpers/context';

const layout = 'row\ncolumn\ntext(Hello)';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-27T04:00:00Z'));
});
afterEach(() => { vi.useRealTimers(); });

test('persisted text and numeric refresh intervals determine the next widget refresh', async t => {
  const env = installScriptable(t);
  for (const [refreshInterval, expected] of [
    ['7', '2026-10-27T04:07:00.000Z'],
    [45, '2026-10-27T04:45:00.000Z'],
    [' 30 ', '2026-10-27T04:30:00.000Z'],
  ] as const) {
    env.local.writeString('/library/weather-cal-preferences-Refresh', JSON.stringify({ widget: { refreshInterval } }));
    const widget = await createWeatherCal().createWidget(layout, 'Refresh', false);
    assert.equal(widget.refreshAfterDate?.toISOString(), expected);
  }
});

test('old preferences and invalid intervals still produce a valid future refresh date', async t => {
  const env = installScriptable(t);
  for (const refreshInterval of [undefined, '', 'invalid', '0', '-5', '2.5', 'Infinity', '1e20']) {
    env.local.writeString('/library/weather-cal-preferences-Refresh', JSON.stringify({ widget: { refreshInterval } }));
    const widget = await createWeatherCal().createWidget(layout, 'Refresh', false);
    assert.equal(widget.refreshAfterDate?.toISOString(), '2026-10-27T04:15:00.000Z', String(refreshInterval));
  }
});

test('legacy object layouts use their refresh interval and fall back when it is missing', async t => {
  const env = installScriptable(t);
  const code = await initializedContext(env);
  const settings = await code.getSettings();
  settings.layout = layout;
  settings.widget.refreshInterval = 20;
  const configured = await code.createWidget(settings, code.name, false);
  assert.equal(configured.refreshAfterDate?.toISOString(), '2026-10-27T04:20:00.000Z');
  Reflect.deleteProperty(settings.widget, 'refreshInterval');
  const legacy = await code.createWidget(settings, code.name, false);
  assert.equal(legacy.refreshAfterDate?.toISOString(), '2026-10-27T04:15:00.000Z');
});

test('editing and saving the refresh interval changes subsequent widget renders', async t => {
  const env = installScriptable(t, {
    responses: [{ index: 0, fields: [' 35 '] }],
    table: async table => {
      const category = table.rows.find(row => row.cells[0]?.title === 'Overall settings');
      if (category) await category.onSelect();
      else await required(table.rows.find(row => row.cells[0]?.title === 'Widget refresh interval')).onSelect();
    },
  });
  const code = await initializedContext(env);
  await code.editPreferences();
  const widget = await createWeatherCal().createWidget(layout, code.name, false);
  assert.equal(widget.refreshAfterDate?.toISOString(), '2026-10-27T04:35:00.000Z');
});
