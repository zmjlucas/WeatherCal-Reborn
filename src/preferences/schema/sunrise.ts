// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, SunriseSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ sunrise: EditingCategory<SunriseSettings> }> {
  return {
      sunrise: {
        name: "Sunrise and sunset",
        showWithin: {
          val: "",
          name: "Limit times displayed",
          description: "Set how many minutes before/after sunrise or sunset to show this element. Leave blank to always show.",
        },
        separateElements: {
          val: false,
          name: "Use separate sunrise and sunset elements",
          description: "By default, the sunrise element changes between sunrise and sunset times automatically. Set to true for individual, hard-coded sunrise and sunset elements.",
          type: "bool",
        },
      },
  };
};
