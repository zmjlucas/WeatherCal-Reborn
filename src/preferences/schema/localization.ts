// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, LocalizationSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ localization: EditingCategory<LocalizationSettings> }> {
  return {
      localization: {
        name: "Localization and text customization",
        morningGreeting: {
          val: "Good morning.",
          name: "Morning greeting",
        },
        afternoonGreeting: {
          val: "Good afternoon.",
          name: "Afternoon greeting",
        },
        eveningGreeting: {
          val: "Good evening.",
          name: "Evening greeting",
        },
        nightGreeting: {
          val: "Good night.",
          name: "Night greeting",
        },
        nextHourLabel: {
          val: "Next hour",
          name: "Label for next hour of weather",
        },
        tomorrowLabel: {
          val: "Tomorrow",
          name: "Label for tomorrow",
        },
        noEventMessage: {
          val: "Enjoy the rest of your day.",
          name: "No event message",
          description: "The message shown when there are no more events for the day, if that setting is active.",
        },
        noRemindersMessage: {
          val: "Tasks complete.",
          name: "No reminders message",
          description: "The message shown when there are no more reminders for the day, if that setting is active.",
        },
        durationMinute: {
          val: "m",
          name: "Duration label for minutes",
        },
        durationHour: {
          val: "h",
          name: "Duration label for hours",
        },
        covid: {
          val: "{cases} cases, {deaths} deaths, {recovered} recoveries",
          name: "COVID data text",
          description: "Each {token} is replaced with the number from the data. The available tokens are: cases, todayCases, deaths, todayDeaths, recovered, active, critical, casesPerOneMillion, deathsPerOneMillion, totalTests, testsPerOneMillion"
        },
        week: {
          val: "Week",
          name: "Label for the week number",
        },
      },
  };
};
