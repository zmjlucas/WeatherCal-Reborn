import { runInNewContext } from 'node:vm';
import MiniSearch from 'minisearch';
import { describe, expect, it } from 'vitest';
import { tokenize } from '../website/.vitepress/search-tokenizer.mjs';
import { localSearch } from '../website/.vitepress/search';

const documents = [
  { id: 'order', title: '顺序', titles: '', text: '此模式按保序方式放置项目。' },
  { id: 'automatic', title: '模式', titles: '', text: '使用自动布局可以保留所选内容。' },
  { id: 'growth', title: 'Properties', titles: '', text: 'Use the grow property to share the remaining space.' },
  { id: 'viewport-error', title: 'Error', titles: '', text: 'Fix the VIEWPORT_UNKNOWN error before you run the layout.' },
  { id: 'separate-words', title: 'Other', titles: '', text: 'The viewport is unknown.' },
];

const searches = [
  ['保序', 'order'],
  ['自动布局', 'automatic'],
  ['grow', 'growth'],
  ['VIEWPORT_UNKNOWN', 'viewport-error'],
] as const;

describe('documentation local search', () => {
  for (const segmenterAvailable of [true, false]) {
    const label = segmenterAvailable ? 'with word segmentation' : 'without Intl.Segmenter';

    it.each(searches)(`finds %s inside a sentence ${label}`, (query, expectedId) => {
      const options = {
        fields: ['title', 'titles', 'text'],
        storeFields: ['title', 'titles'],
        ...localSearch.options.miniSearch.options,
      };
      const buildIndex = new MiniSearch(options);
      buildIndex.addAll(documents);

      // VitePress serializes this function into its browser search bundle.
      const browserTokenize = runInNewContext(`(${tokenize.toString()})`, {
        Intl: segmenterAvailable ? Intl : { Segmenter: undefined },
      }) as (text: string) => string[];
      const browserIndex = MiniSearch.loadJSON(JSON.stringify(buildIndex), {
        ...options,
        tokenize: browserTokenize,
      });

      expect(browserIndex.search(query, localSearch.options.miniSearch.searchOptions)
        .map((result) => result.id)).toEqual([expectedId]);
    });
  }
});
