// Licensed under MIT. See LICENSE.

module.exports = {
  async setupCovid() {
    const country = (this.settings.covid.country || 'World').trim();
    // disease.sh retains the original Worldometer-style fields. Its source data
    // is historical; a successful request does not mean case counts are current.
    const endpoint = this.settings.covid.apiUrl ||
      'https://disease.sh/v3/covid-19/' + (/^(world|all)$/i.test(country) ? 'all' : 'countries/' + encodeURIComponent(country));
    const identity = JSON.stringify([endpoint, country]);
    const path = this.getDataCachePath('covid', identity);
    const cache = this.getCache(path, 15, 1440);
    let response = cache?.identity === identity ? cache.response : null;
    if (!response || cache.cacheExpired) {
      try {
        const fresh = await new Request(endpoint).loadJSON();
        if (fresh && !Array.isArray(fresh) && Number.isFinite(fresh.cases)) {
          response = { ...fresh, totalTests: fresh.totalTests ?? fresh.tests };
          this.fm.writeString(path, JSON.stringify({ identity, response }));
        }
      } catch { /* Keep a recent successful response when the provider is unavailable. */ }
    }
    this.data.covid = response || {};
  },

  async setupNews() {
    const identity = this.settings.news.url;
    const path = this.getDataCachePath('news', identity);
    const cache = this.getCache(path, 1, 1440);
    let listings = cache?.identity === identity && Array.isArray(cache.listings) ? cache.listings : null;
    if (!listings || cache.cacheExpired) {
      try {
        const raw = await new Request(identity).loadString();
        const root = raw.match(/<((?:[\w.-]+:)?(?:rss|feed|RDF))\b/i);
        if (!root || !new RegExp('</' + root[1] + '\\s*>', 'i').test(raw)) throw Error('Not a complete feed');
        const isAtom = /<(?:[\w.-]+:)?feed\b/i.test(raw);
        const tag = isAtom ? 'entry' : 'item';
        const entries = getTags(raw, tag);
        const starts = raw.match(new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b', 'gi')) || [];
        if (starts.length !== entries.length) throw Error('Incomplete feed entry');
        const fresh = [];
        for (const entry of entries) {
          const titleAttributes = entry.match(/<(?:[\w.-]+:)?title\b([^>]*)>/i)?.[1] || '';
          const htmlTitle = /\btype\s*=\s*(["'])(?:html|xhtml)\1/i.test(titleAttributes);
          const title = scrubString(getTags(entry, 'title')[0] || getTags(entry, 'description')[0] || '', htmlTitle);
          if (!title) continue;
          let link = getTags(entry, 'link')[0] || '';
          if (isAtom) {
            const links = [...entry.matchAll(/<(?:[\w.-]+:)?link\b([^>]*?)\/?\s*>/gi)];
            for (const candidate of links) {
              const attributes = {};
              for (const [, key, , value] of candidate[1].matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) attributes[key.toLowerCase()] = value;
              if (attributes.href && (!attributes.rel || attributes.rel === 'alternate')) { link = attributes.href; break; }
            }
          }
          const rawDate = getTags(entry, isAtom ? 'published' : 'pubDate')[0] || getTags(entry, 'updated')[0] || getTags(entry, 'date')[0];
          const date = rawDate ? new Date(rawDate) : null;
          fresh.push({ title, link: scrubString(link), date: date && Number.isFinite(date.getTime()) ? date.toISOString() : null });
        }
        listings = fresh;
        // Cache all items so changing the display limit does not require a fetch.
        this.fm.writeString(path, JSON.stringify({ identity, listings }));
      } catch { /* Keep recent headlines when the feed is offline or malformed. */ }
    }
    const count = parseInt(this.settings.news.numberOfItems);
    this.data.news = (listings || []).slice(0, Number.isFinite(count) ? Math.max(0, count) : 5);

    function getTags(value, tag) {
      const expression = new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + tag + '\\s*>', 'gi');
      return [...value.matchAll(expression)].map(match => match[1]);
    }

    function scrubString(value, html = false) {
      const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      const decoded = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<\/?[a-z][^>]*>/gi, '')
        .replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi, (match, numeric, named) => {
          if (named) return entities[named.toLowerCase()];
          const code = numeric[0].toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
          return code <= 0x10ffff ? String.fromCodePoint(code) : match;
        });
      // Entity-escaped brackets are literal in text titles, but markup in Atom HTML titles.
      return (html ? decoded.replace(/<\/?[a-z][^>]*>/gi, '') : decoded).trim();
    }
  }
};
