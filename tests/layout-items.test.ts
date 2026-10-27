import { test, expect, vi } from 'vitest';
import { prepareItems } from '#source/items/registry';
import type { ItemModule, LayoutNode, PreparedItem } from '#source/layout/types';
import { initializedContext } from './helpers/context';
import { installScriptable, texts, descendants, mockEvent, mockColor, TestNode } from './helpers/scriptable';
import { rainContext, rainNow } from './helpers/rain';

function item(name: string, id = 'root/0', parameter?: string): LayoutNode {
  return { type: 'item', name, id, source: { offset: 0, line: 1, column: 1 }, props: {}, options: {}, children: [], ...(parameter === undefined ? {} : { parameter }) };
}
function column(...children: LayoutNode[]): LayoutNode {
  return { ...item('column', 'root'), type: 'column', children };
}
async function fixture() {
  const host = await initializedContext();
  host.now = new Date(2026, 9, 27, 22);
  host.padding = 3;
  host.data = {
    location: { locality: '上海' }, events: [], reminders: [],
    sun: { sunrise: host.now.getTime() - 12 * 3600000, sunset: host.now.getTime() - 3600000, tomorrow: host.now.getTime() + 8 * 3600000 },
    weather: { currentTemp: -12, currentCondition: 800, currentDescription: '晴间多云，温度继续降低', todayHigh: -8, todayLow: -17, nextHourRain: 2, tomorrowRain: null, tomorrowRainByPeriod: { daytime: 80, nighttime: 20 }, hourly: [{ Temp: -12, Condition: 800 }, { Temp: -15, Condition: 801 }], forecast: [{ High: -8, Low: -17, Condition: 800 }, { High: -4, Low: -15, Condition: 801 }] },
  };
  Object.assign(host.settings.weather, { showLocation: true, showCondition: true, showHighLow: true, showRain: true, tomorrowShownAtHour: '20', showDays: '2', showHours: '2', showToday: true });
  return host;
}
function render(prepared: PreparedItem, Stack: ReturnType<typeof installScriptable>['Stack'], variant = prepared.variants[0]!.id, width = 500) {
  const target = new Stack();
  const height = prepared.variants.find(candidate => candidate.id === variant)!.measure(width).requiredHeight;
  prepared.render(target, { id: 'root/0', variant, width, height, textAlign: 'start' });
  return target;
}

test('validates every item and private option before preparing or loading data', async t => {
  installScriptable(t);
  const host = await fixture();
  delete host.data.weather;
  const load = vi.fn(async () => {});
  host.setupWeather = load;
  await expect(prepareItems(column(item('current'), item('unknown', 'root/1')), host)).rejects.toMatchObject({ diagnostic: { code: 'UNKNOWN_ITEM', nodeId: 'root/1' } });
  const wrong = item('current', 'root/1'); wrong.options.mistyped = true;
  await expect(prepareItems(column(item('current'), wrong), host)).rejects.toMatchObject({ diagnostic: { code: 'UNKNOWN_PROPERTY' } });
  wrong.options = { toString: 'not an option' };
  await expect(prepareItems(column(item('current'), wrong), host)).rejects.toMatchObject({ diagnostic: { code: 'UNKNOWN_PROPERTY' } });
  expect(load).not.toHaveBeenCalled();
});

test('prepares all built-ins without native views and keeps duplicate instance identity', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  host.settings.weather.provider = 'openweather';
  const names = ['date', 'greeting', 'events', 'reminders', 'current', 'future', 'rain', 'forecast', 'daily', 'hourly', 'sunrise', 'sunset', 'text', 'battery', 'week', 'symbol', 'current'];
  const root = column(...names.map((name, index) => item(name, `root/${index}`, name === 'text' ? 'Hello 世界' : name === 'symbol' ? 'cloud.fill' : undefined)));
  vi.stubGlobal('ListWidget', class { constructor() { throw new Error('Native views cannot be created during prepare'); } });
  const prepared = await prepareItems(root, host);
  expect(prepared.size).toBe(names.length);
  for (const [id, entry] of prepared) {
    expect(texts(render(entry, Stack)).length + descendants(render(entry, Stack)).filter(node => node.type === 'image').length, id).toBeGreaterThan(0);
    for (const variant of entry.variants) {
      const measured = variant.measure(Math.max(500, variant.minWidth));
      expect(Number.isFinite(measured.requiredHeight), `${id}/${variant.id}`).toBe(true);
      expect(measured.requiredHeight).toBeGreaterThan(0);
    }
  }
});

