import type { WeatherCalContext } from '../types/context';
import { qweatherLocale } from '../data/qweather-locale';

export default {
  async rain(this: WeatherCalContext, column: WidgetStack): Promise<void> {
    await this.setupRain();
    const chinese = qweatherLocale(this.settings.weather.locale || this.locale || Device.locale()).startsWith('zh');
    const stack = this.align(column);
    stack.setPadding(this.padding / 2, this.padding, this.padding / 2, this.padding);
    if (this.settings.weather.provider === 'openweather') {
      this.provideText(chinese ? '短临降水预报需要和风天气' : 'Rain nowcast requires QWeather', stack, this.format.smallTemp);
      return;
    }
    const { forecast, outlook } = this.data.rain || {};
    if (!forecast?.summary || !outlook) {
      this.provideText(chinese ? '短临降水预报暂不可用' : 'Rain forecast unavailable', stack, this.format.smallTemp);
      return;
    }
    this.provideText(forecast.summary, stack, this.format.smallTemp, false, 'https://www.qweather.com/');
  }
};
