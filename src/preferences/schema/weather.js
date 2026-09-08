// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      weather: {
        name: "Weather",
        locale: {
          val: "",
          name: "OpenWeather locale",
          description: "If you are encountering issues with your weather data, try choosing an OpenWeather locale code.",
          type: "enum",
          options: this.getOpenWeatherLocaleCodes(),
        },
        showLocation: {
          val: false,
          name: "Show location name",
          type: "bool",
        },
        horizontalCondition: {
          val: false,
          name: "Display the condition and temperature horizontally",
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
        horizontalHours: {
          val: false,
          name: "Display the hourly forecast horizontally",
          type: "bool",
        },
        showHours: {
          val: "3",
          name: "Number of hours shown in the hourly forecast item",
        },
        showHoursFormat: {
          val: "ha",
          name: "Date format for the hourly forecast item",
        },
        horizontalForecast: {
          val: false,
          name: "Display the daily forecast horizontally",
          type: "bool",
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
