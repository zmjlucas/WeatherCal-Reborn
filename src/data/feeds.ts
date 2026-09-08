// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../types/context';
import { parseCovid, parseNews } from '../types/data';
import type { NewsListing } from '../types/data';
import { record } from '../types/json';

export default {
  async setupCovid(this: WeatherCalContext): Promise<void> {
    const country = (this.settings.covid.country || 'World').trim();
    // disease.sh retains the original Worldometer-style fields. Its source data
    // is historical; a successful request does not mean case counts are current.
    const endpoint = this.settings.covid.apiUrl ||
      'https://disease.sh/v3/covid-19/' + (/^(world|all)$/i.test(country) ? 'all' : 'countries/' + encodeURIComponent(country));
    const identity = JSON.stringify([endpoint, country]);
    const path = this.getDataCachePath('covid', identity);
    const cache = this.getCache(path, 15, 1440);
    let response = cache?.identity === identity ? parseCovid(cache.response) : null;
    if (!response || cache?.cacheExpired) {
      try {
        const raw: unknown = await new Request(endpoint).loadJSON();
        const fresh = parseCovid(raw);
        if (fresh) {
          response = fresh;
          this.fm.writeString(path, JSON.stringify({ identity, response: { ...record(raw), totalTests: fresh.totalTests } }));
        }
      } catch { /* Keep a recent successful response when the provider is unavailable. */ }
    }
    this.data.covid = response || {};
  },

  async setupNews(this: WeatherCalContext): Promise<void> {
    const identity = this.settings.news.url;
    const path = this.getDataCachePath('news', identity);
    const cache = this.getCache(path, 1, 1440);
    let listings = cache?.identity === identity ? parseNews(cache.listings) : null;
    if (!listings || cache?.cacheExpired) {
      try {
        const raw = await new Request(identity).loadString();
        const root = raw.match(/<((?:[\w.-]+:)?(?:rss|feed|RDF))\b/i);
        if (!root || !new RegExp('</' + root[1] + '\\s*>', 'i').test(raw)) throw Error('Not a complete feed');
        const isAtom = /<(?:[\w.-]+:)?feed\b/i.test(raw);
        const tag = isAtom ? 'entry' : 'item';
        const entries = getTags(raw, tag);
        const starts = raw.match(new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b', 'gi')) || [];
        if (starts.length !== entries.length) throw Error('Incomplete feed entry');
        const fresh: NewsListing[] = [];
        for (const entry of entries) {
          const titleAttributes = entry.match(/<(?:[\w.-]+:)?title\b([^>]*)>/i)?.[1] || '';
          const htmlTitle = /\btype\s*=\s*(["'])(?:html|xhtml)\1/i.test(titleAttributes);
          const title = scrubString(getTags(entry, 'title')[0] || getTags(entry, 'description')[0] || '', htmlTitle);
          if (!title) continue;
          let link = getTags(entry, 'link')[0] || '';
          if (isAtom) {
            const links = [...entry.matchAll(/<(?:[\w.-]+:)?link\b([^>]*?)\/?\s*>/gi)];
            for (const candidate of links) {
              const attributes: Record<string, string> = {};
              for (const [, key, , value] of (candidate[1] || '').matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)) {
                if (key !== undefined && value !== undefined) attributes[key.toLowerCase()] = value;
              }
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
    const count = parseInt(String(this.settings.news.numberOfItems));
    this.data.news = (listings || []).slice(0, Number.isFinite(count) ? Math.max(0, count) : 5);


    function getTags(value: string, tag: string): string[] {
      const expression = new RegExp('<(?:[\\w.-]+:)?' + tag + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + tag + '\\s*>', 'gi');
      return [...value.matchAll(expression)].map(match => match[1] || '');
    }

    function scrubString(value: string, html = false): string {
      const entities: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
      const decoded = value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
        .replace(/<\/?[a-z][^>]*>/gi, '')
        .replace(/&#(x[\da-f]+|\d+);|&(amp|lt|gt|quot|apos|nbsp);/gi, (match: string, numeric: string | undefined, named: string | undefined): string => {
          if (named) return entities[named.toLowerCase()] ?? match;
          if (!numeric) return match;
          const code = numeric.charAt(0).toLowerCase() === 'x' ? parseInt(numeric.slice(1), 16) : Number(numeric);
          return code <= 0x10ffff ? String.fromCodePoint(code) : match;
        });
      // Entity-escaped brackets are literal in text titles, but markup in Atom HTML titles.
      return (html ? decoded.replace(/<\/?[a-z][^>]*>/gi, '') : decoded).trim();
    }
  }
};
