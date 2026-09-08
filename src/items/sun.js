// Licensed under MIT. See LICENSE.
// Sun items consume sunrise, sunset, and tomorrow timestamps in milliseconds.

module.exports = {
  async sunrise(column, forceSunset = false) {
    if (!this.data.sun) { await this.setupSunrise() }
    const [sunrise, sunset, tomorrow, current, sunSettings] = [this.data.sun.sunrise, this.data.sun.sunset, this.data.sun.tomorrow, this.now.getTime(), this.settings.sunrise]

    const showWithin = parseInt(sunSettings.showWithin)
    if (showWithin > 0 && !(Math.abs(this.now.getTime() - sunrise) / 60000 <= showWithin) && !(Math.abs(this.now.getTime() - sunset) / 60000 <= showWithin)) { return }

    let timeToShow, symbolName
    const showSunset = current > sunrise + 30*60*1000 && current < sunset + 30*60*1000

    if (sunSettings.separateElements ? forceSunset : showSunset) {
      symbolName = "sunset.fill"
      timeToShow = sunset
    } else {
      symbolName = "sunrise.fill"
      timeToShow = current > sunset ? tomorrow : sunrise
    }

    const sunriseStack = this.align(column)
    sunriseStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)
    sunriseStack.layoutHorizontally()
    sunriseStack.centerAlignContent()

    sunriseStack.addSpacer(this.padding * 0.3)

    const sunSymbol = sunriseStack.addImage(SFSymbol.named(symbolName).image)
    sunSymbol.imageSize = new Size(22,22)
    this.tintIcon(sunSymbol, this.format.sunrise) // TODO: Maybe function-ize this too?

    sunriseStack.addSpacer(this.padding)

    const time = this.provideText(timeToShow == null ? "--" : this.formatTime(new Date(timeToShow)), sunriseStack, this.format.sunrise)
  },

  async sunset(column) { return await this.sunrise(column, true) }
};
