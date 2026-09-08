// Licensed under MIT. See LICENSE.
import type { WeatherCalContext } from '../types/context';
import { parseLocation } from '../types/data';
import { finiteNumber, record } from '../types/json';

export default {
  async setupLocation(this: WeatherCalContext): Promise<boolean> {
    const path = this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-location');
    const cache = parseLocation(this.getCache(path, this.hasSettings ? parseInt(String(this.settings.widget.updateLocation)) : null));
    let location = cache;
    if (!cache || cache.cacheExpired) {
      try {
        const current: unknown = await Location.current();
        location = parseLocation(current) ?? location;
      } catch { /* Retain the last known location when permission or GPS is unavailable. */ }
      if (location && finiteNumber(location.latitude) && finiteNumber(location.longitude)) {
        try {
          const places: unknown = await Location.reverseGeocode(location.latitude, location.longitude, this.locale);
          const place = record(Array.isArray(places) ? places[0] : undefined);
          const locality = place.locality || record(place.postalAddress).city || place.administrativeArea;
          location.locality = typeof locality === 'string' ? locality : null;
        } catch { location.locality = cache?.locality || null; }
        if (!location.cacheExpired) this.fm.writeString(path, JSON.stringify(location));
      }
    }
    this.data.location = location || { locality: null };
    return finiteNumber(this.data.location.latitude) && finiteNumber(this.data.location.longitude);
  }
};
