// Licensed under MIT. See LICENSE.

module.exports = {
  async loadPrefsTable(table,category) {
      table.removeAllRows()
      for (const settingName in category) {
        if (settingName == "name") continue

        const row = new UITableRow()
        row.dismissOnSelect = false
        row.height = 55

        const setting = category[settingName]

        let valText
        if (Array.isArray(setting.val)) {
          valText = setting.val.map(a => a.title).join(", ")

        } else if (setting.type == "fonts") {
          const item = setting.val
          const size = item.size.length ? `size ${item.size}` : ""
          const font = item.font.length ? ` ${item.font}` : ""
          const color = item.color.length ? ` (${item.color}${item.dark.length ? "/" + item.dark : ""})` : ""
          const caps = item.caps.length && item.caps != this.enum.caps.none ? ` - ${item.caps}` : ""
          valText = size + font + color + caps

        } else if (typeof setting.val == "object") {
          for (const subItem in setting.val) {
            const setupText = subItem + ": " + setting.val[subItem]
            valText = (valText ? valText + ", " : "") + setupText
          }

        } else {
          valText = setting.val + ""
        }

        const cell = row.addText(setting.name,valText)
        cell.subtitleColor = Color.gray()

        // If there's no type, it's just text.
        if (!setting.type) {
          row.onSelect = async () => {
            const returnVal = await this.promptForText(setting.name,[setting.val],[],setting.description)
            setting.val = returnVal.textFieldValue(0).trim()
            await this.loadPrefsTable(table,category)
          }

        } else if (setting.type == "enum") {
          row.onSelect = async () => {
            const returnVal = await this.generateAlert(setting.name,setting.options,setting.description)
            setting.val = setting.options[returnVal]
            await this.loadPrefsTable(table,category)
          }

        } else if (setting.type == "bool") {
          row.onSelect = async () => {
            const returnVal = await this.generateAlert(setting.name,["true","false"],setting.description)
            setting.val = !returnVal
            await this.loadPrefsTable(table,category)
          }

        } else if (setting.type == "fonts") {
          row.onSelect = async () => {
            const keys = ["size","color","dark","font"]
            const values = []
            for (const key of keys) values.push(setting.val[key])

            const options = ["Capitalization","Save and Close"]
            const prompt = await this.generatePrompt(setting.name,setting.description,options,values,keys)
            const returnVal = await prompt.present()

            // Both actions accept the current fields before any second prompt.
            for (let i=0; i < keys.length; i++) {
              setting.val[keys[i]] = prompt.textFieldValue(i).trim()
            }
            if (!returnVal) {
              const capOptions = [this.enum.caps.upper,this.enum.caps.lower,this.enum.caps.title,this.enum.caps.none]
              setting.val["caps"] = capOptions[await this.generateAlert("Capitalization",capOptions)]
            }

            await this.loadPrefsTable(table,category)
          }

        } else if (setting.type == "multival") {
          row.onSelect = async () => {

            // We need an ordered set.
            const map = new Map(Object.entries(setting.val))
            const keys = Array.from(map.keys())
            const returnVal = await this.promptForText(setting.name,Array.from(map.values()),keys,setting.description)
            for (let i=0; i < keys.length; i++) {
              setting.val[keys[i]] = returnVal.textFieldValue(i).trim()
            }
            await this.loadPrefsTable(table,category)
          }

        } else if (setting.type == "multiselect") {
          row.onSelect = async () => {

            // We need to pass sets to the function.
            const options = new Set(setting.options)
            const selected = new Set(setting.val.map ? setting.val.map(a => a.identifier) : [])
            const multiTable = new UITable()

            await this.loadMultiTable(multiTable, options, selected)
            await multiTable.present()

            setting.val = [...options].filter(option => [...selected].includes(option.identifier))
            await this.loadPrefsTable(table,category)
          }
        }
        table.addRow(row)
      }
      table.reload()
    },

  async loadMultiTable(table,options,selected) {
      table.removeAllRows()
      for (const item of options) {
        const row = new UITableRow()
        row.dismissOnSelect = false
        row.height = 55

        const isSelected = selected.has(item.identifier)
        row.backgroundColor = isSelected ? Color.dynamic(new Color("d8d8de"), new Color("2c2c2c")) : Color.dynamic(Color.white(), new Color("151517"))

        if (item.color) {
          const colorCell = row.addText(isSelected ? "\u25CF" : "\u25CB")
          colorCell.titleColor = item.color
          colorCell.widthWeight = 1
        }

        const titleCell = row.addText(item.title)
        titleCell.widthWeight = 15

        row.onSelect = async () => {
          if (isSelected) { selected.delete(item.identifier) }
          else { selected.add(item.identifier) }
          await this.loadMultiTable(table,options,selected)
        }
        table.addRow(row)
      }
      table.reload()
    },

  async editPreferences() {
      const settingsObject = await this.getSettings(true)
      const table = new UITable()
      table.showSeparators = true

      for (const categoryKey in settingsObject) {
        const row = new UITableRow()
        row.dismissOnSelect = false

        const category = settingsObject[categoryKey]
        row.addText(category.name)
        row.onSelect = async () => {
          const subTable = new UITable()
          subTable.showSeparators = true
          await this.loadPrefsTable(subTable,category)
          await subTable.present()
        }
        table.addRow(row)
      }
      await table.present()

      for (const categoryKey in settingsObject) {
        for (const item in settingsObject[categoryKey]) {
          if (item == "name") continue
          settingsObject[categoryKey][item] = settingsObject[categoryKey][item].val
        }
      }
      this.writePreference(null, settingsObject, this.prefPath)
    }
};
