// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      widget: {
        name: "Overall settings",
        locale: {
          val: "",
          name: "Locale code",
          description: "Leave blank to match the device's locale.",
        },
        units: {
          val: "imperial",
          name: "Units",
          description: "Use imperial for Fahrenheit or metric for Celsius.",
          type: "enum",
          options: ["imperial","metric"],
        },
        preview: {
          val: "large",
          name: "Widget preview size",
          description: "Set the size of the widget preview displayed in the app.",
          type: "enum",
          options: ["small","medium","large"],
        },
        padding: {
          val: "5",
          name: "Item padding",
          description: "The padding around each item. This also determines the approximate widget padding. Default is 5.",
        },
        widgetPadding: {
          val: { top: "", left: "", bottom: "", right: "" },
          name: "Custom widget padding",
          type: "multival",
          description: "The padding around the entire widget. By default, these values are blank and Weather Cal uses the item padding to determine these values. Transparent widgets often look best with these values at 0.",
        },
        tintIcons: {
          val: this.enum.icons.never,
          name: "Icons match text color",
          description: "Decide when icons should match the color of the text around them.",
          type: "enum",
          options: [this.enum.icons.never,this.enum.icons.always,this.enum.icons.dark,this.enum.icons.light,],
        },
        updateLocation: {
          val: "60",
          name: "Location update frequency",
          description: "How often, in minutes, to update the current location. Set to 0 to constantly update, or -1 to never update.",
        },
        instantDark: {
          val: false,
          name: "Instant dark mode (experimental)",
          type: "bool",
          description: "Instantly switch to dark mode. \u26A0\uFE0F This DOES NOT support dark mode image backgrounds or custom icon tint settings. \u26A0\uFE0F",
        },
      },
  };
};
