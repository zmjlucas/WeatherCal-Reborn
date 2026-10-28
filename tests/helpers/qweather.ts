export function qweatherPayload(url: string): unknown {
  const metadata = { attributions: ['QWeather test data'] };
  if (url.includes('/current/')) return { metadata, condition: { code: '100', text: '晴' }, temperature: { value: 20, unit: '°C' } };
  if (url.includes('/hourly/')) return { metadata, hours: [
    { forecastTime: '2026-10-26T12:00+08:00', temperature: { value: 21, unit: '°C' }, condition: { code: '101', text: '多云' }, precipitation: { probability: 0 } },
    { forecastTime: '2026-10-26T13:00+08:00', temperature: { value: 22, unit: '°C' }, condition: { code: '305', text: '小雨' }, precipitation: { probability: 0.35 } }
  ] };
  if (url.includes('/daily/')) return { metadata, days: [0, 1].map(day => ({
    forecastStartTime: `2026-10-${26 + day}T00:00+08:00`,
    forecastEndTime: `2026-10-${27 + day}T00:00+08:00`,
    temperatureMax: { value: 24, unit: '°C' }, temperatureMin: { value: 10, unit: '°C' },
    daytime: { condition: { code: '104', text: '阴' }, precipitation: { probability: 0.3 } },
    nighttime: { condition: { code: '305', text: '雨' }, precipitation: { probability: 0.6 } },
    astro: { sunrise: `2026-10-${26 + day}T06:00+08:00`, sunset: `2026-10-${26 + day}T18:00+08:00` }
  })) };
  throw new Error('Unexpected endpoint');
}
