import { createWeatherCal } from '#source/create';
import type { Environment } from './scriptable';

export async function initializedContext(env?: Environment, name = 'Test Widget') {
  const context = createWeatherCal();
  context.initialize(name, false);
  if (env) context.fm = env.local;
  context.settings = await context.getSettings();
  context.format = context.settings.font;
  context.localization = context.settings.localization;
  return context;
}
