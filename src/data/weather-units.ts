import preferences from 'cldr-core/supplemental/unitPreferenceData.json';

const weatherUnits: Record<string, { unit: string }[]> = preferences.supplemental.unitPreferenceData.temperature.weather;

/** Resolve auto on each load so a device-region change also changes the cache key.
 * Use CLDR's weather preferences, not the region's general measurement system.
 * Language-only or invalid locales use the CLDR world default (Celsius).
 */
export function resolveWeatherUnits(preference: string): string {
  if (preference === 'imperial' || preference === 'metric' || preference === 'standard') return preference;
  let region = '001';
  try {
    const locale = Device.locale().trim().split('@')[0]!.replace(/_/g, '-');
    region = new Intl.Locale(locale).region || region;
  } catch { /* Unavailable or invalid locale uses the world default. */ }
  const unit = (weatherUnits[region] || weatherUnits['001'])?.[0]?.unit;
  return unit === 'fahrenheit' ? 'imperial' : 'metric';
}
