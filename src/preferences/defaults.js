// Preference descriptors are rebuilt per call so editors never mutate shared defaults.
const categories = [
  require('./schema/widget'),
  require('./schema/localization'),
  require('./schema/font'),
  require('./schema/date'),
  require('./schema/events'),
  require('./schema/reminders'),
  require('./schema/sunrise'),
  require('./schema/weather'),
  require('./schema/covid'),
  require('./schema/symbol'),
  require('./schema/news'),
];

module.exports = {
  ...require("../core/locales"),
  enum: {
  "caps": {
    "upper": "ALL CAPS",
    "lower": "all lowercase",
    "title": "Title Case",
    "none": "None (Default)"
  },
  "icons": {
    "never": "Never",
    "always": "Always",
    "dark": "In dark mode",
    "light": "In light mode"
  }
},
  async defaultSettings(forEditing = true) {
    async function getFromCalendar(forReminders) {
      if (!forEditing) return [];
      try { return await (forReminders ? Calendar.forReminders() : Calendar.forEvents()); }
      catch { return []; }
    }
    const settings = {};
    for (const category of categories) Object.assign(settings, await category.call(this, getFromCalendar));
    return settings;
  }
};
