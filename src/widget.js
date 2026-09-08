// Licensed under MIT. See LICENSE.

module.exports = {
  initialize(name, iCloudInUse) {
      this.name = name
      this.fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
      this.bgPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-" + this.name)
      this.prefPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-preferences-" + name)
      this.widgetUrl = "https://github.com/zmjlucas/WeatherCal-Reborn/releases/latest/download/weather-cal.js"
      this.now = new Date()
      this.data = {}
      this.initialized = true
    },

  async createWidget(layout, name, iCloudInUse, custom) {
      this.initialize(name, iCloudInUse)
      // iCloud metadata can exist before the preference files are downloaded.
      for (const path of [this.prefPath, this.bgPath]) {
        if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) {
          await this.fm.downloadFileFromiCloud(path)
        }
      }

      // Determine if we're using the old or new setup.
      if (typeof layout == "object") {
        this.settings = layout

      } else {
        this.settings = await this.getSettings()
        this.settings.layout = layout
      }

      // Shared values.
      this.locale = this.settings.widget.locale
      this.padding = parseInt(this.settings.widget.padding)
      this.localization = this.settings.localization
      this.format = this.settings.font
      this.custom = custom
      this.darkMode = !(Color.dynamic(Color.white(),Color.black()).red)

      if (!this.locale || this.locale == "" || this.locale == null) { this.locale = Device.locale() }

      // Widget setup.
      this.widget = new ListWidget()
      this.widget.spacing = 0

      const verticalPad = this.padding < 10 ? 10 - this.padding : 10
      const horizontalPad = this.padding < 15 ? 15 - this.padding : 15

      const widgetPad = this.settings.widget.widgetPadding || {}
      const topPad    = (widgetPad.top && widgetPad.top.length) ? parseInt(widgetPad.top) : verticalPad
      const leftPad   = (widgetPad.left && widgetPad.left.length) ? parseInt(widgetPad.left) : horizontalPad
      const bottomPad = (widgetPad.bottom && widgetPad.bottom.length) ? parseInt(widgetPad.bottom) : verticalPad
      const rightPad  = (widgetPad.right && widgetPad.right.length) ? parseInt(widgetPad.right) : horizontalPad

      this.widget.setPadding(topPad, leftPad, bottomPad, rightPad)

      // Background setup.
      let background = { type: "color", color: "16296b" }
      if (!(custom && custom.background)) {
        try { background = JSON.parse(this.fm.readString(this.bgPath)) || background } catch { }
      }

      if (custom && custom.background) {
        await custom.background(this.widget)

      } else if (background.type == "color") {
        this.widget.backgroundColor = this.provideColor(background)

      } else if (background.type == "auto") {
        const gradient = new LinearGradient()
        const gradientSettings = await this.setupGradient()

        gradient.colors = gradientSettings.color()
        gradient.locations = gradientSettings.position()
        this.widget.backgroundGradient = gradient

      } else if (background.type == "gradient") {
        const gradient = new LinearGradient()
        const initialColor = this.provideColor({ color: background.initialColor, dark: background.initialDark })
        const finalColor = this.provideColor({ color: background.finalColor, dark: background.finalDark })

        gradient.colors = [initialColor, finalColor]
        gradient.locations = [0, 1]
        this.widget.backgroundGradient = gradient

      } else if (background.type == "image") {
        const extension = (this.darkMode && background.dark && !this.settings.widget.instantDark ? " (Dark)" : "") + ".jpg"
        const imagePath = this.fm.joinPath(this.fm.joinPath(this.fm.documentsDirectory(), "Weather Cal"), name + extension)

        if (this.fm.fileExists(imagePath)) {
          if (this.fm.isFileStoredIniCloud(imagePath)) { await this.fm.downloadFileFromiCloud(imagePath) }
          this.widget.backgroundImage = this.fm.readImage(imagePath)

        } else if (config.runsInWidget) {
          this.widget.backgroundColor = Color.gray()

        } else {
          await this.generateAlert("Please choose a background image in the settings menu.")
        }
      }

      // Construct the widget.
      this.currentRow = {}
      this.currentColumn = {}
      this.left()

      this.usingASCII = undefined
      this.currentColumns = []
      this.rowNeedsSetup = false

      for (const rawLine of this.settings.layout.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (line == '') { continue }
        if (this.usingASCII == undefined) {
          if (/^row(?:\(|$)/.test(line)) { this.usingASCII = false }
          if (line[0] == "-" && line[line.length-1] == "-") { this.usingASCII = true }
        }
        this.usingASCII ? await this.processASCIILine(line) : await this.executeItem(line)
      }
      if (this.usingASCII && this.currentColumns.length) await this.processASCIILine("---")
      return this.widget
    }
};
