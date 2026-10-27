//#region custom-item
// Add a status item that measures and renders one text line.
var custom = {
  items: {
    status: {
      options: { label: "string" },
      async prepare({ host }, options) {
        const text = String(options.label || "Ready")
        const size = Number(host.format.defaultText.size)
        const font = host.provideFont(host.format.defaultText.font, size)
        const color = host.provideColor()
        const minWidth = [...text].length * size * 1.1 + 4
        const height = size * 1.4 + 4
        return {
          state: "ready",
          effects: {},
          variants: [{
            id: "normal",
            minWidth,
            preferredWidth: minWidth,
            adaptationCost: 0,
            measure(width) {
              return {
                requiredHeight: height,
                preferredHeight: height,
                confidence: "estimated"
              }
            }
          }],
          render(container, placement) {
            const row = container.addStack()
            row.layoutHorizontally()
            row.size = new Size(placement.width, placement.height)
            if (placement.textAlign !== "start") row.addSpacer()
            const line = row.addText(text)
            line.font = font
            line.textColor = color
            line.lineLimit = 1
            line.minimumScaleFactor = 1
            if (placement.textAlign !== "end") row.addSpacer()
          }
        }
      }
    }
  },
  background(widget) {
    widget.backgroundColor = Color.black()
  }
};

// Put the status item above current weather.
var layout = `
column(padding: 12)[
  status(label: "Ready"),
  current
]
`;
//#endregion custom-item
