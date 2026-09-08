import { test } from 'vitest';
import assert from 'node:assert/strict';

import { installScriptable, runtime, required } from './helpers/scriptable';

import { initializedContext } from './helpers/context';
import type { TestContext } from 'vitest';
import type { EnvironmentOptions } from './helpers/scriptable';
import type { WeatherCalContext } from '#source/types/context';

async function engine(t: TestContext, options: EnvironmentOptions = {}) {
  const env = installScriptable(t, options);
  const service = await initializedContext(env);
  service.locale = 'en_US';
  Object.assign(service.settings.widget, { units: 'metric', updateLocation: '10' });
  Object.assign(service.settings.events, { selectCalendars: [], numberOfDays: '1', showTomorrow: '0', showAllDay: true, minutesAfter: '', numberOfEvents: '20' });
  Object.assign(service.settings.reminders, { selectLists: [], showWithoutDueDate: true, showOverdue: true, todayOnly: false, numberOfReminders: '20' });
  Object.assign(service.settings.news, { url: 'https://example.com/feed?lang=en&section=world', numberOfItems: '5' });
  service.settings.covid.country = 'USA';
  service.fm.writeString('/library/weather-cal-api-key', 'test-key');
  service.fm.writeString('/library/weather-cal-api-path', 'https://api.openweathermap.org/data/3.0/onecall');
  return { service, ...env };
}

function weatherFixture() {
  return {
    current: { temp: 22, weather: [{ id: 800, main: 'Clear', description: 'ciel clair' }] },
    daily: Array.from({ length: 8 }, (_, i) => ({ temp: { max: 25 + i, min: 12 + i }, weather: [{ id: 800 }], sunrise: 1700000000 + i * 86400, sunset: 1700040000 + i * 86400, pop: i / 10 })),
    hourly: Array.from({ length: 8 }, (_, i) => ({ temp: 20 + i, weather: [{ id: 801 }], pop: i / 10 }))
  };
}

function event(service: WeatherCalContext, id: string, day = 0, hour = 16, extra: Record<string, unknown> = {}) {
  const startDate = new Date(service.now);
  startDate.setDate(startDate.getDate() + day);
  startDate.setHours(hour, 0, 0, 0);
  return { identifier: id, title: id, calendar: { identifier: 'work', title: 'Work' }, startDate, endDate: new Date(startDate.getTime() + 3600000), isAllDay: false, ...extra };
}

function ageCaches(service: WeatherCalContext, minutes: number) {
  for (const [key, value] of (service.fm === runtime.FileManager.local() ? runtime.FileManager.local() : runtime.FileManager.iCloud()).store) {
    if (key.includes('cache') || key.includes('news') || key.includes('covid')) value.modified = new Date(service.now.getTime() - minutes * 60000);
  }
}

test('events include the entire final requested calendar day and deduplicate occurrences', async t => {
  const { service } = await engine(t);
  service.now = new Date(2026, 8, 8, 10);
  const last = event(service, 'Last evening', 1, 23);
  const canceled = event(service, 'Canceled: meeting');
  const excluded = event(service, 'Other list', 0, 14, { calendar: { identifier: 'personal', title: 'Personal' } });
  service.settings.events.selectCalendars = [{ identifier: 'work' }];
  runtime.CalendarEvent.between = async (start, end) => [last, last, canceled, excluded].filter(item => item.startDate >= start && item.startDate < end);
  await service.setupEvents();
  assert.deepEqual(required(service.data.events).map(item => item.title), ['Last evening']);
});

test('zero future days still includes later events today', async t => {
  const { service } = await engine(t);
  service.now = new Date(2026, 8, 8, 10);
  service.settings.events.numberOfDays = '0';
  runtime.CalendarEvent.between = async (start, end) => [event(service, 'Today'), event(service, 'Tomorrow', 1)].filter(item => item.startDate >= start && item.startDate < end);
  await service.setupEvents();
  assert.deepEqual(required(service.data.events).map(item => item.title), ['Today']);
});

