import { createWeatherCal } from './create';
export { createWeatherCal } from './create';
/** Compatibility singleton for source consumers; releases inline their own instance. */
export default Object.assign(createWeatherCal(), { createWeatherCal });
