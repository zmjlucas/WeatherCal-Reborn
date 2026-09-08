// Licensed under MIT. See LICENSE.

module.exports = {
  writePreference(name, value, inputPath = null) {
      const preference = typeof value == "string" ? value : JSON.stringify(value)
      this.fm.writeString(inputPath || this.fm.joinPath(this.fm.libraryDirectory(), name), preference)
    },

  getCache(path, minAge = -1, maxAge) {
      if (!this.fm.fileExists(path)) return null
    let cache
    try { cache = JSON.parse(this.fm.readString(path)) } catch { return null }
    if (!cache || typeof cache !== "object") return null
    const age = (this.now.getTime() - this.fm.modificationDate(path).getTime())/60000

      // Maximum ages must be explicitly defined.
      if (Number.isInteger(maxAge) && age > maxAge) return null

      // The cache is always expired if there's no acceptable minimum age.
      if (minAge != -1 && (!minAge || age > minAge)) cache.cacheExpired = true
      return cache
    }
};
