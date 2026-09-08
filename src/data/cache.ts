// A bounded, filesystem-safe name for shared provider caches. The full identity is
// also stored in the cache envelope and checked on read to reject hash collisions.
import type { WeatherCalContext } from '../types/context';

export default {
  getDataCachePath(this: WeatherCalContext, prefix: string, identity: string): string {
    let hash = 2166136261;
    for (let index = 0; index < identity.length; index++) {
      hash = Math.imul(hash ^ identity.charCodeAt(index), 16777619);
    }
    return this.fm.joinPath(this.fm.libraryDirectory(), 'weather-cal-' + prefix + '-' + (hash >>> 0).toString(16));
  }
};
