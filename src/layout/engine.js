// Licensed under MIT. See LICENSE.

module.exports = {
  async executeItem(item) {
      const match = item.trim().replace(/[.,]$/, "").match(/^([^\s(]+)(?:\(([\s\S]*)\))?$/)
      const functionName = match ? match[1] : item
      const parameter = match && match[2] !== undefined ? match[2] : null

      if (this.custom && typeof this.custom[functionName] === "function") {
        return await this.custom[functionName](this.currentColumn, parameter)
      }
      if (typeof this[functionName] === "function") return await this[functionName](this.currentColumn, parameter)
      console.error("The " + functionName + " item in your layout is unavailable. Check for misspellings or other formatting issues. If you have any custom items, ensure they are set up correctly.")
    },

  async processASCIILine(line) {

      // If it's a line, enumerate previous columns (if any) and set up the new row.
      if (line[0] == "-" && line[line.length-1] == "-") {
        if (this.currentColumns.length > 0) {
          for (const col of this.currentColumns) {
            if (!col) { continue }
            this.column(this.currentColumn,col.width)
            for (const item of col.items) { await this.executeItem(item) }
          }
          this.currentColumns = []
        }
        return this.rowNeedsSetup = true
      }

      if (this.rowNeedsSetup) {
        this.row(this.currentColumn)
        this.rowNeedsSetup = false
      }

      const items = line.split('|')
      for (var i=1; i < items.length-1; i++) {

        if (!this.currentColumns[i]) { this.currentColumns[i] = { items: [] } }
        const column = this.currentColumns[i].items

        const rawItem = items[i]
        const trimmedItem = rawItem.trim().split("(")[0]

        // If it's not a widget item, it's a column width or a space.
        if (!(this[trimmedItem] || (this.custom && this.custom[trimmedItem]))) {

          if (rawItem.match(/\s+\d+\s+/)) {
            const value = parseInt(trimmedItem)
            if (value) { this.currentColumns[i].width = value }
            continue
          }

          const prevItem = column[column.length-1]
          if (trimmedItem == "" && (!prevItem || !prevItem.startsWith("space"))) {
            column.push("space")
            continue
          }
        }

        const leading = rawItem.startsWith(" ")
        const trailing = rawItem.endsWith(" ")
        column.push((leading && trailing) ? "center" : (trailing ? "left" : "right"))
        column.push(rawItem.trim())
      }
    },

  row(input, parameter) {
      this.currentRow = this.widget.addStack()
      this.currentRow.layoutHorizontally()
      this.currentRow.setPadding(0, 0, 0, 0)
      this.currentColumn.spacing = 0
      if (parameter) this.currentRow.size = new Size(0,parseInt(parameter))
    },

  column(input, parameter) {
      this.currentColumn = this.currentRow.addStack()
      this.currentColumn.layoutVertically()
      this.currentColumn.setPadding(0, 0, 0, 0)
      this.currentColumn.spacing = 0
      if (parameter) this.currentColumn.size = new Size(parseInt(parameter),0)
    },

  space(input, parameter) {
      if (parameter) input.addSpacer(parseInt(parameter))
      else input.addSpacer()
    },

  align(column) {
      const alignmentStack = column.addStack()
      alignmentStack.layoutHorizontally()

      const returnStack = this.currentAlignment(alignmentStack)
      returnStack.layoutVertically()
      return returnStack
    },

  setAlignment(left = false, right = false) {
      function alignment(alignmentStack) {
        if (right) alignmentStack.addSpacer()
        const returnStack = alignmentStack.addStack()
        if (left) alignmentStack.addSpacer()
        return returnStack
      }
      this.currentAlignment = alignment
    },

  right() { this.setAlignment(false, true) },

  left() { this.setAlignment(true, false) },

  center() { this.setAlignment(true, true) }
};
