import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.
// Feed items render normalized news and COVID data with localized formatting.

export default {
  async covid(this: WeatherCalContext, column: WidgetStack): Promise<void> {
    if (!this.data.covid) await this.setupCovid()
    const data = this.data.covid ?? {}

    const covidStack = this.align(column)
    covidStack.setPadding(this.padding/2, this.padding, this.padding/2, this.padding)
    covidStack.layoutHorizontally()
    covidStack.centerAlignContent()
    covidStack.url = this.settings.covid.url

    covidStack.addSpacer(this.padding * 0.3)

    const covidIcon = covidStack.addImage(SFSymbol.named("bandage").image)
    covidIcon.imageSize = new Size(18,18)
    this.tintIcon(covidIcon,this.format.covid,true)

    covidStack.addSpacer(this.padding)

    this.provideText(this.localization.covid.replace(/{(.*?)}/g, (_match: string, $1: string) => {
      const val = data[$1]
      return val == null ? "" : new Intl.NumberFormat(this.locale.replace('_','-')).format(val)
    }), covidStack, this.format.covid)
  },

  async news(this: WeatherCalContext, column: WidgetStack): Promise<void> {
    if (!this.data.news) await this.setupNews()
    const news = this.data.news ?? []
    const newsSettings = this.settings.news

    for (const newsItem of news) {
      const newsStack = column.addStack()
      newsStack.setPadding(this.padding, this.padding, this.padding, this.padding)
      newsStack.spacing = this.padding/5
      newsStack.layoutVertically()
      newsStack.url = newsItem.link

      const titleStack = this.align(newsStack)
      const title = this.provideText(newsItem.title, titleStack, this.format.newsTitle)
      if (newsSettings.limitLineHeight) title.lineLimit = 1

      if (!newsSettings.showDate || newsSettings.showDate == "noDate") { continue }

      if (newsItem.date == null) continue
      const dateValue = new Date(newsItem.date)
      if (!Number.isFinite(dateValue.getTime())) { continue }
      let dateText
      switch (newsSettings.showDate) {
        case "relative":
          const rdf = new RelativeDateTimeFormatter()
          rdf.locale = this.locale
          rdf.useNamedDateTimeStyle()
          dateText = rdf.string(dateValue, this.now)
          break
        case "date":
          dateText = this.formatDate(dateValue)
          break
        case "time":
          dateText = this.formatTime(dateValue)
          break
        case "datetime":
          dateText = this.formatDatetime(dateValue)
          break
        case "custom":
          dateText = this.formatDate(dateValue, newsSettings.dateFormat)
      }
      if (dateText) this.provideText(dateText, this.align(newsStack), this.format.newsDate)
    }
  }
};
