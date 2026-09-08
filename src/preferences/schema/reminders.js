// Licensed under MIT. See LICENSE.

module.exports = async function(getFromCalendar) {
  return {
      reminders: {
        name: "Reminders",
        numberOfReminders: {
          val: "3",
          name: "Maximum number of reminders shown",
        },
        useRelativeDueDate: {
          val: false,
          name: "Use relative dates",
          description: "Set to true for a relative due date (in 3 hours) instead of absolute (3:00 PM).",
          type: "bool",
        },
        showWithoutDueDate: {
          val: false,
          name: "Show reminders without a due date",
          type: "bool",
        },
        showOverdue: {
          val: false,
          name: "Show overdue reminders",
          type: "bool",
        },
    overdueColor: {
      val: "ff3b30",
      name: "Overdue Color",
      description: "The hex code color value for overdue reminders. Leave blank for the default red.",
    },
        todayOnly: {
          val: false,
          name: "Hide reminders due after today",
          type: "bool",
        },
        selectLists: {
          val: [],
          name: "Lists to show",
          type: "multiselect",
          options: await getFromCalendar(true),
        },
        showListColor: {
          val: "rectangle left",
          name: "Display list color",
          description: "Choose the shape and location of the list color.",
          type: "enum",
          options: ["rectangle left","rectangle right","circle left","circle right","none"],
        },
        noRemindersBehavior: {
          val: "none",
          name: "Show when no reminders remain",
          description: "When no reminders remain, show a hard-coded message, a time-based greeting, or nothing.",
          type: "enum",
          options: ["message","greeting","none"],
        },
        url: {
          val: "",
          name: "URL to open when tapped",
          description: "Optionally provide a URL to open when this item is tapped. Leave blank to open the built-in Reminders app.",
        },
      },
  };
};
