export function scriptFixture(user = 'const layout = `column[]`;\nconst custom = {};', engine = 'await Promise.resolve();', prefix = '// Variables used by Scriptable.\n// icon-color: blue; icon-glyph: cloud;\n'): string {
  return `${prefix}// WeatherCal: user begin\n${user}\n// WeatherCal: user end\n\n// !! DO NOT MODIFY CODE BELOW !!\n// WeatherCal: engine begin\n${engine}\n// WeatherCal: engine end\n`;
}
