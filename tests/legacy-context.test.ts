import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initializedContext } from './helpers/context';
import { installScriptable, texts } from './helpers/scriptable';

test('legacy service overrides may populate state and return no value', async t => {
  const environment = installScriptable(t);
  const context = await initializedContext(environment);
  const widget = await context.createWidget('row\ncolumn', 'Services', false);
  context.setupWeather = async function () {
    this.data.weather = { currentTemp: 0, currentCondition: 800, currentDescription: 'Clear', todayHigh: 0, todayLow: 0, forecast: [], hourly: [], nextHourRain: 0, tomorrowRain: 0 };
  };
  context.setupSunrise = async function () { this.data.sun = { sunrise: null, sunset: null, tomorrow: null }; };
  context.setupEvents = async function () { this.data.events = []; };
  context.setupReminders = async function () { this.data.reminders = []; };
  context.setupNews = async function () { this.data.news = []; };
  context.setupCovid = async function () { this.data.covid = { world: 0 }; };
  await context.current(context.currentColumn);
  await context.future(context.currentColumn);
  await context.forecast(context.currentColumn);
  await context.sunrise(context.currentColumn);
  await context.events(context.currentColumn);
  await context.reminders(context.currentColumn);
  await context.news(context.currentColumn);
  await context.covid(context.currentColumn);
  assert(texts(widget).includes('0°'));
});

test('object layouts fall back to default font when forecast-specific fonts are absent', async t => {
  installScriptable(t);
  const context = await initializedContext();
  const settings = context.settings;
  settings.layout = 'row\ncolumn\nforecast';
  // The legacy object contract explicitly permits omitted item-specific formats.
  const { smallTemp: _smallTemp, tinyTemp: _tinyTemp, ...legacyFont } = settings.font;
  settings.font = legacyFont;
  const custom = {
    forecast: async () => {
      context.data.weather = { currentTemp: 0, currentCondition: 800, currentDescription: 'Clear', todayHigh: 0, todayLow: 0, forecast: [{ High: 1, Low: 0, Condition: 800 }, { High: 2, Low: 1, Condition: 800 }], hourly: [], nextHourRain: 0, tomorrowRain: 0 };
      context.data.sun = { sunrise: null, sunset: null, tomorrow: null };
      await context.forecast(context.currentColumn);
    },
  };
  const widget = await context.createWidget(settings, 'Legacy font', false, custom);
  assert(texts(widget).includes('2'));
});