test('event preferences preserve ongoing, all-day, future-hour, and legacy calendar behavior', async t => {
  const { service } = await engine(t);
  service.now = new Date(2026, 8, 8, 10, 30);
  service.settings.events.selectCalendars = ' Work, Personal ';
  service.settings.events.showTomorrow = '12';
  service.settings.events.showAllDay = false;
  runtime.CalendarEvent.between = async () => [event(service, 'Ongoing', 0, 10), event(service, 'Finished', 0, 9), event(service, 'All day', 0, 0, { isAllDay: true }), event(service, 'Tomorrow', 1)];
  await service.setupEvents();
  assert.deepEqual(required(service.data.events).map(item => item.title), ['Ongoing']);
  service.settings.events.minutesAfter = '10';
  await service.setupEvents();
  assert.deepEqual(service.data.events, []);
});

test('reminders retain due-date ordering, selected lists, overdue, and undated controls', async t => {
  const { service } = await engine(t);
  const reminder = (title: string, days: number | null, extra: Record<string, unknown> = {}) => ({ title, calendar: { identifier: 'work', title: 'Work' }, dueDate: days == null ? null : new Date(service.now.getTime() + days * 86400000), isOverdue: days !== null && days < 0, ...extra });
  runtime.Reminder.allIncomplete = async () => [reminder('Undated', null), reminder('Tomorrow', 1), reminder('Overdue', -1), reminder('Today', 0), reminder('Other', -2, { calendar: { identifier: 'other', title: 'Other' } })];
  service.settings.reminders.selectLists = ' Work ';
  service.settings.reminders.todayOnly = true;
  await service.setupReminders();
  assert.deepEqual(required(service.data.reminders).map(item => item.title), ['Overdue', 'Today', 'Undated']);
  service.settings.reminders.showOverdue = false;
  service.settings.reminders.showWithoutDueDate = false;
  await service.setupReminders();
  assert.deepEqual(required(service.data.reminders).map(item => item.title), ['Today']);
});

test('location accepts zero coordinates and falls back to administrative area', async t => {
  const { service } = await engine(t);
  runtime.Location.current = async () => ({ latitude: 0, longitude: 0 });
  runtime.Location.reverseGeocode = async () => [{ administrativeArea: 'Equator' }];
  assert.equal(await service.setupLocation(), true);
  assert.deepEqual(service.data.location, { latitude: 0, longitude: 0, locality: 'Equator' });
});

test('location uses a valid stale fix offline and reports unavailable without one', async t => {
  const { service } = await engine(t);
  service.fm.writeString('/library/weather-cal-location', JSON.stringify({ latitude: 0, longitude: 12, locality: 'Cached' }));
  required(runtime.FileManager.local().store.get('/library/weather-cal-location')).modified = new Date(service.now.getTime() - 3600000);
  runtime.Location.current = async () => { throw Error('Denied'); };
  runtime.Location.reverseGeocode = async () => { throw Error('Offline'); };
  assert.equal(await service.setupLocation(), true);
  assert.equal(required(service.data.location).locality, 'Cached');
  service.fm.remove('/library/weather-cal-location');
  assert.equal(await service.setupLocation(), false);
});

test('weather exposes the complete upstream renderer contract and reuses weather for sunrise', async t => {
  const { service, requests } = await engine(t, { request: async () => weatherFixture() });
  service.data.location = { latitude: 1, longitude: 2 };
  await service.setupWeather();
  await service.setupSunrise();
  assert.equal(required(service.data.weather).currentTemp, 22);
  assert.equal(required(service.data.weather).currentDescription, 'Clear');
  assert.deepEqual(required(service.data.weather).forecast[7]!, { High: 32, Low: 19, Condition: 800 });
  assert.deepEqual(required(service.data.weather).hourly[7]!, { Temp: 27, Condition: 801 });
  assert.equal(required(service.data.weather).tomorrowRain, 10);
  assert.equal(required(service.data.weather).nextHourRain, 10);
  assert.equal(required(service.data.sun).sunrise, 1700000000000);
  assert.equal(required(service.data.sun).tomorrow, 1700086400000);
  assert.equal(requests.length, 1);
});

