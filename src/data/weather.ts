// Licensed under MIT. See LICENSE.

import { loadQWeather } from './qweather';
import { qweatherLocale } from './qweather-locale';
import type { WeatherCalContext } from '../types/context';
import { parseWeatherResponse } from '../types/data';
import type { WeatherResponse, WeatherHour } from '../types/data';
import { finiteNumber } from '../types/json';

export default {
  // Sun and weather use the same scoped response, with their original cache ages.
  async loadWeatherData(this: WeatherCalContext, minAge: number, maxAge: number): Promise<{ locale: string; response: WeatherResponse | null }> {
    if (!this.data.location) await this.setupLocation();
    const safeLocales = this.getOpenWeatherLocaleCodes();
    const forced = this.settings.weather.locale || '';
    let locale = forced.toLowerCase().replace(/-/g, '_');
    if (!forced) {
      const candidates = [this.locale || '', Device.locale() || '']
        .flatMap(value => {
          const normalized = value.toLowerCase().replace(/-/g, '_');
          return [normalized, normalized.split('_')[0] || normalized];
        });
      locale = candidates.find(value => safeLocales.includes(value)) || 'en';
    }
    const { latitude, longitude } = this.data.location || {};
    if (!finiteNumber(latitude) || !finiteNumber(longitude)) return { locale, response: null };
    if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return { locale, response: null };
    if (this.settings.weather.provider !== 'openweather') {
      locale = qweatherLocale(forced || this.locale || Device.locale());
      const response = await loadQWeather(this, latitude, longitude, locale, maxAge);
      this.data.weatherAttributions = response?.attributions || [];
      return { locale, response };
    }
    const languageAliases: Record<string, string> = { zh: 'zh_cn', zh_hans: 'zh_cn', zh_hant: 'zh_tw', ko: 'kr', cs: 'cz', nb: 'no' };
    locale = languageAliases[locale] || locale;
    if (!safeLocales.includes(locale)) locale = 'en';
    delete this.data.weatherAttributions;
    delete this.data.weatherError;
    const units = this.settings.widget.units;
    const identity = JSON.stringify(['openweather', latitude, longitude, units, locale]);
    const path = this.getDataCachePath('cache', identity);
    const cache = this.getCache(path, minAge, maxAge);
    let response = cache?.identity === identity ? parseWeatherResponse(cache.response) : null;
    if (!response || cache?.cacheExpired) {
      try {
        const apiPath = await this.getWeatherApiPath();
        const url = apiPath + '&lat=' + latitude + '&lon=' + longitude +
          '&exclude=minutely,alerts&units=' + encodeURIComponent(units) + '&lang=' + encodeURIComponent(locale);
        const raw: unknown = await new Request(url).loadJSON();
        const fresh = parseWeatherResponse(raw);
        // Do not replace usable data with an API error or malformed payload.
        if (fresh && !fresh.cod && (fresh.current || Array.isArray(fresh.daily) || Array.isArray(fresh.hourly))) {
          response = fresh;
          this.fm.writeString(path, JSON.stringify({ identity, response: raw }));
        }
      } catch { /* An unexpired fallback remains usable while offline. */ }
    }
    return { locale, response };
  },

  async setupSunrise(this: WeatherCalContext): Promise<void> {
    const { response } = await this.loadWeatherData(60, 1440);
    const daily = response?.daily || [];
    this.data.sun = {
      sunrise: finiteNumber(daily[0]?.sunrise) ? daily[0].sunrise * 1000 : null,
      sunset: finiteNumber(daily[0]?.sunset) ? daily[0].sunset * 1000 : null,
      tomorrow: finiteNumber(daily[1]?.sunrise) ? daily[1].sunrise * 1000 : null
    };
  },

  async setupWeather(this: WeatherCalContext): Promise<void> {
    const { locale, response } = await this.loadWeatherData(1, 60);
    const current = response?.current;
    const daily = response?.daily || [];
    const suppliedHours = response?.hourly || [];
    const hourStart = Math.floor(this.now.getTime() / 3600000) * 3600;
    // QWeather starts at the next available forecast hour. Re-align cached data
    // each render rather than assuming index 1 always means the next hour.
    const hourly: WeatherHour[] = this.settings.weather.provider !== 'openweather' && suppliedHours.some(hour => hour.dt !== undefined)
      ? Array.from({ length: 8 }, (_, index) => suppliedHours.find(hour => hour.dt === hourStart + index * 3600) || (index === 0 ? current || {} : {}))
      : suppliedHours;
    const condition = current?.weather?.[0];
    const english = locale.split('_')[0] === 'en';
    this.data.weather = {
      currentTemp: current?.temp ?? null,
      currentCondition: condition?.id ?? 100,
      currentDescription: (english ? condition?.main : condition?.description) || '--',
      todayHigh: daily[0]?.temp?.max ?? null,
      todayLow: daily[0]?.temp?.min ?? null,
      forecast: [], hourly: [],
      tomorrowRain: finiteNumber(daily[1]?.pop) ? daily[1].pop * 100 : null,
      nextHourRain: finiteNumber(hourly[1]?.pop) ? hourly[1].pop * 100 : null
    };
    for (let index = 0; index <= 7; index++) {
      this.data.weather.forecast.push({
        High: daily[index]?.temp?.max ?? null,
        Low: daily[index]?.temp?.min ?? null,
        Condition: daily[index]?.weather?.[0]?.id ?? 100
      });
      this.data.weather.hourly.push({
        Temp: hourly[index]?.temp ?? null,
        Condition: hourly[index]?.weather?.[0]?.id ?? 100
      });
    }
  },

  getWeatherApiPath
};

function getWeatherApiPath(this: WeatherCalContext): Promise<string>;
function getWeatherApiPath(this: WeatherCalContext, newApiKey: string): Promise<string | WeatherResponse | null>;
async function getWeatherApiPath(this: WeatherCalContext, newApiKey?: string): Promise<string | WeatherResponse | null> {
    const keyPath = this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-api-key');
    const preference = this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-api-path');
    if (!newApiKey) {
      for (const path of [keyPath, preference]) {
        if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) await this.fm.downloadFileFromiCloud(path);
      }
    }
    const key = newApiKey || (this.fm.fileExists(keyPath) ? this.fm.readString(keyPath).replace(/"/g, '').trim() : '');
    const parameter = '?appid=' + encodeURIComponent(key);
    if (!newApiKey && this.fm.fileExists(preference)) return this.fm.readString(preference).replace(/"/g, '').trim() + parameter;

    let apiPath = 'https://api.openweathermap.org/data/3.0/onecall';
    let response: WeatherResponse | null = null;
    // Existing users can still validate legacy subscriptions through 2.5.
    for (const path of [apiPath, 'https://api.openweathermap.org/data/2.5/onecall']) {
      apiPath = path;
      try { response = parseWeatherResponse(await new Request(path + parameter + '&lat=37.332280&lon=-122.010980').loadJSON()); }
      catch { response = null; }
      if (!response?.cod) break;
    }
    if (response && !response.cod) this.writePreference('weather-cal-api-path', apiPath);
    return newApiKey ? response : apiPath + parameter;
}
