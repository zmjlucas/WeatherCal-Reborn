import type { WeatherDay, WeatherResponse } from '../types/data';
import { finiteNumber } from '../types/json';

/** Select location days by provider boundaries on every read, including cached/offline data. */
export function weatherDays(response: WeatherResponse | null, now: Date, provider: string): WeatherDay[] {
  const supplied = response?.daily ?? [];
  // OpenWeather's daily timestamp has different semantics from a QWeather day interval.
  if (provider === 'openweather') return supplied;
  const dated = supplied.filter((day): day is WeatherDay & { forecastStart: number; forecastEnd: number } =>
    finiteNumber(day.forecastStart) && finiteNumber(day.forecastEnd) && day.forecastEnd > day.forecastStart);
  const time = now.getTime() / 1000;
  let day = dated.find(value => value.forecastStart <= time && time < value.forecastEnd);
  const aligned: WeatherDay[] = [];
  while (day && aligned.length < 8) {
    aligned.push(day);
    const nextStart = day.forecastEnd;
    day = dated.find(value => value.forecastStart === nextStart);
  }
  // Never shift an undated/gapped day into today or tomorrow. Old caches can still
  // supply current/hourly weather until the next normal refresh adds daily dates.
  return aligned;
}