test('shares pending weather data once across current, future and repeated modules', async t => {
  installScriptable(t);
  const host = await fixture();
  const weather = host.data.weather!;
  delete host.data.weather;
  let reads = 0;
  host.setupWeather = async function () { reads++; await Promise.resolve(); this.data.weather = weather; };
  const prepared = await prepareItems(column(item('current', 'root/0'), item('future', 'root/1'), item('current', 'root/2')), host);
  expect(prepared.size).toBe(3);
  expect(reads).toBe(1);
});

test('orientation variants retain every weather field and prepared snapshots stay stable', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  const prepared = await prepareItems(column(item('current'), item('future', 'root/1'), item('daily', 'root/2')), host);
  for (const id of ['root/0', 'root/2']) {
    const entry = prepared.get(id)!;
    expect(entry.variants.length).toBeGreaterThan(1);
    expect(texts(render(entry, Stack, entry.variants[0]!.id)).sort()).toEqual(texts(render(entry, Stack, entry.variants[1]!.id)).sort());
  }
  const current = prepared.get('root/0')!;
  const before = texts(render(current, Stack));
  host.settings.weather.showCondition = false;
  host.data.weather!.currentDescription = 'Changed';
  expect(texts(render(current, Stack))).toEqual(before);
  const future = texts(render(prepared.get('root/1')!, Stack)).join(' ');
  expect(future).toContain('80%'); expect(future).toContain('20%');
});

test('long multilingual text and event titles require more height at narrow widths with the same fonts', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  host.data.events = [mockEvent({ title: '这是一个很长的活动标题 with many English words to wrap across several lines', isAllDay: true, calendar: { color: mockColor('123456') } })];
  const prepared = await prepareItems(column(item('text', 'root/0', '这是一个很长的文本，用来测试不同宽度下的换行。 Long text that must wrap at narrow widths.'), item('events', 'root/1')), host);
  for (const entry of prepared.values()) {
    const variant = entry.variants[0]!;
    expect(variant.measure(100).requiredHeight).toBeGreaterThan(variant.measure(400).requiredHeight);
    const rendered = render(entry, Stack, variant.id, 100);
    expect(rendered.children[0]!.size.height).toBe(variant.measure(100).requiredHeight);
  }
});

test('rain includes source/update text and exposes refresh as an effect without creating a widget', async t => {
  const { service, Stack, requests } = await rainContext(t);
  service.formatTime = date => date.toISOString().slice(11, 16);
  const entry = (await prepareItems(item('rain'), service)).get('root/0')!;
  const rendered = render(entry, Stack);
  expect(texts(rendered).join(' ')).toContain('Updated');
  expect(descendants(rendered).some(node => node.url === 'https://www.qweather.com/')).toBe(true);
  expect(entry.effects.refreshAfterDate?.getTime()).toBe(rainNow + 300000);
  expect(requests).toHaveLength(1);
  expect(entry.variants[0]!.measure(1000).requiredHeight).toBeGreaterThanOrEqual((Number(service.format.smallTemp!.size) + Number(service.format.tinyTemp!.size)) * 1.35);
});

test('empty and failing data have visible measured states', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  const empty = (await prepareItems(item('events'), host)).get('root/0')!;
  expect(empty.state).toBe('empty'); expect(texts(render(empty, Stack))).toEqual([host.localization.noEventMessage]);
  delete host.data.weather;
  host.setupWeather = async () => { throw Error('Offline'); };
  const failed = (await prepareItems(item('current'), host)).get('root/0')!;
  expect(failed.state).toBe('error'); expect(texts(render(failed, Stack)).join(' ')).toMatch(/weather.*unavailable/i);
});

