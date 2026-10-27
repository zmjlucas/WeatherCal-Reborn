import type { CustomItems, LayoutInput } from './types/context';

/*! WeatherCal: user begin */
// Edit this layout and custom object in your installed one.js.
// Widget size is detected automatically. Overall settings offers manual overrides.
export const layout: LayoutInput = `
  auto(padding: 12, gap: 8)[date, current, future]
`;

export const custom: CustomItems = {};
/*! WeatherCal: user end */
