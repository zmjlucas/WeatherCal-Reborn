import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.
// Sun items consume sunrise, sunset, and tomorrow timestamps in milliseconds.

export default {
  async sunrise(this: WeatherCalContext, column: WidgetStack, forceSunset = false): Promise<void> {
    if (!this.data.sun) await this.setupSunrise()
    const sun = this.data.sun
    if (!sun) throw new Error("Sunrise setup did not provide sun data.")
    const [sunrise, sunset, tomorrow, current, sunSettings] = [sun.sunrise, sun.sunset, sun.tomorrow, this.now.getTime(), this.settings.sunrise]

    const showWithin = parseInt(String(sunSettings.showWithin))
    if (showWithin > 0 && !(Math.abs(this.now.getTime() - (sunrise ?? 0)) / 60000 <= showWithin) && !(Math.abs(this.now.getTime() - (sunset ?? 0)) / 60000 <= showWithin)) { return }

    let timeToShow, symbolName
    const showSunset = current > (sunrise ?? 0) + 30*60*1000 && current < (sunset ?? 0) + 30*60*1000

    if (sunSettings.separateElements ? forceSunset : showSunset) {
      symbolName = "sunset.fill"
      timeToShow = sunset
    } else {
      symbolName = "sunrise.fill"
      timeToShow = current > (sunset ?? 0) ? tomorrow : sunrise
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

  async sunset(this: WeatherCalContext, column: WidgetStack): Promise<void> { return await this.sunrise(column, true) }
};
