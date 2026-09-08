// Licensed under MIT. See LICENSE.

module.exports = {
  async initialSetup(imported = false) {
      let message, options
      if (!imported) {
        message = "Welcome to Weather Cal. Make sure your script has the name you want before you begin."
        options = ['I like the name "' + this.name + '"', "Let me go change it"]
        if (await this.generateAlert(message,options)) return
      }

      message = (imported ? "Welcome to Weather Cal. We" : "Next, we") + " need to check if you've given permissions to the Scriptable app. This might take a few seconds."
      await this.generateAlert(message,["Check permissions"])

      let errors = []
      try { if (!(await this.setupLocation())) errors.push("location") } catch { errors.push("location") }
      try { await CalendarEvent.today() } catch { errors.push("calendar") }
      try { await Reminder.all() } catch { errors.push("reminders") }

      let issues
      if (errors.length > 0) { issues = errors[0] }
      if (errors.length == 2) { issues += " and " + errors[1] }
      if (errors.length == 3) { issues += ", " + errors[1] + ", and " + errors[2] }

      if (issues) {
        message = "Scriptable does not have permission for " + issues + ". Some features may not work without enabling them in the Settings app."
        options = ["Continue setup anyway", "Exit setup"]
      } else {
        message = "Your permissions are enabled."
        options = ["Continue setup"]
      }
      if (await this.generateAlert(message,options)) return

      message = "To display the weather on your widget, you need an OpenWeather API key."
      options = ["I already have a key", "I need to get a key", "I don't want to show weather info"]
      const weather = await this.generateAlert(message,options)
      if (weather < 0) return

      // Show a web view to claim the API key.
      if (weather == 1) {
        message = "On the next screen, sign up for OpenWeather. Find the API key, copy it, and close the web view. You will then be prompted to paste in the key."
        await this.generateAlert(message,["Continue"])

        const webView = new WebView()
        await webView.loadURL("https://openweathermap.org/home/sign_up")
        await webView.present()
      }

      // We need the API key if we're showing weather.
      if (weather < 2 && !(await this.getWeatherKey(true))) { return }

      if (!imported && !(await this.setWidgetBackground())) return
      this.writePreference("weather-cal-setup", "true")

      message = "Your widget is ready! You'll now see a preview. Re-run this script to edit the default preferences, including localization. When you're ready, add a Scriptable widget to the home screen and select this script."
      await this.generateAlert(message,["Show preview"])
      return this.previewValue()
    },

  async getWeatherKey(firstRun = false) {
      const returnVal = await this.promptForText("Paste your API key in the box below.",[""],["82c29fdbgd6aebbb595d402f8a65fabf"])
      const apiKey = returnVal.textFieldValue(0).trim()
      if (!apiKey) { await this.generateAlert("No API key was entered. Try copying the key again and re-running this script.",["Exit"]); return false }
      this.writePreference("weather-cal-api-key", apiKey)

      let apiResponse
      try { apiResponse = await this.getWeatherApiPath(apiKey) } catch {}
      if (apiResponse && apiResponse.current) {
        await this.generateAlert("The API key worked and was saved.",[firstRun ? "Continue" : "OK"])
      } else if (firstRun) {
        await this.generateAlert("New OpenWeather API keys may take a few hours to activate. Your widget will start displaying weather information once it's active.",["Continue"])
      } else {
        await this.generateAlert("The key could not be verified. Check your connection and OpenWeather subscription. New keys may take a few hours to activate.")
        return false
      }
      return true
    }
};
