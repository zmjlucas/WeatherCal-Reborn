// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
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
