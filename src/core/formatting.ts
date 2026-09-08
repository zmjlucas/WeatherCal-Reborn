import type { ColorFormat, WidgetContainer } from "../types/rendering";
import type { FontFormat } from "../types/settings";
import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.

export default {
  displayNumber(this: WeatherCalContext, number: number | null | undefined, dummy = "-"): string { return (number == null ? dummy : Math.round(number).toString()) },

  tintIcon(this: WeatherCalContext, icon: WidgetImage, format?: ColorFormat | null, force = false): void {
      const tintIcons = this.settings.widget.tintIcons
      const never = tintIcons == this.enum.icons.never || !tintIcons
      const notDark = tintIcons == this.enum.icons.dark && !this.darkMode && !this.settings.widget.instantDark
      const notLight = tintIcons == this.enum.icons.light && this.darkMode && !this.settings.widget.instantDark
      if (!force && (never || notDark || notLight)) { return }
      icon.tintColor = this.provideColor(format)
    },

  isNight(this: WeatherCalContext, dateInput: Date): boolean {
      const timeValue = dateInput.getTime()
      return (timeValue < (this.data.sun?.sunrise ?? 0)) || (timeValue > (this.data.sun?.sunset ?? 0))
    },

  dateDiff(this: WeatherCalContext, first: Date, second: Date): number {
      const firstDate = new Date(first.getFullYear(), first.getMonth(), first.getDate(), 0, 0, 0)
      const secondDate = new Date(second.getFullYear(), second.getMonth(), second.getDate(), 0, 0, 0)
      return Math.round((secondDate.getTime()-firstDate.getTime())/(1000*60*60*24))
    },

  formatTime(this: WeatherCalContext, date: Date): string { return this.formatDate(date,null,false,true) },

  formatDatetime(this: WeatherCalContext, date: Date): string { return this.formatDate(date,null,true,true) },

  formatDate(this: WeatherCalContext, date: Date, format?: string | null, showDate = true, showTime = false): string {
      const df = new DateFormatter()
      df.locale = this.locale
      if (format) {
        df.dateFormat = format
      } else {
        showDate ? df.useShortDateStyle() : df.useNoDateStyle()
        showTime ? df.useShortTimeStyle() : df.useNoTimeStyle()
      }
      return df.string(date)
    },

  provideTextSymbol(this: WeatherCalContext, shape: string): string {
      if (shape.startsWith("rect")) { return "\u2759" }
      if (shape == "circle") { return "\u2B24" }
      return "\u2759"
    },

  provideFont(this: WeatherCalContext, fontName: string, fontSize: number): Font {
      const fontGenerator: Record<string, () => Font> = {
        ultralight() { return Font.ultraLightSystemFont(fontSize) },
        light()      { return Font.lightSystemFont(fontSize) },
        regular()    { return Font.regularSystemFont(fontSize) },
        medium()     { return Font.mediumSystemFont(fontSize) },
        semibold()   { return Font.semiboldSystemFont(fontSize) },
        bold()       { return Font.boldSystemFont(fontSize) },
        heavy()      { return Font.heavySystemFont(fontSize) },
        black()      { return Font.blackSystemFont(fontSize) },
        italic()     { return Font.italicSystemFont(fontSize) },
      }
      const generator = fontGenerator[fontName]
      return generator ? generator() : new Font(fontName, fontSize)
    },

  provideText(this: WeatherCalContext, string: unknown, stack: WidgetContainer, format?: Partial<FontFormat> | null, standardize = false, url?: string): WidgetText {
      let container = stack
      if (standardize) {
        container = this.align(stack)
        container.setPadding(this.padding, this.padding, this.padding, this.padding)
      }

      const capsEnum = this.enum.caps
      function capitalize(text: string, caps: string): string {
        switch (caps) {
          case (capsEnum.upper):
            return text.toUpperCase()

          case (capsEnum.lower):
            return text.toLowerCase()

          case (capsEnum.title):
            return text.replace(/\w\S*/g,function(a) {
              return a.charAt(0).toUpperCase() + a.substr(1).toLowerCase()
            })
        }
        return text
      }

      const capFormat = (format && format.caps && format.caps.length) ? format.caps : this.format.defaultText.caps
      const textItem = container.addText(capitalize(string == null ? "--" : String(string),capFormat))

      const textFont = (format && format.font && format.font.length) ? format.font : this.format.defaultText.font
      const textSize = (format && format.size && parseInt(String(format.size))) ? format.size : this.format.defaultText.size
      textItem.font = this.provideFont(textFont, parseInt(String(textSize)))
      textItem.textColor = this.provideColor(format)
    if (url) {
      textItem.url = url
    }

      return textItem
    },

  provideColor(this: WeatherCalContext, format?: ColorFormat | null, alpha?: number): Color {
      const defaultText = this.format.defaultText
      const lightColor = (format && format.color && format.color.length) ? format.color : defaultText.color
      const defaultDark = (defaultText.dark && defaultText.dark.length) ? defaultText.dark : defaultText.color
      const darkColor = (format && format.dark && format.dark.length) ? format.dark : defaultDark

      if (this.settings.widget.instantDark) return Color.dynamic(new Color(lightColor, alpha), new Color(darkColor, alpha))
      return new Color(this.darkMode && darkColor ? darkColor : lightColor, alpha)
    }
};
