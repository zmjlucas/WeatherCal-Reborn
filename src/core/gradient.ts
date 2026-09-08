import type { GradientSettings } from "../types/rendering";
import type { WeatherCalContext } from "../types/context";
// Licensed under MIT. See LICENSE.

export default {
  async setupGradient(this: WeatherCalContext): Promise<GradientSettings> {
      if (!this.data.sun) { await this.setupSunrise() }

      if (this.isNight(this.now)) {
        return {
          color() { return [new Color("16296b"), new Color("021033"), new Color("021033"), new Color("113245")] },
          position() { return [-0.5, 0.2, 0.5, 1] },
        }
      }
      return {
        color() { return [new Color("3a8cc1"), new Color("90c0df")] },
        position() { return [0, 1] },
      }
    }
};
