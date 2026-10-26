import type { WeatherCalContext } from '../types/context';
import { finiteNumber } from '../types/json';
import { getQWeatherHost, qweatherCacheScope } from './qweather';
import { qweatherLocale } from './qweather-locale';
import { withQWeatherSession } from './qweather-session';
import { parseRainResponse, assessRain } from './rain-response';
import type { RainForecast } from './rain-response';

export default {
  async setupRain(this: WeatherCalContext): Promise<void> {
    this.data.rain = { forecast: null, outlook: null };
    if (this.settings.weather.provider === 'openweather') return;
    if (!this.data.location) await this.setupLocation();
    const { latitude, longitude } = this.data.location || {};
    if (!finiteNumber(latitude) || !finiteNumber(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return;
    const host = getQWeatherHost(this.name);
    if (!host) return;
    const scope = qweatherCacheScope(host);
    const language = qweatherLocale(this.settings.weather.locale || this.locale || Device.locale()).startsWith('zh') ? 'zh' : 'en';
    const location = longitude.toFixed(2) + ',' + latitude.toFixed(2);
    const identity = JSON.stringify(['qweather-minutely-5m', scope, location, language]);
    const path = this.getDataCachePath('rain-cache', identity);
    let fallback: RainForecast | null = null;
    let forecast: RainForecast | null = null;
    try {
      forecast = await withQWeatherSession(host, scope, async request => {
        if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) await this.fm.downloadFileFromiCloud(path);
        const cached = this.getCache(path, 5, 15);
        fallback = cached?.identity === identity ? parseRainResponse(cached.response) : null;
        if (fallback && !assessRain(fallback, this.now.getTime())) fallback = null;
        if (fallback && !cached?.cacheExpired) return fallback;
        const fresh = await request('/v7/minutely/5m?location=' + encodeURIComponent(location) + '&lang=' + language, value => {
          const parsed = parseRainResponse(value);
          return parsed && assessRain(parsed, this.now.getTime()) ? parsed : null;
        });
        // Cache only validated forecast fields; no raw summaries, URLs or credentials.
        const response = {
          code: '200', updateTime: new Date(fresh.updateTime).toISOString(),
          minutely: fresh.points.map(point => ({ fxTime: new Date(point.time).toISOString(), precip: String(point.amount), type: point.type })),
          refer: { sources: fresh.sources }
        };
        this.fm.writeString(path, JSON.stringify({ identity, response }));
        return fresh;
      }, 'minutely');
    } catch { forecast = fallback; }
    this.data.rain = { forecast, outlook: forecast ? assessRain(forecast, this.now.getTime()) : null };
  }
};
