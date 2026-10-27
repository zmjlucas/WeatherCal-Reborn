/**
 * Keep this function self-contained: VitePress serializes it for browser queries.
 * Character pairs cover words that ICU splits differently, such as 保序.
 * They are also indexed during the build for browsers without Intl.Segmenter.
 * @param {string} text
 * @returns {string[]}
 */
export function tokenize(text) {
  const tokens = new Set(text.match(/[A-Za-z0-9_]+/g) ?? []);
  const segmenter = typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('zh', { granularity: 'word' })
    : undefined;

  for (const run of text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu) ?? []) {
    if (segmenter) {
      for (const part of segmenter.segment(run)) {
        if (part.isWordLike) tokens.add(part.segment);
      }
    }
    const characters = [...run];
    for (let index = 0; index < characters.length; index++) {
      tokens.add(characters[index]);
      if (index + 1 < characters.length) tokens.add(characters[index] + characters[index + 1]);
    }
  }
  return [...tokens];
}