test('unavailable forecast values are explicit empty states and sun entries remain visible at night', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  host.data.weather!.forecast = [{ High: null, Low: null, Condition: 100 }, { High: null, Low: null, Condition: 100 }];
  host.data.weather!.hourly = [{ Temp: null, Condition: 100 }, { Temp: null, Condition: 100 }];
  delete host.data.weather!.tomorrowRainByPeriod;
  host.data.weather!.nextHourRain = null;
  const prepared = await prepareItems(column(...['future', 'daily', 'hourly', 'sunrise', 'sunset'].map((name, index) => item(name, `root/${index}`))), host);
  for (const id of ['root/0', 'root/1', 'root/2']) {
    const entry = prepared.get(id)!;
    expect(entry.state).toBe('empty');
    expect(texts(render(entry, Stack)).join(' ')).toMatch(/forecast/i);
  }
  for (const id of ['root/3', 'root/4']) expect(texts(render(prepared.get(id)!, Stack)).length).toBeGreaterThan(0);
});

test('blank calendar messages receive visible localized fallbacks and sunrise uses available tomorrow data at night', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  host.localization.noEventMessage = '';
  host.localization.noRemindersMessage = '';
  host.data.sun!.sunrise = null;
  const prepared = await prepareItems(column(item('events'), item('reminders', 'root/1'), item('sunrise', 'root/2')), host);
  expect(texts(render(prepared.get('root/0')!, Stack))).toEqual(['No upcoming events']);
  expect(texts(render(prepared.get('root/1')!, Stack))).toEqual(['No reminders']);
  expect(prepared.get('root/2')!.state).toBe('ready');
  expect(texts(render(prepared.get('root/2')!, Stack))).toEqual([host.formatTime(new Date(host.data.sun!.tomorrow!))]);
});

test('prepared rendering implements scoped end alignment and keeps configured fonts', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  host.format.customText!.size = '21';
  Object.defineProperty(TestNode.prototype, 'rightAlignText', { configurable: true, value(this: TestNode) { this.alignment = 'end'; } });
  t.onTestFinished(() => { Reflect.deleteProperty(TestNode.prototype, 'rightAlignText'); });
  const entry = (await prepareItems(item('text', 'root/0', 'Hello'), host)).get('root/0')!;
  const variant = entry.variants[0]!;
  const end = new Stack();
  entry.render(end, { id: 'root/0', variant: variant.id, width: 300, height: variant.measure(300).requiredHeight, textAlign: 'end' });
  const text = descendants(end).find(node => node.type === 'text')!;
  expect(text.alignment).toBe('end');
  expect(Reflect.get(Reflect.get(text, 'font') as object, 'size')).toBe(21);
  expect(Reflect.get(text, 'minimumScaleFactor')).toBe(1);
});

test('custom modules receive named options once and share promise resources', async t => {
  const { Stack } = installScriptable(t);
  const host = await fixture();
  const calls: unknown[] = []; let loads = 0;
  const module: ItemModule = { options: { label: 'string' }, async prepare(context, options) {
    calls.push(options);
    const value = await context.get('custom-data', async () => { loads++; return 9; });
    return { state: 'ready', effects: {}, variants: [{ id: 'normal', minWidth: 20, preferredWidth: 30, adaptationCost: 0, measure: () => ({ requiredHeight: 20, preferredHeight: 20, confidence: 'estimated' }) }], render(container) { container.addText(`${options.label}:${value}`); } };
  } };
  const first = item('custom'); first.options.label = 'one';
  const second = item('custom', 'root/1'); second.options.label = 'two';
  const prepared = await prepareItems(column(first, second), host, { custom: module });
  expect(calls).toEqual([{ label: 'one' }, { label: 'two' }]); expect(loads).toBe(1);
  expect(texts(render(prepared.get('root/0')!, Stack))).toEqual(['one:9']);
  await expect(prepareItems(item('custom'), host, { custom: { prepare: async () => ({ render() {} }) } as unknown as ItemModule })).rejects.toMatchObject({ diagnostic: { code: 'ITEM_CONTRACT_INVALID' } });
});