test('short forecast arrays produce placeholders without crashing weather or sunrise', async t => {
  const { service } = await engine(t, { request: async () => ({ current: { temp: 0, weather: [] }, daily: [{ temp: { max: 0, min: -2 } }], hourly: [] }) });
  await service.setupWeather();
  await service.setupSunrise();
  assert.equal(required(service.data.weather).currentTemp, 0);
  assert.equal(required(service.data.weather).currentCondition, 100);
  assert.deepEqual(required(service.data.weather).forecast[7]!, { High: null, Low: null, Condition: 100 });
  assert.equal(required(service.data.weather).hourly[0]!.Temp, null);
  assert.equal(required(service.data.weather).tomorrowRain, null);
  assert.deepEqual(service.data.sun, { sunrise: null, sunset: null, tomorrow: null });
});

test('weather API errors preserve a valid stale cache', async t => {
  let response: unknown = weatherFixture();
  const { service } = await engine(t, { request: async () => response });
  await service.setupWeather();
  ageCaches(service, 10);
  response = { cod: 401, message: 'Unauthorized' };
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, 22);
  assert.equal([...runtime.FileManager.local().store.values()].some(item => item.value.includes('Unauthorized')), false);
});

test('weather offline uses bounded cache then renders unavailable values', async t => {
  let offline = false;
  const { service } = await engine(t, { request: async () => { if (offline) throw Error('Offline'); return weatherFixture(); } });
  await service.setupWeather();
  ageCaches(service, 10);
  offline = true;
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, 22);
  ageCaches(service, 61);
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, null);
});

test('weather cache is isolated by units, normalized locale, and coordinates', async t => {
  const { service, requests } = await engine(t, { request: async url => { const value = weatherFixture(); value.current.temp = new URL(url).searchParams.get('units') === 'imperial' ? 72 : 22; return value; } });
  service.data.location = { latitude: 0, longitude: 1 };
  await service.setupWeather();
  service.settings.widget.units = 'imperial';
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, 72);
  service.settings.weather.locale = 'fr';
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentDescription, 'ciel clair');
  required(service.data.location).longitude = 2;
  await service.setupWeather();
  assert.equal(requests.length, 4);
  required(service.data.location).longitude = 1;
  await service.setupWeather();
  assert.equal(requests.length, 4);
});

test('OpenWeather normalizes device language codes and falls back to English', async t => {
  const { service, requests } = await engine(t, { request: async () => weatherFixture() });
  service.locale = 'pt-BR';
  await service.setupWeather();
  assert.equal(new URL(required(requests.at(-1))).searchParams.get('lang'), 'pt_br');
  service.locale = 'xx-YY';
  runtime.Device.locale = () => 'zz_ZZ';
  await service.setupWeather();
  assert.equal(new URL(required(requests.at(-1))).searchParams.get('lang'), 'en');
});

test('weather gracefully handles denied location and malformed responses', async t => {
  const { service } = await engine(t, { request: async () => ({ message: 'Unavailable' }) });
  runtime.Location.current = async () => { throw Error('Denied'); };
  await service.setupWeather();
  await service.setupSunrise();
  assert.equal(required(service.data.weather).currentTemp, null);
  assert.equal(required(service.data.sun).sunrise, null);
});

test('API-key validation retains the legacy fallback and saves successful endpoint', async t => {
  const { service, requests } = await engine(t, { request: async url => url.includes('/3.0/') ? { cod: 401 } : weatherFixture() });
  const response = await service.getWeatherApiPath('new&key');
  assert(response !== null && typeof response !== 'string');
  assert.equal(required(response.current).temp, 22);
  assert.equal(new URL(required(requests[0])).searchParams.get('appid'), 'new&key');
  assert.equal(service.fm.readString('/library/weather-cal-api-path'), 'https://api.openweathermap.org/data/2.5/onecall');
  assert.match(await service.getWeatherApiPath(), /data\/2\.5\/onecall\?appid=test-key$/);
});

