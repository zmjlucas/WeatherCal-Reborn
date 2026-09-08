// Licensed under MIT. See LICENSE.

module.exports = {
  async setupEvents() {
      const eventSettings = this.settings.events
      let calSetting = eventSettings.selectCalendars
      let calendars

      // Old, manually-entered comma lists.
      if (typeof calSetting == "string") {
        calSetting = calSetting.trim()
        calendars = calSetting.length > 0 ? calSetting.split(",").map(value => value.trim()).filter(Boolean) : []

      } else {
        calendars = calSetting || []
      }

      let numberOfDays = parseInt(eventSettings.numberOfDays)
      numberOfDays = isNaN(numberOfDays) ? 1 : Math.max(0, numberOfDays)

      // Complex due to support for old boolean values.
      let showFutureAt = parseInt(eventSettings.showTomorrow)
      showFutureAt = isNaN(showFutureAt) ? (eventSettings.showTomorrow ? 0 : 24) : showFutureAt

      const endDate = new Date(this.now)
      endDate.setDate(endDate.getDate() + numberOfDays + 1)
      endDate.setHours(0, 0, 0, 0)
      let events
      try { events = await CalendarEvent.between(this.now, endDate) }
      catch { this.data.events = []; return }

      this.data.events = events.filter((event, index, array) => {
        if (!(index == array.findIndex(t => t.identifier == event.identifier && t.startDate.getTime() == event.startDate.getTime()))) { return false }

        const diff = this.dateDiff(this.now, event.startDate)
        if (diff < 0 || diff > numberOfDays) { return false }
        if (diff > 0 && this.now.getHours() < showFutureAt) { return false }

        if (calendars.length && !(calendars.some(a => a.identifier == event.calendar.identifier) || calendars.includes(event.calendar.title))) { return false }
        if (event.title.startsWith("Canceled:")) { return false }
        if (event.isAllDay) { return eventSettings.showAllDay }

        // If they leave it blank, set minutes after to the duration of the event
        const minutesAfter = parseInt(eventSettings.minutesAfter) >= 0 ? parseInt(eventSettings.minutesAfter) * 60000 : event.endDate - event.startDate
        return (event.startDate.getTime() + minutesAfter > this.now.getTime())

      }).slice(0,parseInt(eventSettings.numberOfEvents))
    },

  async setupReminders() {
      const reminderSettings = this.settings.reminders
      let listSetting = reminderSettings.selectLists
      let lists

      // Old, manually-entered comma lists.
      if (typeof listSetting == "string") {
        listSetting = listSetting.trim()
        lists = listSetting.length > 0 ? listSetting.split(",").map(value => value.trim()).filter(Boolean) : []
      } else {
        lists = listSetting || []
      }

      let reminders
      try { reminders = await Reminder.allIncomplete() }
      catch { this.data.reminders = []; return }
      reminders.sort(function(a, b) {

        // Non-null due dates are prioritized.
        if (!a.dueDate && b.dueDate) return 1
        if (a.dueDate && !b.dueDate) return -1
        if (!a.dueDate && !b.dueDate) return 0

        // Otherwise, earlier due dates go first.
        const aTime = a.dueDate.getTime()
        const bTime = b.dueDate.getTime()

        if (aTime > bTime) return 1
        if (aTime < bTime) return -1
        return 0
      })

      this.data.reminders = reminders.filter((reminder) => {
        if (lists.length && !(lists.some(a => a.identifier == reminder.calendar.identifier) || lists.includes(reminder.calendar.title))) { return false }
        if (!reminder.dueDate)  { return reminderSettings.showWithoutDueDate }
        if (reminder.isOverdue) { return reminderSettings.showOverdue }
        if (reminderSettings.todayOnly) { return this.dateDiff(reminder.dueDate, this.now) == 0 }
        return true
      }).slice(0,parseInt(reminderSettings.numberOfReminders))
    }
};
