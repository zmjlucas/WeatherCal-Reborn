import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.

export default {
  provideBatteryIcon(this: WeatherCalContext, batteryLevel: number, charging = false): Image {
      if (charging) { return SFSymbol.named("battery.100.bolt").image }

      const batteryWidth = 87
      const batteryHeight = 41

      const draw = new DrawContext()
      draw.opaque = false
      draw.respectScreenScale = true
      draw.size = new Size(batteryWidth, batteryHeight)

      draw.drawImageInRect(SFSymbol.named("battery.0").image, new Rect(0, 0, batteryWidth, batteryHeight))

      const x = batteryWidth*0.1525
      const y = batteryHeight*0.247
      const width = batteryWidth*0.602
      const height = batteryHeight*0.505

      let level = batteryLevel
      if (level < 0.05) { level = 0.05 }

      const current = width * level
      let radius = height/6.5

      // When it gets low, adjust the radius to match.
      if (current < (radius * 2)) { radius = current / 2 }

      const barPath = new Path()
      barPath.addRoundedRect(new Rect(x, y, current, height), radius, radius)
      draw.addPath(barPath)
      draw.setFillColor(Color.black())
      draw.fillPath()
      return draw.getImage()
    },

  provideConditionSymbol(this: WeatherCalContext, cond: number, night: boolean): Image {
      const symbols: Record<string, () => string> = {
        "1": function() { return "exclamationmark.circle" },
        "2": function() { return "cloud.bolt.rain.fill" },
        "3": function() { return "cloud.drizzle.fill" },
        "5": function() { return (cond == 511) ? "cloud.sleet.fill" : "cloud.rain.fill" },
        "6": function() { return (cond >= 611 && cond <= 613) ? "cloud.snow.fill" : "snow" },
        "7": function() {
          if (cond == 781) { return "tornado" }
          if (cond == 701 || cond == 741) { return "cloud.fog.fill" }
          return night ? "cloud.fog.fill" : "sun.haze.fill"
        },
        "8": function() {
          if (cond == 800 || cond == 801) { return night ? "moon.stars.fill" : "sun.max.fill" }
          if (cond == 802 || cond == 803) { return night ? "cloud.moon.fill" : "cloud.sun.fill" }
          return "cloud.fill"
        },
      }
      return SFSymbol.named((symbols[Math.floor(cond / 100)] ?? (() => "exclamationmark.circle"))()).image
    },

  drawVerticalLine(this: WeatherCalContext, color: Color, height: number): Image {

      const width = 2

      let draw = new DrawContext()
      draw.opaque = false
      draw.respectScreenScale = true
      draw.size = new Size(width,height)

      let barPath = new Path()
      const barHeight = height
      barPath.addRoundedRect(new Rect(0, 0, width, height), width/2, width/2)
      draw.addPath(barPath)
      draw.setFillColor(color)
      draw.fillPath()

      return draw.getImage()
    },

  provideTempBar(this: WeatherCalContext): Image {

      const tempBarWidth = 200
      const tempBarHeight = 20
      const weatherData = this.data.weather
      const current = weatherData?.currentTemp ?? 0
      const low = weatherData?.todayLow ?? 0
      const high = weatherData?.todayHigh ?? 0

      let percent = (current - low) / (high - low)
      if (!Number.isFinite(percent)) { percent = 0.5 }
      if (percent < 0) { percent = 0 }
      else if (percent > 1) { percent = 1 }

      const draw = new DrawContext()
      draw.opaque = false
      draw.respectScreenScale = true
      draw.size = new Size(tempBarWidth, tempBarHeight)

      const barPath = new Path()
      const barHeight = tempBarHeight - 10
      barPath.addRoundedRect(new Rect(0, 5, tempBarWidth, barHeight), barHeight / 2, barHeight / 2)
      draw.addPath(barPath)

      draw.setFillColor(this.provideColor(this.format.tinyTemp, 0.5))
      draw.fillPath()

      const currPath = new Path()
      currPath.addEllipse(new Rect((tempBarWidth - tempBarHeight) * percent, 0, tempBarHeight, tempBarHeight))
      draw.addPath(currPath)
      draw.setFillColor(this.provideColor(this.format.tinyTemp, 1))
      draw.fillPath()

      return draw.getImage()
    }
};
