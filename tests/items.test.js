const test = require('node:test');
const assert = require('node:assert/strict');
const { installScriptable, texts } = require('./helpers/scriptable');

// A separate implementation can run the same behavior contract against upstream.
const items = require(process.env.ITEMS_IMPLEMENTATION || '../src/items');

function widgetContext() {
  const now = new Date(2026, 8, 8, 10, 30);
  const styleNames = ['smallDate', 'largeDate1', 'largeDate2', 'greeting', 'eventLabel', 'eventTitle', 'eventTime', 'eventLocation', 'noEvents', 'reminderTitle', 'reminderTime', 'noReminders', 'largeTemp', 'smallTemp', 'tinyTemp', 'sunrise', 'covid', 'customText', 'battery', 'week', 'newsTitle', 'newsDate'];
  return Object.assign({}, items, {
    now, locale: 'en_US', padding: 10,
    format: Object.fromEntries(['defaultText', ...styleNames].map(name => [name, { name, size: 14 }])),
    settings: {
      date: { dynamicDateSize: false, staticDateSize: 'small', smallDateFormat: 'small', largeDateLineOne: 'line1', largeDateLineTwo: 'line2', url: '' },
      events: { showCalendarColor: 'circle', showLocation: true, showEventLength: 'time', labelFormat: 'day', noEventBehavior: 'message' },
      reminders: { showListColor: 'none', useRelativeDueDate: true, noRemindersBehavior: 'message' },
      weather: { showLocation: true, horizontalCondition: true, showCondition: true, showHighLow: true, tomorrowShownAtHour: '20', showRain: true, showHours: '3', showDays: '3', showHoursFormat: 'hour', showDaysFormat: 'day', showToday: false },
      widget: {}, sunrise: { showWithin: '0', separateElements: false }, covid: { url: 'https://example.com/covid' },
      symbol: { size: '18', tintColor: '', padding: {} }, news: { showDate: 'relative', limitLineHeight: true }
    },
    localization: { nightGreeting: 'Night', morningGreeting: 'Morning', afternoonGreeting: 'Afternoon', eveningGreeting: 'Evening', tomorrowLabel: 'Tomorrow', nextHourLabel: 'Next hour', noEventMessage: 'No events', noRemindersMessage: 'No reminders', durationHour: 'h', durationMinute: 'm', covid: 'World {world}; country {country}', week: 'Week' },
    data: {
      events: [], reminders: [], location: { locality: 'Cupertino' }, covid: { world: 1000, country: 5 }, news: [],
      sun: { sunrise: new Date(2026, 8, 8, 6).getTime(), sunset: new Date(2026, 8, 8, 18).getTime(), tomorrow: new Date(2026, 8, 9, 6).getTime() },
      weather: { currentTemp: 22, currentCondition: 800, currentDescription: 'Clear', todayHigh: 27, todayLow: 16, nextHourRain: 5, tomorrowRain: 10, hourly: Array.from({ length: 8 }, (_, i) => ({ Temp: 22 + i, Condition: 800 })), forecast: Array.from({ length: 8 }, (_, i) => ({ High: 27 + i, Low: 16 + i, Condition: 800 })) }
    },
    align(stack) { return stack.addStack(); },
    provideText(value, stack, format, align, url) {
      const target = align ? this.align(stack) : stack;
      const result = target.addText(String(value));
      result.style = format?.name;
      if (url) result.url = url;
      return result;
    },
    formatDate(date, format = 'date') { return `${format}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}-${date.getHours()}`; },
    formatTime(date) { return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`; },
    formatDatetime(date) { return `${this.formatDate(date)} ${this.formatTime(date)}`; },
    dateDiff(first, second) { return Math.round((new Date(second.getFullYear(), second.getMonth(), second.getDate()) - new Date(first.getFullYear(), first.getMonth(), first.getDate())) / 86400000); },
    provideTextSymbol(shape) { return shape === 'circle' ? '●' : '■'; },
    displayNumber(value, fallback) { return Number.isFinite(value) ? String(Math.round(value)) : fallback; },
    provideConditionSymbol(condition, night) { return { condition, night }; },
    isNight(date) { return date.getHours() < 6 || date.getHours() >= 18; },
    tintIcon(icon, format, force) { icon.tint = { style: format?.name, force }; },
    provideColor(format, alpha) { return { style: format?.name, alpha }; },
    provideTempBar() { return { tempBar: true }; },
    drawVerticalLine(color, height) { return { color, height }; },
    provideBatteryIcon(level, charging) { return { level, charging }; }
  });
}

function descendants(stack) {
  return stack.children.flatMap(child => [child, ...(child.children ? descendants(child) : [])]);
}

test('date selects small or two-line formatting and honors custom links', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.date.url = 'shortcuts://calendar';
  let column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['small:2026-9-8-10']);
  assert.equal(descendants(column).find(x => x.type === 'text').url, 'shortcuts://calendar');
  context.settings.date.staticDateSize = 'large';
  column = new Stack();
  await context.date(column);
  assert.deepEqual(texts(column), ['line1:2026-9-8-10', 'line2:2026-9-8-10']);
});

test('date disables links with none without modifying persisted settings', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.date.url = ' none ';
  const column = new Stack();
  await context.date(column);
  assert.equal(descendants(column).find(x => x.type === 'text').url, undefined);
  context.settings.date.url = '';
  await context.date(new Stack());
  assert.equal(context.settings.date.url, '');
});

test('greeting changes across all five daily time ranges', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  for (const [hour, expected] of [[4, 'Night'], [5, 'Morning'], [12, 'Afternoon'], [17, 'Evening'], [22, 'Night']]) {
    context.now.setHours(hour);
    const column = new Stack();
    context.greeting(column);
    assert.deepEqual(texts(column), [expected]);
  }
});

test('events group days, show calendar colors and format location and duration', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.events.showEventLength = 'duration';
  const startDate = new Date(2026, 8, 8, 12);
  context.data.events = [{ title: ' Lunch ', startDate, endDate: new Date(2026, 8, 8, 13, 15), calendar: { color: 'blue' }, location: 'Cafe' }, { title: 'Holiday', startDate: new Date(2026, 8, 9), isAllDay: true, calendar: { color: 'red' } }];
  const column = new Stack();
  await context.events(column);
  assert.deepEqual(texts(column), ['● ', 'Lunch', 'Cafe', '12:00 • 1h 15m', 'TOMORROW', '● ', 'Holiday']);
  assert.equal(column.children.length, 2);
  assert.match(column.children[0].url, /^calshow:/);
});

test('empty calendar and reminders support messages or another custom item', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  const column = new Stack();
  await context.events(column);
  await context.reminders(column);
  assert.deepEqual(texts(column), ['No events', 'No reminders']);
  context.settings.events.noEventBehavior = 'custom';
  context.custom = stack => stack.addText('Replacement');
  await context.events(column);
  assert.equal(texts(column).at(-1), 'Replacement');
});

test('reminders style the due date separately and mark overdue titles', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.data.reminders = [{ title: 'Call', dueDate: new Date(2026, 8, 8, 12) }, { title: 'Late', isOverdue: true }, { title: 'Someday' }];
  const column = new Stack();
  await context.reminders(column);
  const entries = descendants(column).filter(x => x.type === 'text');
  assert.equal(entries[1].style, 'reminderTime');
  assert.equal(entries[2].textColor.hex, 'ff3b30');
  assert.equal(entries.length, 4);
  assert.equal(column.children[0].url, 'x-apple-reminderkit://REMCDReminder/');
});

test('current weather renders location, condition, temperature and high/low', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  const column = new Stack();
  await context.current(column);
  assert.deepEqual(texts(column), ['Cupertino', '22°', 'Clear', '16', '27']);
  assert.equal(column.children[0].url, 'weather://');
  assert(descendants(column).some(x => x.image?.tempBar));
});

test('future weather switches from next-hour to tomorrow at the configured hour', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
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
  const context = widgetContext();
  context.settings.weather.showHours = '24';
  const column = new Stack();
  await context.hourly(column);
  assert.equal(column.children[0].children.length, 8);
  assert.equal(texts(column).filter(x => x.endsWith('°')).length, 8);
});

test('daily forecast clamps short data and optionally includes today', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.weather.showDays = '10';
  context.data.weather.forecast = context.data.weather.forecast.slice(0, 2);
  let column = new Stack();
  await context.daily(column);
  assert.equal(column.children[0].children.length, 1);
  assert.deepEqual(texts(column).slice(-2), ['28', '17']);
  context.settings.weather.showToday = true;
  column = new Stack();
  await context.daily(column);
  assert.equal(column.children[0].children.length, 2);
});

test('forecast uses widget time for labels and honors disabled URLs', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.weather.urlFuture = 'none';
  context.settings.weather.urlForecast = ' none ';
  for (const hourly of [false, true]) {
    const column = new Stack();
    await context.forecast(column, hourly);
    assert.equal(column.children[0].url, undefined);
    assert.equal(texts(column)[0], hourly ? 'hour:2026-9-8-10' : 'day:2026-9-9-10');
  }
});

test('sun chooses sunset by day and tomorrow sunrise after sunset', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
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
  const context = widgetContext();
  context.settings.sunrise.separateElements = true;
  for (const name of ['sunrise', 'sunset']) {
    const column = new Stack();
    await context[name](column);
    assert(descendants(column).some(x => x.image?.symbol === name + '.fill'));
  }
});

test('COVID interpolates zero totals and omits only absent values', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.data.covid = { world: 0, country: 1200 };
  context.localization.covid += '; missing {unknown}';
  const column = new Stack();
  await context.covid(column);
  assert.deepEqual(texts(column), ['World 0; country 1,200; missing ']);
});

test('custom text, battery and ISO week render their changing values', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.now = new Date(2021, 0, 1, 12);
  const column = new Stack();
  context.text(column, 'Hello');
  context.battery(column);
  context.week(column);
  assert.deepEqual(texts(column), ['Hello', '57%', 'Week 53']);
  assert(descendants(column).some(x => x.image?.level === 0.57));
});

test('symbol uses defaults when optional settings are omitted', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.symbol = {};
  const column = new Stack();
  column.size.width = 120;
  context.symbol(column, 'star.fill');
  const image = descendants(column).find(x => x.type === 'image');
  assert.equal(image.image.symbol, 'star.fill');
  assert.equal(image.imageSize.width, 80);
});

test('news noDate renders only the headline stack and preserves article links', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.news.showDate = 'noDate';
  context.data.news = [{ title: 'Headline', date: '2026-09-08T08:00:00Z', link: 'https://example.com/story' }];
  const column = new Stack();
  await context.news(column);
  assert.deepEqual(texts(column), ['Headline']);
  assert.equal(column.children[0].children.length, 1);
  assert.equal(column.children[0].url, 'https://example.com/story');
  assert.equal(descendants(column).find(x => x.type === 'text').lineLimit, 1);
});

test('news supports relative, date, time, datetime and custom date labels', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.data.news = [{ title: 'Headline', date: context.now.toISOString(), link: 'https://example.com/story' }];
  for (const mode of ['relative', 'date', 'time', 'datetime', 'custom']) {
    context.settings.news.showDate = mode;
    context.settings.news.dateFormat = 'custom';
    const column = new Stack();
    await context.news(column);
    assert.equal(texts(column).length, 2);
    assert.equal(descendants(column).filter(x => x.type === 'text')[1].style, 'newsDate');
  }
});

test('dynamic date sizing loads events before choosing its format', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.date.dynamicDateSize = true;
  delete context.data.events;
  context.setupEvents = async function () { this.data.events = [{ title: 'Meeting' }]; };
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
  const context = widgetContext();
  Object.assign(context.settings.reminders, { useRelativeDueDate: false, showListColor: 'rectangle right', url: 'shortcuts://reminders' });
  context.data.reminders = [{ title: ' Today ', dueDate: new Date(2026, 8, 8, 12), dueDateIncludesTime: true, calendar: { color: 'green' } }];
  const column = new Stack();
  await context.reminders(column);
  assert.equal(texts(column)[0], 'Today');
  assert.equal(texts(column)[1], ' ■');
  assert.match(texts(column)[2], /^time:/);
  assert.equal(descendants(column).find(x => x.text === ' ■').textColor, 'green');
  assert.equal(column.children[0].url, 'shortcuts://reminders');
});

test('current weather supports vertical conditions and missing temperatures', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  Object.assign(context.settings.weather, { horizontalCondition: false, showLocation: false, showHighLow: false, urlCurrent: 'none' });
  context.data.weather.currentTemp = null;
  const column = new Stack();
  await context.current(column);
  assert.deepEqual(texts(column), ['Clear', '--°']);
  assert.equal(column.children[0].url, undefined);
});

test('horizontal forecasts preserve dates, icons and displayed temperatures', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  Object.assign(context.settings.weather, { horizontalHours: true, horizontalForecast: true, showDays: '2', showHours: '2' });
  for (const hourly of [false, true]) {
    const column = new Stack();
    await context.forecast(column, hourly);
    assert.equal(column.children[0].direction, 'horizontal');
    assert.equal(column.children[0].children.length, 2);
    assert.equal(descendants(column).filter(x => x.image?.condition === 800).length, 2);
    assert.deepEqual(texts(column).filter(x => hourly ? x.endsWith('°') : /^\d+$/.test(x)), hourly ? ['22°', '23°'] : ['28', '17', '29', '18']);
  }
});

test('battery marks low power red and restores normal tint while charging', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  Device.batteryLevel = () => 0.1;
  let column = new Stack();
  context.battery(column);
  assert.equal(descendants(column).find(x => x.type === 'image').tintColor.hex, 'ff0000');
  Device.isCharging = () => true;
  column = new Stack();
  context.battery(column);
  assert.equal(descendants(column).find(x => x.type === 'image').tint.style, 'battery');
  assert.deepEqual(texts(column), ['10%']);
});

test('symbols honor custom size, padding and tint', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.symbol = { size: '42', tintColor: '00aaff', padding: { top: '0', left: '2', bottom: '4', right: '6' } };
  const column = new Stack();
  context.symbol(column, 'moon.fill');
  const image = descendants(column).find(x => x.type === 'image');
  assert.deepEqual(column.children[0].padding, [0, 2, 4, 6]);
  assert.equal(image.imageSize.width, 42);
  assert.equal(image.tintColor.hex, '00aaff');
});

test('news skips missing or invalid dates while retaining the headline', async t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  for (const date of [null, undefined, '', 'not-a-date']) {
    context.data.news = [{ title: 'Undated headline', date, link: 'https://example.com/story' }];
    const column = new Stack();
    await context.news(column);
    assert.deepEqual(texts(column), ['Undated headline']);
    assert.equal(column.children[0].children.length, 1);
  }
});

test('blank symbol size renders a usable image in automatically sized and narrow columns', t => {
  const { Stack } = installScriptable(t);
  const context = widgetContext();
  context.settings.symbol.size = '';
  for (const width of [0, 20, 120]) {
    const column = new Stack();
    column.size.width = width;
    context.symbol(column, 'star.fill');
    const image = descendants(column).find(item => item.type === 'image');
    assert(image.imageSize.width > 0);
    assert(Number.isFinite(image.imageSize.width));
    assert.equal(image.imageSize.width, image.imageSize.height);
    if (width === 120) assert.equal(image.imageSize.width, 80);
  }
});
