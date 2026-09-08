import type { WidgetContainer } from '#source/types/rendering';
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable, texts, runtime, required, inspect, descendants, mockImage, mockColor } from './helpers/scriptable';

import { initializedContext } from './helpers/context';
import { mockEvent, mockReminder } from './helpers/scriptable';

async function widgetContext() {
  const context = await initializedContext();
  context.now = new Date(2026, 8, 8, 10, 30);
  context.locale = 'en_US';
  context.padding = 10;
  const styles = new WeakMap<object, string>();
  for (const [name, format] of Object.entries(context.format)) styles.set(format, name);
  const settings = {
      date: { dynamicDateSize: false, staticDateSize: 'small', smallDateFormat: 'small', largeDateLineOne: 'line1', largeDateLineTwo: 'line2', url: '' },
      events: { showCalendarColor: 'circle', showLocation: true, showEventLength: 'time', labelFormat: 'day', noEventBehavior: 'message' },
      reminders: { showListColor: 'none', useRelativeDueDate: true, noRemindersBehavior: 'message' },
      weather: { showLocation: true, horizontalCondition: true, showCondition: true, showHighLow: true, tomorrowShownAtHour: '20', showRain: true, showHours: '3', showDays: '3', showHoursFormat: 'hour', showDaysFormat: 'day', showToday: false },
      widget: {}, sunrise: { showWithin: '0', separateElements: false }, covid: { url: 'https://example.com/covid' },
      symbol: { size: '18', tintColor: '', padding: {} }, news: { showDate: 'relative', limitLineHeight: true }
    };
  for (const key of Object.keys(settings) as Array<keyof typeof settings>) Object.assign(context.settings[key], settings[key]);
  Object.assign(context.localization, { nightGreeting: 'Night', morningGreeting: 'Morning', afternoonGreeting: 'Afternoon', eveningGreeting: 'Evening', tomorrowLabel: 'Tomorrow', nextHourLabel: 'Next hour', noEventMessage: 'No events', noRemindersMessage: 'No reminders', durationHour: 'h', durationMinute: 'm', covid: 'World {world}; country {country}', week: 'Week' });
  context.data = {
      events: [], reminders: [], location: { locality: 'Cupertino' }, covid: { world: 1000, country: 5 }, news: [],
      sun: { sunrise: new Date(2026, 8, 8, 6).getTime(), sunset: new Date(2026, 8, 8, 18).getTime(), tomorrow: new Date(2026, 8, 9, 6).getTime() },
      weather: { currentTemp: 22, currentCondition: 800, currentDescription: 'Clear', todayHigh: 27, todayLow: 16, nextHourRain: 5, tomorrowRain: 10, hourly: Array.from({ length: 8 }, (_, i) => ({ Temp: 22 + i, Condition: 800 })), forecast: Array.from({ length: 8 }, (_, i) => ({ High: 27 + i, Low: 16 + i, Condition: 800 })) }
    };
  context.align = stack => stack.addStack();
  context.provideText = function (value, stack, format, align, url) {
    const target = align ? this.align(stack) : stack;
    const result = target.addText(String(value));
    const style = format ? styles.get(format) : undefined;
    if (style) inspect(result).style = style;
    if (url) result.url = url;
    return result;
  };
  context.formatDate = (date, format = 'date') => `${format}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`;
  context.formatTime = date => `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  context.formatDatetime = function (date) { return `${this.formatDate(date)} ${this.formatTime(date)}`; };
  context.dateDiff = (first, second) => Math.round((new Date(second.getFullYear(), second.getMonth(), second.getDate()).getTime() - new Date(first.getFullYear(), first.getMonth(), first.getDate()).getTime()) / 86400000);
  context.provideTextSymbol = shape => shape === 'circle' ? '●' : '■';
  context.displayNumber = (value, fallback = '--') => typeof value === 'number' && Number.isFinite(value) ? String(Math.round(value)) : fallback;
  context.provideConditionSymbol = (condition, night) => mockImage({ condition, night });
  context.isNight = date => date.getHours() < 6 || date.getHours() >= 18;
  context.tintIcon = (icon, format, force) => { inspect(icon).tint = { style: format ? styles.get(format) : undefined, force }; };
  context.provideColor = () => mockColor('000000');
  context.provideTempBar = () => mockImage({ tempBar: true });
  context.drawVerticalLine = (color, height) => mockImage({ color, height });
  context.provideBatteryIcon = (level, charging) => mockImage({ level, charging });
  return context;
}

test('date selects small or two-line formatting and honors custom links', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.date.url = 'shortcuts://calendar';
  let column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['small:2026-9-8-10']);
  assert.equal(descendants(column).find(x => x.type === 'text')!.url, 'shortcuts://calendar');
  context.settings.date.staticDateSize = 'large';
  column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['line1:2026-9-8-10', 'line2:2026-9-8-10']);
});

test('date disables links with none without modifying persisted settings', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.date.url = ' none ';
  const column = new Stack();
  await context.date(column);
  assert.equal(descendants(column).find(x => x.type === 'text')!.url, undefined);
  context.settings.date.url = '';
  await context.date(new Stack());
  assert.equal(context.settings.date.url, '');
});

test('greeting changes across all five daily time ranges', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  for (const [hour, expected] of [[4, 'Night'], [5, 'Morning'], [12, 'Afternoon'], [17, 'Evening'], [22, 'Night']] as const) {
    context.now.setHours(hour);
    const column = new Stack();
    context.greeting(column);
    assert.deepEqual(texts(column), [expected]);
  }
});

test('events group days, show calendar colors and format location and duration', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.events.showEventLength = 'duration';
  const startDate = new Date(2026, 8, 8, 12);
  context.data.events = [mockEvent({ title: ' Lunch ', startDate, endDate: new Date(2026, 8, 8, 13, 15), calendar: { color: mockColor('blue') }, location: 'Cafe' }), mockEvent({ title: 'Holiday', startDate: new Date(2026, 8, 9), isAllDay: true, calendar: { color: mockColor('red') } })];
  const column = new Stack();
  await context.events(column);
  assert.deepEqual(texts(column), ['● ', 'Lunch', 'Cafe', '12:00 • 1h 15m', 'TOMORROW', '● ', 'Holiday']);
  assert.equal(column.children.length, 2);
  assert.match(required(column.children[0]!.url), /^calshow:/);
});

test('empty calendar and reminders support messages or another custom item', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  const column = new Stack();
  await context.events(column);
  await context.reminders(column);
  assert.deepEqual(texts(column), ['No events', 'No reminders']);
  context.settings.events.noEventBehavior = 'custom';
  context.custom = { custom: (stack: WidgetContainer) => stack.addText('Replacement') };
  await context.events(column);
  assert.equal(texts(column).at(-1), 'Replacement');
});

test('reminders style the due date separately and mark overdue titles', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.data.reminders = [mockReminder({ title: 'Call', dueDate: new Date(2026, 8, 8, 12) }), mockReminder({ title: 'Late', isOverdue: true }), mockReminder({ title: 'Someday' })];
  const column = new Stack();
  await context.reminders(column);
  const entries = descendants(column).filter(x => x.type === 'text');
  assert.equal(entries[1]!.style, 'reminderTime');
  assert.equal(entries[2]!.textColor.hex, 'ff3b30');
  assert.equal(entries.length, 4);
  assert.equal(column.children[0]!.url, 'x-apple-reminderkit://REMCDReminder/');
});

test('current weather renders location, condition, temperature and high/low', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  const column = new Stack();
  await context.current(column);
  assert.deepEqual(texts(column), ['Cupertino', '22°', 'Clear', '16', '27']);
  assert.equal(column.children[0]!.url, 'weather://');
  assert(descendants(column).some(x => x.image?.tempBar));
});

test('future weather switches from next-hour to tomorrow at the configured hour', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  let column = new Stack();
  await context.future(column);
  assert.deepEqual(texts(column), ['Next hour', '23°', '5%']);
  context.now.setHours(20);
  column = new Stack();
  await context.future(column);
  assert.deepEqual(texts(column), ['Tomorrow', '28', '17', '10%']);
});

test('hourly forecast clamps requested hours to the available data', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.weather.showHours = '24';
  const column = new Stack();
  await context.hourly(column);
  assert.equal(column.children[0]!.children.length, 8);
  assert.equal(texts(column).filter(x => x.endsWith('°')).length, 8);
});

test('daily forecast clamps short data and optionally includes today', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.weather.showDays = '10';
  required(context.data.weather).forecast = required(context.data.weather).forecast.slice(0, 2);
  let column = new Stack();
  await context.daily(column);
  assert.equal(column.children[0]!.children.length, 1);
  assert.deepEqual(texts(column).slice(-2), ['28', '17']);
  context.settings.weather.showToday = true;
  column = new Stack();
  await context.daily(column);
  assert.equal(column.children[0]!.children.length, 2);
});

test('forecast uses widget time for labels and honors disabled URLs', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.weather.urlFuture = 'none';
  context.settings.weather.urlForecast = ' none ';
  for (const hourly of [false, true]) {
    const column = new Stack();
    await context.forecast(column, hourly);
    assert.equal(column.children[0]!.url, undefined);
    assert.equal(texts(column)[0], hourly ? 'hour:2026-9-8-10' : 'day:2026-9-9-10');
  }
});

test('sun chooses sunset by day and tomorrow sunrise after sunset', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  let column = new Stack();
  await context.sunrise(column);
  assert(descendants(column).some(x => x.image?.symbol === 'sunset.fill'));
  assert.deepEqual(texts(column), ['18:00']);
  context.now.setHours(22);
  column = new Stack();
  await context.sunrise(column);
  assert(descendants(column).some(x => x.image?.symbol === 'sunrise.fill'));
  assert.deepEqual(texts(column), ['6:00']);
  context.settings.sunrise.showWithin = '30';
  column = new Stack();
  await context.sunset(column);
  assert.equal(column.children.length, 0);
});

test('separate sunset and sunrise items preserve their explicit choice', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.sunrise.separateElements = true;
  for (const name of ['sunrise', 'sunset'] as const) {
    const column = new Stack();
    await context[name](column);
    assert(descendants(column).some(x => x.image?.symbol === name + '.fill'));
  }
});

test('COVID interpolates zero totals and omits only absent values', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.data.covid = { world: 0, country: 1200 };
  context.localization.covid += '; missing {unknown}';
  const column = new Stack();
  await context.covid(column);
  assert.deepEqual(texts(column), ['World 0; country 1,200; missing ']);
});

test('custom text, battery and ISO week render their changing values', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.now = new Date(2021, 0, 1, 12);
  const column = new Stack();
  context.text(column, 'Hello');
  context.battery(column);
  context.week(column);
  assert.deepEqual(texts(column), ['Hello', '57%', 'Week 53']);
  assert(descendants(column).some(x => x.image?.level === 0.57));
});

test('symbol uses defaults when optional settings are omitted', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.symbol.size = '';
  context.settings.symbol.tintColor = '';
  context.settings.symbol.padding = { top: '', left: '', bottom: '', right: '' };
  const column = new Stack();
  column.size.width = 120;
  context.symbol(column, 'star.fill');
  const image = descendants(column).find(x => x.type === 'image')!;
  assert.equal(image.image.symbol, 'star.fill');
  assert.equal(image.imageSize.width, 80);
});

test('news noDate renders only the headline stack and preserves article links', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.news.showDate = 'noDate';
  context.data.news = [{ title: 'Headline', date: '2026-09-08T08:00:00Z', link: 'https://example.com/story' }];
  const column = new Stack();
  await context.news(column);
  assert.deepEqual(texts(column), ['Headline']);
  assert.equal(column.children[0]!.children.length, 1);
  assert.equal(column.children[0]!.url, 'https://example.com/story');
  assert.equal(descendants(column).find(x => x.type === 'text')!.lineLimit, 1);
});

test('news supports relative, date, time, datetime and custom date labels', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.data.news = [{ title: 'Headline', date: context.now.toISOString(), link: 'https://example.com/story' }];
  for (const mode of ['relative', 'date', 'time', 'datetime', 'custom']) {
    context.settings.news.showDate = mode;
    context.settings.news.dateFormat = 'custom';
    const column = new Stack();
    await context.news(column);
    assert.equal(texts(column).length, 2);
    assert.equal(descendants(column).filter(x => x.type === 'text')[1]!.style, 'newsDate');
  }
});

test('dynamic date sizing loads events before choosing its format', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.date.dynamicDateSize = true;
  delete context.data.events;
  context.setupEvents = async function () { this.data.events = [mockEvent({ title: 'Meeting' })]; };
  let column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['small:2026-9-8-10']);
  context.data.events = [];
  column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['line1:2026-9-8-10', 'line2:2026-9-8-10']);
});

test('reminders support absolute due dates, list colors and custom links', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  Object.assign(context.settings.reminders, { useRelativeDueDate: false, showListColor: 'rectangle right', url: 'shortcuts://reminders' });
  context.data.reminders = [mockReminder({ title: ' Today ', dueDate: new Date(2026, 8, 8, 12), dueDateIncludesTime: true, calendar: { color: mockColor('green') } })];
  const column = new Stack();
  await context.reminders(column);
  assert.equal(texts(column)[0], 'Today');
  assert.equal(texts(column)[1], ' ■');
  assert.match(required(texts(column)[2]), /^time:/);
  assert.equal(descendants(column).find(x => x.text === ' ■')!.textColor.hex, 'green');
  assert.equal(column.children[0]!.url, 'shortcuts://reminders');
});

test('current weather supports vertical conditions and missing temperatures', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  Object.assign(context.settings.weather, { horizontalCondition: false, showLocation: false, showHighLow: false, urlCurrent: 'none' });
  required(context.data.weather).currentTemp = null;
  const column = new Stack();
  await context.current(column);
  assert.deepEqual(texts(column), ['Clear', '--°']);
  assert.equal(column.children[0]!.url, undefined);
});

test('horizontal forecasts preserve dates, icons and displayed temperatures', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  Object.assign(context.settings.weather, { horizontalHours: true, horizontalForecast: true, showDays: '2', showHours: '2' });
  for (const hourly of [false, true]) {
    const column = new Stack();
    await context.forecast(column, hourly);
    assert.equal(column.children[0]!.direction, 'horizontal');
    assert.equal(column.children[0]!.children.length, 2);
    assert.equal(descendants(column).filter(x => x.image?.condition === 800)!.length, 2);
    assert.deepEqual(texts(column).filter(x => hourly ? x.endsWith('°') : /^\d+$/.test(x)), hourly ? ['22°', '23°'] : ['28', '17', '29', '18']);
  }
});

test('battery marks low power red and restores normal tint while charging', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  runtime.Device.batteryLevel = () => 0.1;
  let column = new Stack();
  context.battery(column);
  assert.equal(descendants(column).find(x => x.type === 'image')!.tintColor.hex, 'ff0000');
  runtime.Device.isCharging = () => true;
  column = new Stack();
  context.battery(column);
  assert.equal(descendants(column).find(x => x.type === 'image')!.tint!.style, 'battery');
  assert.deepEqual(texts(column), ['10%']);
});

test('symbols honor custom size, padding and tint', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.symbol = { size: '42', tintColor: '00aaff', padding: { top: '0', left: '2', bottom: '4', right: '6' } };
  const column = new Stack();
  context.symbol(column, 'moon.fill');
  const image = descendants(column).find(x => x.type === 'image')!;
  assert.deepEqual(column.children[0]!.padding, [0, 2, 4, 6]);
  assert.equal(image.imageSize.width, 42);
  assert.equal(image.tintColor.hex, '00aaff');
});

test('news skips missing or invalid dates while retaining the headline', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  for (const date of [null, '', 'not-a-date']) {
    context.data.news = [{ title: 'Undated headline', date, link: 'https://example.com/story' }];
    const column = new Stack();
    await context.news(column);
    assert.deepEqual(texts(column), ['Undated headline']);
    assert.equal(column.children[0]!.children.length, 1);
  }
});

test('blank symbol size renders a usable image in automatically sized and narrow columns', async t => {
  const { Stack } = installScriptable(t);
  const context = await widgetContext();
  context.settings.symbol.size = '';
  for (const width of [0, 20, 120]) {
    const column = new Stack();
    column.size.width = width;
    context.symbol(column, 'star.fill');
    const image = descendants(column).find(item => item.type === 'image')!;
    assert(image.imageSize.width > 0);
    assert(Number.isFinite(image.imageSize.width));
    assert.equal(image.imageSize.width, image.imageSize.height);
    if (width === 120) assert.equal(image.imageSize.width, 80);
  }
});
