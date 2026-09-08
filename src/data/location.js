// Licensed under MIT. See LICENSE.

module.exports = {
  async setupLocation() {
    const path = this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-location');
    const cache = this.getCache(path, this.settings ? parseInt(this.settings.widget.updateLocation) : null);
    let location = cache;
    if (!cache || cache.cacheExpired) {
      try {
        const current = await Location.current();
        if (Number.isFinite(current.latitude) && Number.isFinite(current.longitude)) location = current;
      } catch { /* Retain the last known location when permission or GPS is unavailable. */ }
      if (Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)) {
        try {
          const [place] = await Location.reverseGeocode(location.latitude, location.longitude, this.locale);
          location.locality = place?.locality || place?.postalAddress?.city || place?.administrativeArea || null;
        } catch { location.locality = cache?.locality || null; }
        if (!location.cacheExpired) this.fm.writeString(path, JSON.stringify(location));
      }
    }
    this.data.location = location || { locality: null };
    return Number.isFinite(this.data.location.latitude) && Number.isFinite(this.data.location.longitude);
  }
};
