// Licensed under MIT. See LICENSE.

module.exports = {
  async generateAlert(title,options,message) {
      return await this.generatePrompt(title,message,options)
    },

  async promptForText(title,values,keys,message) {
      return await this.generatePrompt(title,message,null,values,keys)
    },

  async generatePrompt(title,message,options,textvals,placeholders) {
      const alert = new Alert()
      alert.title = title
      if (message) alert.message = message

      const buttons = options || ["OK"]
      for (const button of buttons) { alert.addAction(button) }

      if (!textvals) { return await alert.presentAlert() }

      for (let i = 0; i < textvals.length; i++) {
        alert.addTextField(placeholders && placeholders[i] ? placeholders[i] : null,(textvals[i] || "") + "")
      }

      if (!options) await alert.present()
      return alert
    }
};
