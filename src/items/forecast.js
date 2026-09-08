// Licensed under MIT. See LICENSE.
// Daily and hourly forecasts share layout rules while bounding reads to available data.

module.exports = {
  async forecast(column, hourly = false) {
    if (!this.data.weather) { await this.setupWeather() }
    if (!this.data.sun) { await this.setupSunrise() }
    const [locationData, weatherData, sunData, weatherSettings] = [this.data.location, this.data.weather, this.data.sun, this.settings.weather]

    // Set up the container stack and overall spacing.
    const weatherStack = this.align(column)
    const defaultUrl = "weather://"
    const settingUrl = hourly ? (weatherSettings.urlFuture || "") : (weatherSettings.urlForecast || "")
    if (settingUrl.trim() != "none") { weatherStack.url = settingUrl || defaultUrl }

    const horizontal = hourly ? weatherSettings.horizontalHours : weatherSettings.horizontalForecast
    const spacing = (weatherSettings.spacing ? parseInt(weatherSettings.spacing) : 0) + (horizontal ? 0 : 5)
    const outsidePadding = this.padding > spacing ? this.padding - spacing : 0

    if (horizontal) {
      weatherStack.layoutHorizontally()
      weatherStack.setPadding(this.padding, outsidePadding, this.padding, outsidePadding)
    } else {
      weatherStack.layoutVertically()
      weatherStack.setPadding(outsidePadding, this.padding, outsidePadding, this.padding)
    }

    const startIndex = hourly ? 0 : (weatherSettings.showToday ? 1 : 2)
    const count = hourly ? parseInt(weatherSettings.showHours) : parseInt(weatherSettings.showDays)
    // Daily indices are one-based; hourly indices are zero-based.
    const dataEnd = hourly ? weatherData.hourly.length : weatherData.forecast.length + 1
    const endIndex = Math.min(startIndex + Math.max(0, count || 0), dataEnd)

    const myDate = new Date(this.now.getTime())
    if (!hourly && startIndex == 1) { myDate.setDate(myDate.getDate() - 1) }
    const dateFormat = hourly ? weatherSettings.showHoursFormat : weatherSettings.showDaysFormat

    // Loop through each individual unit.
    const edgePadding = this.padding > spacing ? spacing : this.padding
    const smallFontSize = (this.format.smallTemp && this.format.smallTemp.size) ? this.format.smallTemp.size : this.format.defaultText.size
    const stackSize = hourly ? new Size(smallFontSize*3,0) : new Size(smallFontSize*2.64,0)

    for (let i=startIndex; i < endIndex; i++) {
      if (!hourly) { myDate.setDate(myDate.getDate() + 1) }

      const unitStack = weatherStack.addStack()
      const dateStack = unitStack.addStack()
      const initialSpace = (i == startIndex) ? edgePadding : spacing
      const finalSpace = (i == endIndex-1) ? edgePadding : spacing

      if (horizontal) {
        unitStack.setPadding(0, initialSpace, 0, finalSpace)
        unitStack.layoutVertically()

        dateStack.addSpacer()
        this.provideText(this.formatDate(myDate,dateFormat), dateStack, this.format.smallTemp)
        dateStack.addSpacer()

      } else {
        unitStack.setPadding(initialSpace, 0, finalSpace, 0)
        unitStack.layoutHorizontally()

        dateStack.layoutHorizontally()
        dateStack.setPadding(0, 0, 0, 0)
        dateStack.size = stackSize

        const dateText = this.provideText(this.formatDate(myDate,dateFormat), dateStack, this.format.smallTemp)
        dateText.lineLimit = 1
        dateText.minimumScaleFactor = 0.5
        dateStack.addSpacer()
      }

      unitStack.centerAlignContent()
      unitStack.addSpacer(5)

      const conditionStack = unitStack.addStack()
      conditionStack.centerAlignContent()
      conditionStack.layoutHorizontally()
      if (horizontal) { conditionStack.addSpacer() }

      // Set up the container for the condition.
      if (hourly) {
        const subCondition = conditionStack.addImage(this.provideConditionSymbol(weatherData.hourly[i].Condition, this.isNight(myDate)))
        subCondition.imageSize = new Size(18,18)
        this.tintIcon(subCondition, this.format.smallTemp)

        if (horizontal) { conditionStack.addSpacer() }
        unitStack.addSpacer(5)

        const tempStack = unitStack.addStack()
        tempStack.centerAlignContent()
        tempStack.layoutHorizontally()

        if (horizontal) { tempStack.addSpacer() }
        const temp = this.provideText(this.displayNumber(weatherData.hourly[i].Temp,"--") + "°", tempStack, this.format.smallTemp)
        temp.lineLimit = 1
        temp.minimumScaleFactor = 0.75
        if (horizontal) {
          temp.size = stackSize
          tempStack.addSpacer()
        }

      } else {
        const tinyFontSize = (this.format.tinyTemp && this.format.tinyTemp.size) ? this.format.tinyTemp.size : this.format.defaultText.size
        conditionStack.size = new Size(0,tinyFontSize*2.64)

        const conditionIcon = conditionStack.addImage(this.provideConditionSymbol(weatherData.forecast[i - 1].Condition, false))
        conditionIcon.imageSize = new Size(18,18)
        this.tintIcon(conditionIcon, this.format.smallTemp)
        conditionStack.addSpacer(5)

        const tempLine = conditionStack.addImage(this.drawVerticalLine(this.provideColor(this.format.tinyTemp, 0.5), 20))
        if (this.settings.widget.instantDark) this.tintIcon(tempLine, this.format.tinyTemp, true)
        tempLine.imageSize = new Size(3,28)
        conditionStack.addSpacer(5)

        let tempStack = conditionStack.addStack()
        tempStack.layoutVertically()
        tempStack.size = hourly ? new Size(smallFontSize*1,0) : new Size(smallFontSize*1,0)

        const tempHigh = this.provideText(this.displayNumber(weatherData.forecast[i - 1].High,"-"), tempStack, this.format.tinyTemp)
        tempHigh.lineLimit = 1
        tempHigh.minimumScaleFactor = 0.6
        tempStack.addSpacer(4)
        const tempLow = this.provideText(this.displayNumber(weatherData.forecast[i - 1].Low,"-"), tempStack, this.format.tinyTemp)
        tempLow.lineLimit = 1
        tempLow.minimumScaleFactor = 0.6

        if (horizontal) { conditionStack.addSpacer() }
      }
      if (hourly) { myDate.setHours(myDate.getHours() + 1) }
    }
  },

  async daily(column) { await this.forecast(column) },

  async hourly(column) { await this.forecast(column, true) }
};