test('RSS parses CDATA, XML entities, optional fields, and safe cache filenames', async t => {
  const xml = '<rss><channel><item><title><![CDATA[Wind &amp; rain &#x1F327; &#9730;]]></title><link>https://example.com/a?x=1&amp;y=2</link><pubDate>Tue, 08 Sep 2026 10:00:00 GMT</pubDate></item><item><description>Untitled update</description></item></channel></rss>';
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  assert.equal(required(service.data.news)[0]!.title, 'Wind & rain 🌧 ☂');
  assert.equal(required(service.data.news)[0]!.link, 'https://example.com/a?x=1&y=2');
  assert.equal(new Date(required(required(service.data.news)[0]!.date)).toISOString(), '2026-09-08T10:00:00.000Z');
  assert.equal(required(service.data.news)[1]!.title, 'Untitled update');
  assert.equal(required(service.data.news)[1]!.date, null);
  for (const filename of runtime.FileManager.local().store.keys()) assert.equal(filename.slice('/library/'.length).includes('/'), false);
});

test('Atom handles namespaces, alternate links, single-quoted attributes and updated dates', async t => {
  const xml = `<atom:feed xmlns:atom="http://www.w3.org/2005/Atom"><atom:entry><atom:title type='html'>Title &quot;one&quot;</atom:title><atom:link rel='self' href='https://example.com/api/1'/><atom:link href='https://example.com/story/1' rel='alternate'/><atom:updated>2026-09-08T10:00:00Z</atom:updated></atom:entry></atom:feed>`;
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  assert.equal(required(service.data.news).length, 1);
  assert.equal(required(service.data.news)[0]!.title, 'Title "one"');
  assert.equal(required(service.data.news)[0]!.link, 'https://example.com/story/1');
  assert.equal(new Date(required(required(service.data.news)[0]!.date)).toISOString(), '2026-09-08T10:00:00.000Z');
});

test('news fallback preserves cache on invalid responses and applies changed item limits', async t => {
  let xml = '<rss><channel><item><title>First</title></item><item><title>Second</title></item></channel></rss>';
  const { service } = await engine(t, { request: async () => xml });
  service.settings.news.numberOfItems = '1';
  await service.setupNews();
  assert.equal(required(service.data.news).length, 1);
  service.settings.news.numberOfItems = '2';
  await service.setupNews();
  assert.equal(required(service.data.news).length, 2);
  ageCaches(service, 10);
  xml = '<html>Service unavailable</html>';
  await service.setupNews();
  assert.deepEqual(required(service.data.news).map(item => item.title), ['First', 'Second']);
  service.settings.news.numberOfItems = '1';
  await service.setupNews();
  assert.equal(required(service.data.news).length, 1);
});

test('COVID preserves upstream numeric fields, scopes countries, and supports global data', async t => {
  const { service, requests } = await engine(t, { request: async url => ({ cases: url.includes('/all') ? 200 : 100, todayCases: 0, totalTests: 42, updated: 1700000000000 }) });
  await service.setupCovid();
  assert.equal(required(service.data.covid).cases, 100);
  assert.equal(required(service.data.covid).todayCases, 0);
  assert.match(required(requests[0]), /^https:\/\/disease\.sh\/v3\/covid-19\/countries\/USA$/);
  service.settings.covid.country = 'World';
  await service.setupCovid();
  assert.equal(required(service.data.covid).cases, 200);
  assert.match(required(requests[1]), /\/all$/);
});

test('COVID aliases disease.sh fields and keeps old cache when refresh returns an error', async t => {
  let response: unknown = { cases: 100, tests: 42, testsPerOneMillion: 12, critical: 2 };
  const { service } = await engine(t, { request: async () => response });
  await service.setupCovid();
  assert.equal(required(service.data.covid).totalTests, 42);
  assert.equal(required(service.data.covid).testsPerOneMillion, 12);
  ageCaches(service, 20);
  response = { message: 'Country not found' };
  await service.setupCovid();
  assert.equal(required(service.data.covid).cases, 100);
});

test('truncated news feed preserves the previous headlines', async t => {
  let xml = '<rss><channel><item><title>Saved</title></item></channel></rss>';
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  ageCaches(service, 10);
  xml = '<rss><channel><item><title>Truncated';
  await service.setupNews();
  assert.deepEqual(required(service.data.news).map(item => item.title), ['Saved']);
});

