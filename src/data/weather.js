// Licensed under MIT. See LICENSE.

module.exports = {
  // Sun and weather use the same scoped response, with their original cache ages.
  async loadWeatherData(minAge, maxAge) {
    if (!this.data.location) await this.setupLocation();
    const safeLocales = this.getOpenWeatherLocaleCodes();
    const forced = this.settings.weather.locale || '';
    let locale = forced.toLowerCase().replace(/-/g, '_');
    if (!forced) {
      const candidates = [this.locale || '', Device.locale() || '']
        .flatMap(value => {
          const normalized = value.toLowerCase().replace(/-/g, '_');
          return [normalized, normalized.split('_')[0]];
        });
      locale = candidates.find(value => safeLocales.includes(value)) || 'en';
    }
    const { latitude, longitude } = this.data.location;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return { locale, response: null };
    const units = this.settings.widget.units;
    const identity = JSON.stringify([latitude, longitude, units, locale]);
    const path = this.getDataCachePath('cache', identity);
    const cache = this.getCache(path, minAge, maxAge);
    let response = cache?.identity === identity ? cache.response : null;
    if (!response || cache.cacheExpired) {
      try {
        const apiPath = await this.getWeatherApiPath();
        const url = apiPath + '&lat=' + latitude + '&lon=' + longitude +
          '&exclude=minutely,alerts&units=' + encodeURIComponent(units) + '&lang=' + encodeURIComponent(locale);
        const fresh = await new Request(url).loadJSON();
        // Do not replace usable data with an API error or malformed payload.
        if (fresh && !fresh.cod && (fresh.current || Array.isArray(fresh.daily) || Array.isArray(fresh.hourly))) {
          response = fresh;
          this.fm.writeString(path, JSON.stringify({ identity, response }));
        }
      } catch { /* An unexpired fallback remains usable while offline. */ }
    }
    return { locale, response };
  },

  async setupSunrise() {
    const { response } = await this.loadWeatherData(60, 1440);
    const daily = response?.daily || [];
    this.data.sun = {
      sunrise: Number.isFinite(daily[0]?.sunrise) ? daily[0].sunrise * 1000 : null,
      sunset: Number.isFinite(daily[0]?.sunset) ? daily[0].sunset * 1000 : null,
      tomorrow: Number.isFinite(daily[1]?.sunrise) ? daily[1].sunrise * 1000 : null
    };
  },

  async setupWeather() {
    const { locale, response } = await this.loadWeatherData(1, 60);
    const current = response?.current;
    const daily = response?.daily || [];
    const hourly = response?.hourly || [];
    const condition = current?.weather?.[0];
    const english = locale.split('_')[0] === 'en';
    this.data.weather = {
      currentTemp: current?.temp ?? null,
      currentCondition: condition?.id ?? 100,
      currentDescription: (english ? condition?.main : condition?.description) || '--',
      todayHigh: daily[0]?.temp?.max ?? null,
      todayLow: daily[0]?.temp?.min ?? null,
      forecast: [], hourly: [],
      tomorrowRain: Number.isFinite(daily[1]?.pop) ? daily[1].pop * 100 : null,
      nextHourRain: Number.isFinite(hourly[1]?.pop) ? hourly[1].pop * 100 : null
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

  async getWeatherApiPath(newApiKey) {
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
    let response;
    // Existing users can still validate legacy subscriptions through 2.5.
    for (const path of [apiPath, 'https://api.openweathermap.org/data/2.5/onecall']) {
      apiPath = path;
      try { response = await new Request(path + parameter + '&lat=37.332280&lon=-122.010980').loadJSON(); }
      catch { response = undefined; }
      if (!response?.cod) break;
    }
    if (response && !response.cod) this.writePreference('weather-cal-api-path', apiPath);
    return newApiKey ? response : apiPath + parameter;
  }
};
