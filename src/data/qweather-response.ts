import type { WeatherCondition, WeatherCurrent, WeatherDay, WeatherHour, WeatherResponse } from '../types/data';
import { finiteNumber, isRecord, record } from '../types/json';

// QWeather weather/v1 uses metric values with explicit units, not v7 strings.
// https://dev.qweather.com/docs/api/weather/weather-current/
function temperature(input: unknown, units: string): number | undefined {
  const value = record(input);
  if (!finiteNumber(value.value) || value.unit !== '°C') return undefined;
  return units === 'imperial' ? value.value * 9 / 5 + 32 : units === 'standard' ? value.value + 273.15 : value.value;
}

function condition(input: unknown): WeatherCondition[] {
  const source = record(input);
  const code = Number(source.code);
  let id = 100; // Existing renderer's unavailable symbol.
  if (code === 100 || code === 150) id = 800;
  else if ([101, 102, 103, 151, 152, 153].includes(code)) id = 802;
  else if (code === 104) id = 804;
  else if ([302, 303, 304].includes(code)) id = 200;
  else if (code === 313) id = 511;
  else if (code >= 300 && code <= 399) id = 500;
  else if ([404, 405, 406, 456].includes(code)) id = 611;
  else if ((code >= 400 && code <= 499)) id = 600;
  else if ([500, 501, 509, 510, 514, 515].includes(code)) id = 741;
  else if ([502, 511, 512, 513].includes(code)) id = 721;
  else if ([503, 504, 507, 508].includes(code)) id = 761;
  const text = typeof source.text === 'string' ? source.text : '--';
  return [{ id, main: text, description: text }];
}

export function parseQWeatherPart(kind: 'current' | 'hourly' | 'daily', value: unknown, units: string): WeatherResponse | null {
  if (!isRecord(value) || value.error) return null;
  const result: WeatherResponse = {};
  const attributions = record(value.metadata).attributions;
  if (Array.isArray(attributions)) result.attributions = attributions.filter((entry): entry is string => typeof entry === 'string');
  if (kind === 'current') {
    const temp = temperature(value.temperature, units);
    if (temp === undefined) return null;
    const current: WeatherCurrent = { temp, weather: condition(value.condition) };
    result.current = current;
  } else if (kind === 'hourly') {
    if (!Array.isArray(value.hours) || !value.hours.length) return null;
    result.hourly = [];
    for (const candidate of value.hours) {
      const source = record(candidate);
      const temp = temperature(source.temperature, units);
      if (temp === undefined) return null;
      const hour: WeatherHour = { temp, weather: condition(source.condition) };
      if (typeof source.forecastTime === 'string' && Number.isFinite(Date.parse(source.forecastTime))) hour.dt = Date.parse(source.forecastTime) / 1000;
      const pop = record(source.precipitation).probability;
      if (finiteNumber(pop) && pop >= 0 && pop <= 1) hour.pop = pop;
      result.hourly.push(hour);
    }
  } else {
    if (!Array.isArray(value.days) || !value.days.length) return null;
    result.daily = [];
    for (const candidate of value.days) {
      const source = record(candidate);
      const max = temperature(source.temperatureMax, units);
      const min = temperature(source.temperatureMin, units);
      if (max === undefined || min === undefined) return null;
      const day: WeatherDay = { temp: { max, min }, weather: condition(record(source.daytime).condition) };
      for (const [sourceField, field] of [['forecastStartTime', 'forecastStart'], ['forecastEndTime', 'forecastEnd']] as const) {
        const time = source[sourceField];
        // An explicit offset (including UTC) avoids interpreting missing zones on the device.
        if (typeof time === 'string' && /T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(time) && Number.isFinite(Date.parse(time))) day[field] = Date.parse(time) / 1000;
      }
      // daily requests use localTime=true. Only a local midnight establishes a calendar label;
      // UTC-formatted non-midnight intervals remain usable for selection, not date guessing.
      if (day.forecastStart !== undefined && typeof source.forecastStartTime === 'string') {
        const localDate = source.forecastStartTime.match(/^(\d{4}-\d{2}-\d{2})T00:00(?::00(?:\.0+)?)?(?:Z|[+-]\d{2}:\d{2})$/i);
        if (localDate) day.forecastDate = localDate[1]!;
      }
      const astro = record(source.astro);
      for (const field of ['sunrise', 'sunset'] as const) {
        const time = astro[field];
        if (typeof time === 'string' && Number.isFinite(Date.parse(time))) day[field] = Date.parse(time) / 1000;
      }
      // Daytime/nighttime probabilities are not an all-day probability.
      for (const [period, field] of [['daytime', 'daytimePop'], ['nighttime', 'nighttimePop']] as const) {
        const pop = record(record(source[period]).precipitation).probability;
        if (finiteNumber(pop) && pop >= 0 && pop <= 1) day[field] = pop;
      }
      result.daily.push(day);
    }
  }
  return result;
}
