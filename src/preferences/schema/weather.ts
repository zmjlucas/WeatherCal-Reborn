import { qweatherLanguages } from '../../data/qweather-locale';
import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, WeatherSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ weather: EditingCategory<WeatherSettings> }> {
  return {
      weather: {
        name: "Weather",
        provider: {
          val: "qweather",
          name: "Weather provider",
          description: "Configure credentials in Other settings after choosing a provider.",
          type: "enum",
          options: ["qweather", "openweather"],
        },
        locale: {
          val: "",
          name: "Weather language",
          description: "Leave blank for device language. Legacy language codes are translated for QWeather.",
          type: "enum",
          options: [...new Set([...this.getOpenWeatherLocaleCodes(), ...qweatherLanguages])],
        },
        showLocation: {
          val: false,
          name: "Show location name",
          type: "bool",
        },
        showCondition: {
          val: false,
          name: "Show text value of the current condition",
          type: "bool",
        },
        showHighLow: {
          val: true,
          name: "Show today's high and low temperatures",
          type: "bool",
        },
        showRain: {
          val: false,
          name: "Show percent chance of rain",
          type: "bool",
        },
        tomorrowShownAtHour: {
          val: "20",
          name: "When to switch to tomorrow's weather",
          description: "Set the hour (in 24-hour time) to switch from the next hour to tomorrow's weather. Use 0 for always, 24 for never.",
        },
        spacing: {
          val: "0",
          name: "Spacing between daily or hourly forecast items",
        },
        showHours: {
          val: "3",
          name: "Number of hours shown in the hourly forecast item",
        },
        showHoursFormat: {
          val: "ha",
          name: "Date format for the hourly forecast item",
        },
        showDays: {
          val: "3",
          name: "Number of days shown in the daily forecast item",
        },
        showDaysFormat: {
          val: "E",
          name: "Date format for the daily forecast item",
        },
        showToday: {
          val: false,
          name: "Show today's weather in the daily forecast item",
          type: "bool",
        },
        urlCurrent: {
          val: "",
          name: "URL to open when current weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the weather app.",
        },
        urlFuture: {
          val: "",
          name: "URL to open when hourly weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the weather app.",
        },
        urlForecast: {
          val: "",
          name: "URL to open when daily weather is tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank for the weather app.",
        },
      },
  };
};
