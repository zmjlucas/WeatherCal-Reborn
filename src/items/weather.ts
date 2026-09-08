import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.
// Current and upcoming weather preserve the public helper context used by custom items.

export default {
  async current(this: WeatherCalContext, column: WidgetStack): Promise<void> {
    if (!this.data.weather) await this.setupWeather()
    const weatherData = this.data.weather
    if (!weatherData) throw new Error("Weather setup did not provide weather data.")
    if (!this.data.sun) { await this.setupSunrise() }

    const locationData = this.data.location
    const weatherSettings = this.settings.weather

    // Setting up the current weather stack.
    const currentWeatherStack = column.addStack()
    currentWeatherStack.layoutVertically()
    currentWeatherStack.setPadding(0, 0, 0, 0)

    const defaultUrl = "weather://"
    const settingUrl = weatherSettings.urlCurrent || ""
    if (settingUrl.trim() != "none") { currentWeatherStack.url = (settingUrl.length > 0) ? settingUrl : defaultUrl }

    // Displaying the main conditions.
    if (weatherSettings.showLocation) { this.provideText(locationData?.locality, currentWeatherStack, this.format.smallTemp, true) }

    const mainConditionStack = this.align(currentWeatherStack)
    const mainCondition = mainConditionStack.addImage(this.provideConditionSymbol(weatherData.currentCondition,this.isNight(this.now)))
    mainCondition.imageSize = new Size(22,22) // TODO: Adjustable size
    this.tintIcon(mainCondition, this.format.largeTemp)
    mainConditionStack.setPadding(weatherSettings.showLocation ? 0 : this.padding, this.padding, 0, this.padding)

    const tempText = this.displayNumber(weatherData.currentTemp,"--") + "°"
    if (weatherSettings.horizontalCondition) {
      mainConditionStack.addSpacer(5)
      mainConditionStack.layoutHorizontally()
      mainConditionStack.centerAlignContent()
      this.provideText(tempText, mainConditionStack, this.format.largeTemp)
    }

    if (weatherSettings.showCondition) {
      const conditionTextStack = this.align(currentWeatherStack)
      this.provideText(weatherData.currentDescription, conditionTextStack, this.format.smallTemp)
      conditionTextStack.setPadding(this.padding, this.padding, 0, this.padding)
    }

    if (!weatherSettings.horizontalCondition) {
      const tempStack = this.align(currentWeatherStack)
      tempStack.setPadding(0, this.padding, 0, this.padding)
      this.provideText(tempText, tempStack, this.format.largeTemp)
    }

    if (!weatherSettings.showHighLow) { return }

    // Setting up the temp bar.
    const tempBarStack = this.align(currentWeatherStack)
    tempBarStack.layoutVertically()
    tempBarStack.setPadding(0, this.padding, this.padding, this.padding)
    tempBarStack.size = new Size(60,30)

    const tempBar = tempBarStack.addImage(this.provideTempBar())
    if (this.settings.widget.instantDark) this.tintIcon(tempBar, this.format.tinyTemp, true)

    tempBarStack.addSpacer(1)

    const highLowStack = tempBarStack.addStack()
    highLowStack.layoutHorizontally()
    this.provideText(this.displayNumber(weatherData.todayLow,"-"), highLowStack, this.format.tinyTemp)
    highLowStack.addSpacer()
    this.provideText(this.displayNumber(weatherData.todayHigh,"-"), highLowStack, this.format.tinyTemp)
  },

  async future(this: WeatherCalContext, column: WidgetStack): Promise<void> {
    if (!this.data.weather) await this.setupWeather()
    const weatherData = this.data.weather
    if (!weatherData) throw new Error("Weather setup did not provide weather data.")
    if (!this.data.sun) { await this.setupSunrise() }

    const locationData = this.data.location
    const weatherSettings = this.settings.weather

    const futureWeatherStack = column.addStack()
    futureWeatherStack.layoutVertically()
    futureWeatherStack.setPadding(0, 0, 0, 0)

    const showNextHour = (this.now.getHours() < parseInt(String(weatherSettings.tomorrowShownAtHour)))

    const defaultUrl = "weather://"
    const settingUrl = showNextHour ? (weatherSettings.urlFuture || "") : (weatherSettings.urlForecast || "")
    if (settingUrl != "none") { futureWeatherStack.url = (settingUrl.length > 0) ? settingUrl : defaultUrl }

    const subLabelStack = this.align(futureWeatherStack)
    const subLabelText = showNextHour ? this.localization.nextHourLabel : this.localization.tomorrowLabel
    const subLabel = this.provideText(subLabelText, subLabelStack, this.format.smallTemp)
    subLabelStack.setPadding(0, this.padding, this.padding/2, this.padding)

    const subConditionStack = this.align(futureWeatherStack)
    subConditionStack.layoutHorizontally()
    subConditionStack.centerAlignContent()
    subConditionStack.setPadding(0, this.padding, this.padding, this.padding)

    let nightCondition = false
    if (showNextHour) { nightCondition = this.isNight(new Date(this.now.getTime() + (60*60*1000))) }

    const nextHour = weatherData.hourly[1]
    const tomorrow = weatherData.forecast[1]
    const subCondition = subConditionStack.addImage(this.provideConditionSymbol(showNextHour ? (nextHour?.Condition ?? 100) : (tomorrow?.Condition ?? 100),nightCondition))
    const subConditionSize = showNextHour ? 14 : 18
    subCondition.imageSize = new Size(subConditionSize, subConditionSize)
    this.tintIcon(subCondition, this.format.smallTemp)
    subConditionStack.addSpacer(5)

    if (showNextHour) {
      this.provideText(this.displayNumber(nextHour?.Temp,"--") + "°", subConditionStack, this.format.smallTemp)

    } else {
      const tomorrowLine = subConditionStack.addImage(this.drawVerticalLine(this.provideColor(this.format.tinyTemp, 0.5), 20))
      if (this.settings.widget.instantDark) this.tintIcon(tomorrowLine, this.format.tinyTemp, true)
      tomorrowLine.imageSize = new Size(3,28)
      subConditionStack.addSpacer(5)
      const tomorrowStack = subConditionStack.addStack()
      tomorrowStack.layoutVertically()

      this.provideText(this.displayNumber(tomorrow?.High,"-"), tomorrowStack, this.format.tinyTemp)
      tomorrowStack.addSpacer(4)
      this.provideText(this.displayNumber(tomorrow?.Low,"-"), tomorrowStack, this.format.tinyTemp)
    }

    if (weatherSettings.showRain) {
      const subRainStack = this.align(futureWeatherStack)
      subRainStack.layoutHorizontally()
      subRainStack.centerAlignContent()
      subRainStack.setPadding(0, this.padding, this.padding, this.padding)

      const subRain = subRainStack.addImage(SFSymbol.named("umbrella").image)
      subRain.imageSize = new Size(subConditionSize, subConditionSize)
      this.tintIcon(subRain, this.format.smallTemp, true)
      subRainStack.addSpacer(5)

      this.provideText(this.displayNumber(showNextHour ? weatherData.nextHourRain : weatherData.tomorrowRain,"--") + "%", subRainStack, this.format.smallTemp)
    }
  }
};
