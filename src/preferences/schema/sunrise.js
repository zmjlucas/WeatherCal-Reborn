// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
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
