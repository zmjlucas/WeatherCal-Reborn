import { finiteNumber, isRecord, record } from './json';
import type { RainForecast, RainOutlook } from '../data/rain-response';

/** Provider DTOs contain only fields consumed by the widget. */
export interface WeatherCondition { id?: number; main?: string; description?: string }
export interface WeatherCurrent { temp?: number; weather?: WeatherCondition[] }
export interface WeatherHour extends WeatherCurrent { dt?: number; pop?: number }
export interface WeatherDay {
  /** QWeather location-day interval in Unix seconds, independent of device timezone. */
  forecastStart?: number;
  forecastEnd?: number;
  /** Provider-local calendar date for labels; never inferred from device timezone. */
  forecastDate?: string;
  temp?: { max?: number; min?: number };
  weather?: WeatherCondition[];
  sunrise?: number;
  sunset?: number;
  /** Probabilities in [0, 1]; period values must not be treated as all-day pop. */
  pop?: number;
  daytimePop?: number;
  nighttimePop?: number;
}
export interface WeatherResponse { attributions?: string[]; current?: WeatherCurrent; daily?: WeatherDay[]; hourly?: WeatherHour[]; cod?: number | string; message?: string }
export interface ForecastDay {
  High: number | null; Low: number | null; Condition: number;
  /** Undefined preserves legacy/custom labels; null means the provider date is unknown. */
  date?: string | null;
}
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
  /** Percentages for providers that forecast separate daytime/nighttime periods. */
  tomorrowRainByPeriod?: { daytime: number | null; nighttime: number | null };
}
export interface SunData { sunrise: number | null; sunset: number | null; tomorrow: number | null }
export interface LocationData { latitude?: number; longitude?: number; locality?: string | null; cacheExpired?: boolean }
export interface WidgetData {
  rain?: { forecast: RainForecast | null; outlook: RainOutlook | null };
  weatherError?: string;
  weatherAttributions?: string[];
  location?: LocationData;
  weather?: WeatherData;
  sun?: SunData;
  events?: CalendarEvent[];
  reminders?: Reminder[];
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
  if (finiteNumber(source.dt)) hour.dt = source.dt;
  if (finiteNumber(source.temp)) hour.temp = source.temp;
  if (finiteNumber(source.pop)) hour.pop = source.pop;
  const conditions = weatherConditions(source.weather);
  if (conditions) hour.weather = conditions;
  return hour;
}

export function parseWeatherResponse(value: unknown): WeatherResponse | null {
  if (!isRecord(value)) return null;
  const response: WeatherResponse = {};
  if (Array.isArray(value.attributions)) response.attributions = value.attributions.filter((entry): entry is string => typeof entry === 'string');
  if (typeof value.cod === 'string' || finiteNumber(value.cod)) response.cod = value.cod;
  if (typeof value.message === 'string') response.message = value.message;
  if (isRecord(value.current)) response.current = weatherHour(value.current);
  if (Array.isArray(value.hourly)) response.hourly = value.hourly.map(weatherHour);
  if (Array.isArray(value.daily)) response.daily = value.daily.map((candidate: unknown) => {
    const source = record(candidate);
    const day: WeatherDay = {};
    if (finiteNumber(source.forecastStart)) day.forecastStart = source.forecastStart;
    if (finiteNumber(source.forecastEnd)) day.forecastEnd = source.forecastEnd;
    if (typeof source.forecastDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(source.forecastDate)) day.forecastDate = source.forecastDate;
    if (isRecord(source.temp)) {
      day.temp = {};
      if (finiteNumber(source.temp.max)) day.temp.max = source.temp.max;
      if (finiteNumber(source.temp.min)) day.temp.min = source.temp.min;
    }
    if (finiteNumber(source.sunrise)) day.sunrise = source.sunrise;
    if (finiteNumber(source.sunset)) day.sunset = source.sunset;
    if (finiteNumber(source.pop)) day.pop = source.pop;
    for (const field of ['daytimePop', 'nighttimePop'] as const) {
      const probability = source[field];
      if (finiteNumber(probability) && probability >= 0 && probability <= 1) day[field] = probability;
    }
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
