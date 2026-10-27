import type { CustomItems, LayoutInput } from './types/context';

/*! WeatherCal: user begin */
// Edit this layout and custom object in your installed one.js.
// Set the target family's viewport in Overall settings before first use.
export const layout: LayoutInput = `
  auto(padding: 12, gap: 8)[date, current, future]
`;

export const custom: CustomItems = {
  // Register measured modules under items: { name: { prepare(...) { ... } } }.
  // See docs/LAYOUT.md for the ItemModule contract.
};
/*! WeatherCal: user end */
