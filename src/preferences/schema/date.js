// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      date: {
        name: "Date",
        dynamicDateSize: {
          val: true,
          name: "Dynamic date size",
          description: "If set to true, the date will become smaller when events are displayed.",
          type: "bool",
        },
        staticDateSize: {
          val: "small",
          name: "Static date size",
          description: "Set the date size shown when dynamic date size is not enabled.",
          type: "enum",
          options: ["small","large"],
        },
        smallDateFormat: {
          val: "EEEE, MMMM d",
          name: "Small date format",
        },
        largeDateLineOne: {
          val: "EEEE,",
          name: "Large date format, line 1",
        },
        largeDateLineTwo: {
          val: "MMMM d",
          name: "Large date format, line 2",
        },
        url: {
      val: "",
      name: "URL to open when tapped",
      description: "Optionally provide a URL to open when this item is tapped. Leave blank to open the built-in Calendar app.",
    },
      },
  };
};
