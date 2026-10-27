import { parseBackground } from "./types/background";
import type { Background } from "./types/background";
import type { LayoutInput, CustomItems } from "./types/context";
import type { WeatherCalContext } from "./types/context";
import { parseLayout } from "./layout/parser";
import { planLayout } from "./layout/planner";
import { renderLayout } from "./layout/renderer";
import { resolveViewport } from "./layout/viewport";
import { prepareItems } from "./items/registry";
import { DataSession } from "./layout/data-session";
import { LayoutError } from "./layout/errors";
import type { WidgetLayoutOptions } from "./layout/types";
import { latestReleaseUrl } from "./setup/distribution";

export default {
  initialize(this: WeatherCalContext, name: string, iCloudInUse: boolean): void {
      this.name = name
      this.fm = iCloudInUse ? FileManager.iCloud() : FileManager.local()
      this.bgPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-" + this.name)
      this.prefPath = this.fm.joinPath(this.fm.libraryDirectory(), "weather-cal-preferences-" + name)
      this.widgetUrl = latestReleaseUrl
      this.now = new Date()
      this.data = {}
      this.initialized = true
    },

  async createWidget(this: WeatherCalContext, layout: LayoutInput, name: string, iCloudInUse: boolean, custom?: CustomItems, options: WidgetLayoutOptions = {}): Promise<ListWidget> {
      this.initialize(name, iCloudInUse)
      // iCloud metadata can exist before the preference files are downloaded.
      for (const path of [this.prefPath, this.bgPath]) {
        if (this.fm.fileExists(path) && this.fm.isFileStoredIniCloud(path)) {
          await this.fm.downloadFileFromiCloud(path)
        }
      }

      this.settings = await this.getSettings()
      this.settings.layout = layout

      // Shared values.
      this.locale = this.settings.widget.locale
      this.padding = parseInt(String(this.settings.widget.padding))
      this.localization = this.settings.localization
      this.format = this.settings.font
      this.custom = custom
      this.darkMode = !(Color.dynamic(Color.white(),Color.black()).red)

      if (!this.locale || this.locale == "" || this.locale == null) { this.locale = Device.locale() }

      // Widget setup.
      this.widget = new ListWidget()
      this.widget.spacing = 0
      const refreshInterval = Number(this.settings.widget.refreshInterval)
      const refreshDate = new Date(this.now.getTime() + refreshInterval * 60000)
      // iOS controls actual refresh timing; invalid or legacy values use 15 minutes.
      this.widget.refreshAfterDate = Number.isInteger(refreshInterval) && refreshInterval > 0 && Number.isFinite(refreshDate.getTime())
        ? refreshDate : new Date(this.now.getTime() + 15 * 60000)

      this.widget.setPadding(0, 0, 0, 0)

      // Resolve the complete plan before creating content views or loading backgrounds.
      // Layout failures produce a useful widget, never a partial successful layout.
      const session = new DataSession(this)
      let tree
      let prepared
      try {
        const ast = parseLayout(layout)
        const viewport = resolveViewport({
          small: this.settings.widget.smallViewport,
          medium: this.settings.widget.mediumViewport,
          large: this.settings.widget.largeViewport,
        }, options, config.runsInWidget ? config.widgetFamily : undefined)
        prepared = await prepareItems(ast, this, custom?.items, session)
        const plan = planLayout(ast, viewport, prepared)
        if (!plan.ok) throw new LayoutError(plan.diagnostics[0]!)
        for (const diagnostic of plan.diagnostics) console.warn(`${diagnostic.code}: ${diagnostic.message}`)
        tree = plan.tree
      } catch (error) {
        const message = error instanceof LayoutError ? `${error.diagnostic.code}: ${error.message}`
          : `LAYOUT_FAILED: ${error instanceof Error ? error.message : String(error)}`
        console.error(message)
        this.widget.backgroundColor = new Color('16296b')
        this.widget.setPadding(12, 12, 12, 12)
        const title = this.widget.addText('Layout needs attention')
        title.font = Font.boldSystemFont(12)
        title.textColor = Color.white()
        const detail = this.widget.addText(message)
        detail.font = Font.regularSystemFont(10)
        detail.textColor = Color.white()
        return this.widget
      }

      // Background setup.
      let background: Background = { type: "color", color: "16296b" }
      if (!(custom && custom.background)) {
        try { background = parseBackground(JSON.parse(this.fm.readString(this.bgPath))) ?? background } catch { }
      }

      if (custom && custom.background) {
        await custom.background(this.widget)

      } else if (background.type == "color") {
        this.widget.backgroundColor = this.provideColor(background)

      } else if (background.type == "auto") {
        const gradient = new LinearGradient()
        const gradientSettings = await this.setupGradient.call(session.host)

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

      renderLayout(this.widget, tree, prepared)
      return this.widget
    }
};
