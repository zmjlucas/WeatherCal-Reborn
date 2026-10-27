import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initializedContext } from './helpers/context';
import { installScriptable, texts } from './helpers/scriptable';

test('content data services may populate state and return no value', async t => {
  const environment = installScriptable(t);
  const context = await initializedContext(environment);
  const widget = new environment.Stack();
  context.setupWeather = async function () {
    this.data.weather = { currentTemp: 0, currentCondition: 800, currentDescription: 'Clear', todayHigh: 0, todayLow: 0, forecast: [], hourly: [], nextHourRain: 0, tomorrowRain: 0 };
  };
  context.setupSunrise = async function () { this.data.sun = { sunrise: null, sunset: null, tomorrow: null }; };
  context.setupEvents = async function () { this.data.events = []; };
  context.setupReminders = async function () { this.data.reminders = []; };
  await context.current(widget);
  await context.future(widget);
  await context.forecast(widget);
  await context.sunrise(widget);
  await context.events(widget);
  await context.reminders(widget);
  assert(texts(widget).includes('0°'));
});

