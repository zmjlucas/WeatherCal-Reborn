// Licensed under MIT. See LICENSE.
// Calendar items consume normalized events and reminders from the data modules.

module.exports = {
  async date(column) {
    const dateSettings = this.settings.date
    if (!this.data.events && dateSettings.dynamicDateSize) { await this.setupEvents() }

    const secondsForToday = Math.floor(this.now.getTime() / 1000) - 978307200
    const defaultUrl = "calshow:" + secondsForToday
    const settingUrl = dateSettings.url || ""
    const url = settingUrl.trim() == "none" ? undefined : settingUrl || defaultUrl

    if (dateSettings.dynamicDateSize ? this.data.events.length : dateSettings.staticDateSize == "small") {
      this.provideText(this.formatDate(this.now,dateSettings.smallDateFormat), column, this.format.smallDate, true, url)

    } else {
      const dateOneStack = this.align(column)
      this.provideText(this.formatDate(this.now,dateSettings.largeDateLineOne), dateOneStack, this.format.largeDate1, false, url)
      dateOneStack.setPadding(this.padding/2, this.padding, 0, this.padding)

      const dateTwoStack = this.align(column)
      this.provideText(this.formatDate(this.now,dateSettings.largeDateLineTwo), dateTwoStack, this.format.largeDate2, false, url)
      dateTwoStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  },

  async events(column) {
    if (!this.data.events) { await this.setupEvents() }
    const eventSettings = this.settings.events

    const settingUrlExists = (eventSettings.url || "").length > 0
    if (this.data.events.length == 0) {
      const secondsForToday = Math.floor(new Date().getTime() / 1000) - 978307200
      if (eventSettings.noEventBehavior == "message" && this.localization.noEventMessage.length) { return this.provideText(this.localization.noEventMessage, column, this.format.noEvents, true, settingUrlExists ? eventSettings.url : "calshow:" + secondsForToday) }
      if (this[eventSettings.noEventBehavior]) { return await this[eventSettings.noEventBehavior](column) }
    }

    let currentStack
    let currentDiff = 0
    const numberOfEvents = this.data.events.length
    const showCalendarColor = eventSettings.showCalendarColor
    const colorShape = showCalendarColor.includes("circle") ? "circle" : "rectangle"

    // Creates an event stack on the widget for a specific date diff.
    function makeEventStack(diff, currentDate) {
      const eventStack = column.addStack()
      eventStack.layoutVertically()
      eventStack.setPadding(0, 0, 0, 0)
      const secondsForDay = Math.floor(currentDate.getTime() / 1000) - 978307200 + (diff * 86400)
      eventStack.url = settingUrlExists ? eventSettings.url : "calshow:" + secondsForDay
      currentStack = eventStack
    }

    makeEventStack(currentDiff,this.now)

    for (let i = 0; i < numberOfEvents; i++) {
      const event = this.data.events[i]
      const diff = this.dateDiff(this.now, event.startDate)

      if (diff != currentDiff) {
        currentDiff = diff
        makeEventStack(currentDiff,this.now)

        const tomorrowText = this.localization.tomorrowLabel
        const eventLabelText = (diff == 1 && tomorrowText.length) ? tomorrowText : this.formatDate(event.startDate,eventSettings.labelFormat)
        this.provideText(eventLabelText.toUpperCase(), currentStack, this.format.eventLabel, true)
      }

      // Setting up the title row.
      const titleStack = this.align(currentStack)
      titleStack.layoutHorizontally()

      if (showCalendarColor.length && showCalendarColor != "none" && !showCalendarColor.includes("right")) {
        const colorItemText = this.provideTextSymbol(colorShape) + " "
        const colorItem = this.provideText(colorItemText, titleStack, this.format.eventTitle)
        colorItem.textColor = event.calendar.color
      }

      const showLocation = eventSettings.showLocation && event.location
      const showTime = !event.isAllDay

      const title = this.provideText(event.title.trim(), titleStack, this.format.eventTitle)
      const titlePadding = (showLocation || showTime) ? this.padding/5 : this.padding
      titleStack.setPadding(this.padding, this.padding, titlePadding, this.padding)
      if (this.data.events.length >= 3) { title.lineLimit = 1 } // TODO: Make setting for this

      if (showCalendarColor.length && showCalendarColor != "none" && showCalendarColor.includes("right")) {
        const colorItemText = " " + this.provideTextSymbol(colorShape)
        const colorItem = this.provideText(colorItemText, titleStack, this.format.eventTitle)
        colorItem.textColor = event.calendar.color
      }

      // Setting up the location row.
      if (showLocation) {
        const locationStack = this.align(currentStack)
        const location = this.provideText(event.location, locationStack, this.format.eventLocation)
        location.lineLimit = 1
        locationStack.setPadding(0, this.padding, showTime ? this.padding/5 : this.padding, this.padding)
      }

      if (event.isAllDay) { continue }

      // Setting up the time row.
      let timeText = this.formatTime(event.startDate)
      if (eventSettings.showEventLength == "time") {
        timeText += "–" + this.formatTime(event.endDate)

      } else if (eventSettings.showEventLength == "duration") {
        const duration = (event.endDate.getTime() - event.startDate.getTime()) / (1000*60)
        const hours = Math.floor(duration/60)
        const minutes = Math.floor(duration % 60)
        const hourText = hours>0 ? hours + this.localization.durationHour : ""
        const minuteText = minutes>0 ? minutes + this.localization.durationMinute : ""
        timeText += " \u2022 " + hourText + (hourText.length && minuteText.length ? " " : "") + minuteText
      }

      const timeStack = this.align(currentStack)
      const time = this.provideText(timeText, timeStack, this.format.eventTime)
      timeStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  },

  async reminders(column) {
    if (!this.data.reminders) { await this.setupReminders() }
    const reminderSettings = this.settings.reminders

    if (this.data.reminders.length == 0) {
      if (reminderSettings.noRemindersBehavior == "message" && this.localization.noRemindersMessage.length) { return this.provideText(this.localization.noRemindersMessage, column, this.format.noReminders, true) }
      if (this[reminderSettings.noRemindersBehavior]) { return await this[reminderSettings.noRemindersBehavior](column) }
    }

    const reminderStack = column.addStack()
    reminderStack.layoutVertically()
    reminderStack.setPadding(0, 0, 0, 0)
    const settingUrl = reminderSettings.url || ""
    reminderStack.url = (settingUrl.length > 0) ? settingUrl : "x-apple-reminderkit://REMCDReminder/"

    const numberOfReminders = this.data.reminders.length
    const showListColor = reminderSettings.showListColor
    const colorShape = showListColor.includes("circle") ? "circle" : "rectangle"

    for (let i = 0; i < numberOfReminders; i++) {
      const reminder = this.data.reminders[i]

      const titleStack = this.align(reminderStack)
      titleStack.layoutHorizontally()

      // TODO: Functionize for events and reminders
      if (showListColor.length && showListColor != "none" && !showListColor.includes("right")) {
        let colorItemText = this.provideTextSymbol(colorShape) + " "
        let colorItem = this.provideText(colorItemText, titleStack, this.format.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }

      const title = this.provideText(reminder.title.trim(), titleStack, this.format.reminderTitle)
      titleStack.setPadding(this.padding, this.padding, this.padding/5, this.padding)

      if (showListColor.length && showListColor != "none" && showListColor.includes("right")) {
        let colorItemText = " " + this.provideTextSymbol(colorShape)
        let colorItem = this.provideText(colorItemText, titleStack, this.format.reminderTitle)
        colorItem.textColor = reminder.calendar.color
      }

      if (reminder.isOverdue) { title.textColor = new Color(reminderSettings.overdueColor || "ff3b30") }
      if (reminder.isOverdue || !reminder.dueDate) { continue }

      let timeText
      if (reminderSettings.useRelativeDueDate) {
        const rdf = new RelativeDateTimeFormatter()
        rdf.locale = this.locale
        rdf.useNamedDateTimeStyle()
        timeText = rdf.string(reminder.dueDate, this.now)

      } else {
        const df = new DateFormatter()
        df.locale = this.locale

        if (this.dateDiff(reminder.dueDate, this.now) == 0 && reminder.dueDateIncludesTime) { df.useNoDateStyle() }
        else { df.useShortDateStyle() }

        if (reminder.dueDateIncludesTime) { df.useShortTimeStyle() }
        else { df.useNoTimeStyle() }

        timeText = df.string(reminder.dueDate)
      }

      const timeStack = this.align(reminderStack)
      this.provideText(timeText, timeStack, this.format.reminderTime)
      timeStack.setPadding(0, this.padding, this.padding, this.padding)
    }
  }
};
