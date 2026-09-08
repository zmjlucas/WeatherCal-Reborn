// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      events: {
        name: "Events",
        numberOfEvents: {
          val: "3",
          name: "Maximum number of events shown",
        },
        minutesAfter: {
          val: "5",
          name: "Minutes after event begins",
          description: "Number of minutes after an event begins that it should still be shown. Leave blank for an event to show for its duration.",
        },
        showAllDay: {
          val: false,
          name: "Show all-day events",
          type: "bool",
        },
        numberOfDays: {
          val: "1",
          name: "How many future days of events to show",
          description: "How many days to show into the future. Set to 0 to show today's events only.",
        },
        labelFormat: {
          val: "EEEE, MMMM d",
          name: "Date format for future event days",
        },
        showTomorrow: {
          val: "20",
          name: "Future days shown at hour",
          description: "The hour (in 24-hour time) to start showing events for tomorrow or beyond. Use 0 for always, 24 for never.",
        },
        showEventLength: {
          val: "duration",
          name: "Event length display style",
          description: "Choose whether to show the duration, the end time, or no length information.",
          type: "enum",
          options: ["duration","time","none"],
        },
        showLocation: {
          val: false,
          name: "Show event location",
          type: "bool",
        },
        selectCalendars: {
          val: [],
          name: "Calendars to show",
          type: "multiselect",
          options: await getFromCalendar(),
        },
        showCalendarColor: {
          val: "rectangle left",
          name: "Display calendar color",
          description: "Choose the shape and location of the calendar color.",
          type: "enum",
          options: ["rectangle left","rectangle right","circle left","circle right","none"],
        },
        noEventBehavior: {
          val: "message",
          name: "Show when no events remain",
          description: "When no events remain, show a hard-coded message, a time-based greeting, or nothing.",
          type: "enum",
          options: ["message","greeting","none"],
        },
        url: {
          val: "",
          name: "URL to open when tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank to open the built-in Calendar app.",
        },
      },
  };
};
