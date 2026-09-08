import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.

export default {
  writePreference(this: WeatherCalContext, name: string | null, value: unknown, inputPath: string | null = null): void {
      const preference = typeof value == "string" ? value : JSON.stringify(value)
      this.fm.writeString(inputPath || this.fm.joinPath(this.fm.libraryDirectory(), name ?? ""), preference)
    },

  getCache(this: WeatherCalContext, path: string, minAge: number | null = -1, maxAge?: number): Record<string, unknown> | null {
      if (!this.fm.fileExists(path)) return null
    let cache: unknown
    try { cache = JSON.parse(this.fm.readString(path)) } catch { return null }
    if (!cache || typeof cache !== "object" || Array.isArray(cache)) return null
    const record: Record<string, unknown> = Object.fromEntries(Object.entries(cache))
    const age = (this.now.getTime() - this.fm.modificationDate(path).getTime())/60000

      // Maximum ages must be explicitly defined.
      if (maxAge !== undefined && Number.isInteger(maxAge) && age > maxAge) return null

      // The cache is always expired if there's no acceptable minimum age.
      if (minAge != -1 && (!minAge || age > minAge)) record.cacheExpired = true
      return record
    }
};