test('a valid empty feed clears previously cached headlines', async t => {
  let xml = '<rss><channel><item><title>Saved</title></item></channel></rss>';
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  ageCaches(service, 10);
  xml = '<rss><channel></channel></rss>';
  await service.setupNews();
  assert.deepEqual(service.data.news, []);
});

test('long feed URLs remain isolated without exceeding filesystem filename limits', async t => {
  const { service } = await engine(t, { request: async url => '<rss><channel><item><title>' + (url.endsWith('a') ? 'A' : 'B') + '</title></item></channel></rss>' });
  service.settings.news.url = 'https://example.com/' + 'section/'.repeat(100) + 'a';
  await service.setupNews();
  assert.equal(required(service.data.news)[0]!.title, 'A');
  service.settings.news.url = service.settings.news.url.slice(0, -1) + 'b';
  await service.setupNews();
  assert.equal(required(service.data.news)[0]!.title, 'B');
  for (const file of runtime.FileManager.local().store.keys()) assert.ok(file.length < 255);
});

test('provider cache identity rejects unrelated envelopes', async t => {
  let offline = false;
  const { service } = await engine(t, { request: async () => { if (offline) throw Error('Offline'); return weatherFixture(); } });
  await service.setupWeather();
  const [path, stored] = required([...runtime.FileManager.local().store].find(([path]) => path.includes('cache')));
  const envelope: unknown = JSON.parse(stored.value);
  assert(envelope !== null && typeof envelope === 'object' && 'identity' in envelope);
  envelope.identity = 'unrelated cache identity';
  service.fm.writeString(path, JSON.stringify(envelope));
  offline = true;
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, null);
});

test('COVID supports an explicit compatible endpoint without mixing its country cache', async t => {
  const { service, requests } = await engine(t, { request: async url => ({ cases: url.includes('example.com') ? 25 : 100, tests: 12 }) });
  await service.setupCovid();
  service.settings.covid.apiUrl = 'https://example.com/covid/snapshot.json';
  await service.setupCovid();
  assert.equal(required(service.data.covid).cases, 25);
  assert.equal(required(requests.at(-1)), 'https://example.com/covid/snapshot.json');
  service.settings.covid.apiUrl = '';
  await service.setupCovid();
  assert.equal(required(service.data.covid).cases, 100);
  assert.equal(requests.length, 2);
});

test('stored iCloud API keys and endpoint preferences hydrate before weather requests', async t => {
  const { service, cloud, requests, downloads } = await engine(t, { iCloud: true, request: async () => weatherFixture() });
  service.fm = cloud;
  const keyPath = '/library/weather-cal-api-key';
  const endpointPath = '/library/weather-cal-api-path';
  cloud.writeString(keyPath, 'cloud-key');
  cloud.writeString(endpointPath, 'https://api.openweathermap.org/data/3.0/onecall');
  const readString = cloud.readString.bind(cloud);
  cloud.readString = path => {
    if ([keyPath, endpointPath].includes(path) && !downloads.includes(path)) throw Error('File has not downloaded');
    return readString(path);
  };
  await service.setupWeather();
  assert.equal(required(service.data.weather).currentTemp, 22);
  assert.equal(new URL(required(requests.at(-1))).searchParams.get('appid'), 'cloud-key');
  assert.ok(downloads.includes(keyPath));
  assert.ok(downloads.includes(endpointPath));
});


test('RSS preserves encoded angle brackets as headline text while removing actual markup', async t => {
  const xml = '<rss><channel><item><title>Why 3 &lt; 5 and 8 &gt; 6 matters</title></item><item><title><![CDATA[<b>Weather</b> &amp; traffic]]></title></item></channel></rss>';
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  assert.deepEqual(required(service.data.news).map(item => item.title), ['Why 3 < 5 and 8 > 6 matters', 'Weather & traffic']);
});

test('Atom distinguishes literal text titles from encoded HTML titles', async t => {
  const xml = '<feed><entry><title type="text">About &lt;em&gt; tags</title></entry><entry><title type="html">Weather &lt;em&gt;today&lt;/em&gt;</title></entry></feed>';
  const { service } = await engine(t, { request: async () => xml });
  await service.setupNews();
  assert.deepEqual(required(service.data.news).map(item => item.title), ['About <em> tags', 'Weather today']);
});
