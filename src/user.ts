import type { CustomItems, LayoutInput } from './types/context';

/*! WeatherCal: user begin v1 */
// Edit this layout and custom object in your installed one.js.
export const layout: LayoutInput = `
  row
    column
      date
      sunset
      battery
      space
      events

    column(90)
      current
      future
      space
`;

export const custom: CustomItems = {
  // Add custom items and backgrounds here. The engine is available as code.
};
/*! WeatherCal: user end v1 */
