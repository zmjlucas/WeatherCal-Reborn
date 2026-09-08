// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, SymbolSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ symbol: EditingCategory<SymbolSettings> }> {
  return {
      symbol: {
        name: "Symbols",
        size: {
          val: "18",
          name: "Size",
          description: "Size of each symbol. Leave blank to fill the width of the column.",
        },
        padding: {
          val: { top: "", left: "", bottom: "", right: "" },
          name: "Padding",
          type: "multival",
          description: "The padding around each symbol. Leave blank to use the default padding.",
        },
        tintColor: {
          val: "ffffff",
          name: "Tint color",
          description: "The hex code color value to tint the symbols. Leave blank for the default tint.",
        },
      },
  };
};
