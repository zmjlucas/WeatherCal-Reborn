// Licensed under MIT. See LICENSE.

import type { WeatherCalContext } from '../../types/context';
import type { EditingCategory, GetCalendars, FontSettings } from '../../types/settings';

export default async function(this: WeatherCalContext, getFromCalendar: GetCalendars): Promise<{ font: EditingCategory<FontSettings> }> {
  return {
      font: {
        name: "Text sizes, colors, and fonts",
        defaultText: {
          val: { size: "14", color: "ffffff", dark: "", font: "regular", caps: "" },
          name: "Default font settings",
          description: "These settings apply to all text on the widget that doesn't have a customized value.",
          type: "fonts",
        },
        smallDate:   {
          val: { size: "17", color: "", dark: "", font: "semibold", caps: "" },
          name: "Small date",
          type: "fonts",
        },
        largeDate1:  {
          val: { size: "30", color: "", dark: "", font: "light", caps: "" },
          name: "Large date, line 1",
          type: "fonts",
        },
        largeDate2:  {
          val: { size: "30", color: "", dark: "", font: "light", caps: "" },
          name: "Large date, line 2",
          type: "fonts",
        },
        greeting:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "Greeting",
          type: "fonts",
        },
        eventLabel:  {
          val: { size: "14", color: "", dark: "", font: "semibold", caps: "" },
          name: "Event heading (used for the TOMORROW label)",
          type: "fonts",
        },
        eventTitle:  {
          val: { size: "14", color: "", dark: "", font: "semibold", caps: "" },
          name: "Event title",
          type: "fonts",
        },
        eventLocation:   {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Event location",
          type: "fonts",
        },
        eventTime:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "Event time",
          type: "fonts",
        },
        noEvents:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "No events message",
          type: "fonts",
        },
        reminderTitle:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Reminder title",
          type: "fonts",
        },
        reminderTime:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "Reminder time",
          type: "fonts",
        },
        noReminders:    {
          val: { size: "30", color: "", dark: "", font: "semibold", caps: "" },
          name: "No reminders message",
          type: "fonts",
        },
        newsTitle:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "News item title",
          type: "fonts",
        },
        newsDate:   {
          val: { size: "14", color: "ffffffcc", dark: "", font: "", caps: "" },
          name: "News item date",
          type: "fonts",
        },
        largeTemp:   {
          val: { size: "34", color: "", dark: "", font: "light", caps: "" },
          name: "Large temperature label",
          type: "fonts",
        },
        smallTemp:   {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "Most text used in weather items",
          type: "fonts",
        },
        tinyTemp:    {
          val: { size: "12", color: "", dark: "", font: "", caps: "" },
          name: "Small text used in weather items",
          type: "fonts",
        },
        customText:  {
          val: { size: "14", color: "", dark: "", font: "", caps: "" },
          name: "User-defined text items",
          type: "fonts",
        },
        battery:     {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "Battery percentage",
          type: "fonts",
        },
        sunrise:     {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "Sunrise and sunset",
          type: "fonts",
        },
        covid:       {
          val: { size: "14", color: "", dark: "", font: "medium", caps: "" },
          name: "COVID data",
          type: "fonts",
        },
        week:        {
          val: { size: "14", color: "", dark: "", font: "light", caps: "" },
          name: "Week label",
          type: "fonts",
        },
      },
  };
};
