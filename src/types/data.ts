import { finiteNumber, isRecord, record } from './json';

/** Provider DTOs contain only fields consumed by the widget. */
export interface WeatherCondition { id?: number; main?: string; description?: string }
export interface WeatherCurrent { temp?: number; weather?: WeatherCondition[] }
export interface WeatherHour extends WeatherCurrent { pop?: number }
export interface WeatherDay { temp?: { max?: number; min?: number }; weather?: WeatherCondition[]; sunrise?: number; sunset?: number; pop?: number }
export interface WeatherResponse { current?: WeatherCurrent; daily?: WeatherDay[]; hourly?: WeatherHour[]; cod?: number | string; message?: string }
export interface ForecastDay { High: number | null; Low: number | null; Condition: number }
export interface ForecastHour { Temp: number | null; Condition: number }
export interface WeatherData {
  currentTemp: number | null;
  currentCondition: number;
  currentDescription: string;
  todayHigh: number | null;
  todayLow: number | null;
  forecast: ForecastDay[];
  hourly: ForecastHour[];
  tomorrowRain: number | null;
  nextHourRain: number | null;
}
export interface SunData { sunrise: number | null; sunset: number | null; tomorrow: number | null }
export interface LocationData { latitude?: number; longitude?: number; locality?: string | null; cacheExpired?: boolean }
export interface NewsListing { title: string; link: string; date: string | null }
/** COVID tokens intentionally support additional numeric provider fields. */
export type CovidData = Record<string, number>;
export interface WidgetData {
  location?: LocationData;
  weather?: WeatherData;
  sun?: SunData;
  events?: CalendarEvent[];
  reminders?: Reminder[];
  news?: NewsListing[];
  covid?: CovidData;
}

function weatherConditions(value: unknown): WeatherCondition[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((candidate: unknown) => {
    const source = record(candidate);
    const condition: WeatherCondition = {};
    if (finiteNumber(source.id)) condition.id = source.id;
    if (typeof source.main === 'string') condition.main = source.main;
    if (typeof source.description === 'string') condition.description = source.description;
    return condition;
  });
}

function weatherHour(value: unknown): WeatherHour {
  const source = record(value);
  const hour: WeatherHour = {};
  if (finiteNumber(source.temp)) hour.temp = source.temp;
  if (finiteNumber(source.pop)) hour.pop = source.pop;
  const conditions = weatherConditions(source.weather);
  if (conditions) hour.weather = conditions;
  return hour;
}

export function parseWeatherResponse(value: unknown): WeatherResponse | null {
  if (!isRecord(value)) return null;
  const response: WeatherResponse = {};
  if (typeof value.cod === 'string' || finiteNumber(value.cod)) response.cod = value.cod;
  if (typeof value.message === 'string') response.message = value.message;
  if (isRecord(value.current)) response.current = weatherHour(value.current);
  if (Array.isArray(value.hourly)) response.hourly = value.hourly.map(weatherHour);
  if (Array.isArray(value.daily)) response.daily = value.daily.map((candidate: unknown) => {
    const source = record(candidate);
    const day: WeatherDay = {};
    if (isRecord(source.temp)) {
      day.temp = {};
      if (finiteNumber(source.temp.max)) day.temp.max = source.temp.max;
      if (finiteNumber(source.temp.min)) day.temp.min = source.temp.min;
    }
    if (finiteNumber(source.sunrise)) day.sunrise = source.sunrise;
    if (finiteNumber(source.sunset)) day.sunset = source.sunset;
    if (finiteNumber(source.pop)) day.pop = source.pop;
    const conditions = weatherConditions(source.weather);
    if (conditions) day.weather = conditions;
    return day;
  });
  return response;
}

export function parseLocation(value: unknown): LocationData | null {
  if (!isRecord(value) || !finiteNumber(value.latitude) || !finiteNumber(value.longitude)) return null;
  const { locality, cacheExpired, ...coordinates } = value;
  const location: LocationData = { ...coordinates, latitude: value.latitude, longitude: value.longitude };
  if (typeof locality === 'string' || locality === null) location.locality = locality;
  if (typeof cacheExpired === 'boolean') location.cacheExpired = cacheExpired;
  return location;
}

export function parseCovid(value: unknown): CovidData | null {
  if (!isRecord(value) || !finiteNumber(value.cases)) return null;
  const result: CovidData = {};
  for (const [key, number] of Object.entries(value)) if (finiteNumber(number)) result[key] = number;
  const tests = result.totalTests ?? result.tests;
  if (tests !== undefined) result.totalTests = tests;
  return result;
}

export function parseNews(value: unknown): NewsListing[] | null {
  if (!Array.isArray(value)) return null;
  const result: NewsListing[] = [];
  for (const candidate of value) {
    if (!isRecord(candidate) || typeof candidate.title !== 'string' || typeof candidate.link !== 'string' || !(candidate.date === null || typeof candidate.date === 'string')) return null;
    result.push({ title: candidate.title, link: candidate.link, date: candidate.date });
  }
  return result;
}
