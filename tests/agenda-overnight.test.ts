import { expect, test } from 'vitest';
import { initializedContext } from './helpers/context';
import { installScriptable, mockColor, mockEvent, runtime, texts } from './helpers/scriptable';

const at = (day: number, hour = 0, minute = 0) => new Date(2026, 9, day, hour, minute);
function event(id: string, start: Date, end: Date, allDay = false) {
  return Object.assign(mockEvent({ title: id, startDate: start, endDate: end, isAllDay: allDay, calendar: { color: mockColor('123456') } }), { identifier: id });
}
async function fixture() {
  const host = await initializedContext();
  host.now = at(28, 0, 30);
  Object.assign(host.settings.events, { selectCalendars: [], numberOfDays: '1', showTomorrow: '0', showAllDay: true, minutesAfter: '', numberOfEvents: '20', showCalendarColor: 'none' });
  return host;
}

test('ongoing overnight and multi-day events survive while expired occurrences stay excluded and duplicates collapse', async t => {
  installScriptable(t);
  const host = await fixture();
  const overnight = event('Overnight', at(27, 23), at(28, 2));
  const multiDay = event('Multi-day', at(27), at(30), true);
  const tomorrow = event('Tomorrow meeting', at(29, 9), at(29, 10));
  runtime.CalendarEvent.between = async () => [overnight, overnight, multiDay, multiDay,
    event('Expired overnight', at(27, 23), at(28, 0, 15)), event('Expired all-day', at(27), at(28), true), tomorrow];
  await host.setupEvents();
  expect(host.data.events?.map(value => value.title)).toEqual(['Overnight', 'Multi-day', 'Tomorrow meeting']);
  expect(overnight.startDate.getTime()).toBe(at(27, 23).getTime());
  host.settings.events.showTomorrow = '12';
  await host.setupEvents();
  expect(host.data.events?.map(value => value.title)).toEqual(['Overnight', 'Multi-day']);
  host.settings.events.showAllDay = false;
  host.settings.events.numberOfDays = '0';
  await host.setupEvents();
  expect(host.data.events?.map(value => value.title)).toEqual(['Overnight']);
});

for (const [minutesAfter, titles] of [['', ['Overnight']], ['0', []], ['60', []], ['90', []], ['91', ['Overnight']]] as const) {
  test(`overnight events respect the existing start-relative minutesAfter=${minutesAfter || 'duration'} cutoff`, async t => {
    installScriptable(t);
    const host = await fixture();
    host.settings.events.minutesAfter = minutesAfter;
    runtime.CalendarEvent.between = async () => [event('Overnight', at(27, 23), at(28, 2))];
    await host.setupEvents();
    expect(host.data.events?.map(value => value.title)).toEqual(titles);
  });
}

test('the end boundary excludes timed and all-day events under the default duration policy', async t => {
  installScriptable(t);
  const host = await fixture();
  host.now = at(28);
  runtime.CalendarEvent.between = async () => [event('Timed ended', at(27, 23), at(28)), event('All-day ended', at(27), at(28), true)];
  await host.setupEvents();
  expect(host.data.events).toEqual([]);
});

test('active carry-over events render in today group with original time and tomorrow group intact', async t => {
  const env = installScriptable(t);
  const host = await fixture();
  const overnight = event('Overnight', at(27, 23), at(28, 2));
  host.data.events = [overnight, event('Multi-day', at(27), at(30), true), event('Tomorrow meeting', at(29, 9), at(29, 10))];
  const target = new env.Stack();
  await host.events(target);
  const content = texts(target);
  expect(content.filter(text => text === host.localization.tomorrowLabel.toUpperCase())).toHaveLength(1);
  expect(content).not.toContain(host.formatDate(overnight.startDate, host.settings.events.labelFormat).toUpperCase());
  expect(content.some(text => text.startsWith(host.formatTime(overnight.startDate)))).toBe(true);
  expect(target.children).toHaveLength(2);
});
