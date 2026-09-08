import type { LocalizationSettings } from "../types/settings";
import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.
// Local items render greetings, custom text, battery level, ISO week, and SF Symbols.

export default {
  greeting(this: WeatherCalContext, column: WidgetStack): void {

    // This function makes a greeting based on the time of day.
    function makeGreeting(hour: number, localization: LocalizationSettings): string {
      if (hour    < 5)  { return localization.nightGreeting }
      if (hour    < 12) { return localization.morningGreeting }
      if (hour-12 < 5)  { return localization.afternoonGreeting }
      if (hour-12 < 10) { return localization.eveningGreeting }
      return localization.nightGreeting
    }
    this.provideText(makeGreeting(this.now.getHours(), this.localization), column, this.format.greeting, true)
  },

  text(this: WeatherCalContext, column: WidgetStack, input?: string | null): void {
    if (!input || input == "") { return }
    this.provideText(input, column, this.format.customText, true)
  },

  battery(this: WeatherCalContext, column: WidgetStack): void {
    const batteryStack = this.align(column)
    batteryStack.layoutHorizontally()
    batteryStack.centerAlignContent()
    batteryStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)

    const batteryIcon = batteryStack.addImage(this.provideBatteryIcon(Device.batteryLevel(),Device.isCharging()))
    batteryIcon.imageSize = new Size(30,30)

    const batteryLevel = Math.round(Device.batteryLevel() * 100)
    if (batteryLevel > 20 || Device.isCharging() ) { this.tintIcon(batteryIcon,this.format.battery,true) }
    else { batteryIcon.tintColor = Color.red() }

    batteryStack.addSpacer(this.padding * 0.6)
    this.provideText(batteryLevel + "%", batteryStack, this.format.battery)
  },

  week(this: WeatherCalContext, column: WidgetStack): void {
    const weekStack = this.align(column)
    weekStack.setPadding(this.padding/2, this.padding, 0, this.padding)
    weekStack.layoutHorizontally()
    weekStack.centerAlignContent()

    const currentThursday = new Date(this.now.getTime() +(3-((this.now.getDay()+6) % 7)) * 86400000)
    const yearOfThursday = currentThursday.getFullYear()
    const firstThursday = new Date(new Date(yearOfThursday,0,4).getTime() +(3-((new Date(yearOfThursday,0,4).getDay()+6) % 7)) * 86400000)
    const weekNumber = Math.floor(1 + 0.5 + (currentThursday.getTime() - firstThursday.getTime()) / 86400000/7) + ""
    this.provideText(this.localization.week + " " + weekNumber, weekStack, this.format.week)
  },

  symbol(this: WeatherCalContext, column: WidgetStack, name?: string | null): void {
    if (!name || !SFSymbol.named(name)) { return }

    const symSettings = this.settings.symbol || {}
    const symbolPad = symSettings.padding || {}
    const topPad    = (symbolPad.top !== undefined && String(symbolPad.top).length) ? parseInt(String(symbolPad.top)) : this.padding
    const leftPad   = (symbolPad.left !== undefined && String(symbolPad.left).length) ? parseInt(String(symbolPad.left)) : this.padding
    const bottomPad = (symbolPad.bottom !== undefined && String(symbolPad.bottom).length) ? parseInt(String(symbolPad.bottom)) : this.padding
    const rightPad  = (symbolPad.right !== undefined && String(symbolPad.right).length) ? parseInt(String(symbolPad.right)) : this.padding

    const symbolStack = this.align(column)
    symbolStack.setPadding(topPad, leftPad, bottomPad, rightPad)

    const symbol = symbolStack.addImage(SFSymbol.named(name).image)
    const configuredSize = parseInt(String(symSettings.size))
    const availableWidth = column.size.width - (this.padding * 4)
    // Automatic-width stacks report zero until layout; use the normal symbol size then.
    const size = configuredSize > 0 ? configuredSize : availableWidth > 0 ? availableWidth : 18
    symbol.imageSize = new Size(size, size)
    if ((symSettings.tintColor || "").length > 0) { symbol.tintColor = new Color(symSettings.tintColor) }
  }
};
