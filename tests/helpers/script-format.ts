export function scriptFixture(user = 'const layout = `row\\ncolumn`;\nconst custom = {};', engine = 'await Promise.resolve();', prefix = '// Variables used by Scriptable.\n// icon-color: blue; icon-glyph: cloud;\n'): string {
  return `${prefix}// WeatherCal: user begin v1\n${user}\n// WeatherCal: user end v1\n// WeatherCal: engine begin v1\n${engine}\n// WeatherCal: engine end v1\n`;
}
