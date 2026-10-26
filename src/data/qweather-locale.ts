// https://dev.qweather.com/docs/resource/language/
export const qweatherLanguages = ['zh', 'zh-hans', 'zh-hant', 'en', 'de', 'es', 'fr', 'it', 'ja', 'ko', 'ru', 'hi', 'th', 'ar', 'pt', 'bn', 'ms', 'nl', 'el', 'la', 'sv', 'id', 'pl', 'tr', 'cs', 'et', 'vi', 'fil', 'fi', 'he', 'is', 'nb'];

export function qweatherLocale(input: string): string {
  const value = input.toLowerCase().replace(/_/g, '-');
  if (/^zh-(hant|tw|hk|mo)(-|$)/.test(value)) return 'zh-hant';
  if (/^zh(-|$)/.test(value)) return 'zh';
  const base = value.split('-')[0] || '';
  const legacy: Record<string, string> = { kr: 'ko', cz: 'cs', no: 'nb', sp: 'es', se: 'sv' };
  const code = legacy[base] || base;
  return qweatherLanguages.includes(code) ? code : 'en';
}
