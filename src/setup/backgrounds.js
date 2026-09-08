// Licensed under MIT. See LICENSE.

module.exports = {
  async setWidgetBackground() {
      const options = ["Solid color", "Automatic gradient", "Custom gradient", "Image from Photos"]
      const backgroundType = await this.generateAlert("What type of background would you like for your widget?",options)

      if (backgroundType < 0 || backgroundType > 3) return
      let background = {}
      if (this.fm.fileExists(this.bgPath)) {
        if (this.fm.isFileStoredIniCloud(this.bgPath)) await this.fm.downloadFileFromiCloud(this.bgPath)
        try { background = JSON.parse(this.fm.readString(this.bgPath)) } catch {}
      }
      if (backgroundType == 0) {
        background.type = "color"
        const returnVal = await this.promptForText("Background Color",[background.color,background.dark],["Default color","Dark mode color (optional)"],"Enter the hex value of the background color you want. You can optionally choose a different background color for dark mode.")
        background.color = returnVal.textFieldValue(0)
        background.dark = returnVal.textFieldValue(1)

      } else if (backgroundType == 1) {
        background.type = "auto"

      } else if (backgroundType == 2) {
        background.type = "gradient"
        const returnVal = await this.promptForText("Gradient Colors",[background.initialColor,background.finalColor,background.initialDark,background.finalDark],["Top default color","Bottom default color","Top dark mode color","Bottom dark mode color"],"Enter the hex values of the colors for your gradient. You can optionally choose different background colors for dark mode.")
        background.initialColor = returnVal.textFieldValue(0)
        background.finalColor = returnVal.textFieldValue(1)
        background.initialDark = returnVal.textFieldValue(2)
        background.finalDark = returnVal.textFieldValue(3)

      } else if (backgroundType == 3) {
        background.type = "image"

        let lightImage, darkImage
        try {
          lightImage = await Photos.fromLibrary()
          const darkChoice = await this.generateAlert("Would you like to use a different image in dark mode?",["Yes","No"])
          if (darkChoice < 0) return
          background.dark = darkChoice === 0
          if (background.dark) darkImage = await Photos.fromLibrary()
        } catch { return }
        if (!lightImage || (background.dark && !darkImage)) return
        const directoryPath = this.fm.joinPath(this.fm.documentsDirectory(), "Weather Cal")
        if (!this.fm.fileExists(directoryPath)) this.fm.createDirectory(directoryPath)
        this.fm.writeImage(this.fm.joinPath(directoryPath, this.name + ".jpg"), lightImage)
        if (background.dark) this.fm.writeImage(this.fm.joinPath(directoryPath, this.name + " (Dark).jpg"), darkImage)
      }

      this.writePreference(null, background, this.bgPath)
      return this.previewValue()
    }
};
