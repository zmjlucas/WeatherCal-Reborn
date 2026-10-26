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
    // This is a refresh request, not a promise of an exact iOS update time.
    const refresh = new Date(this.now.getTime() + 5 * 60000);
    if (!this.widget.refreshAfterDate || refresh < this.widget.refreshAfterDate) this.widget.refreshAfterDate = refresh;
    const { forecast, outlook } = this.data.rain || {};
    if (!forecast || !outlook) {
      this.provideText(chinese ? '短临降水预报暂不可用' : 'Rain forecast unavailable', stack, this.format.smallTemp);
      return;
    }
    const time = this.formatTime(new Date(outlook.time));
    const kind = chinese
      ? { rain: '降雨', snow: '降雪', precipitation: '降水' }[outlook.kind]
      : { rain: 'Rain', snow: 'Snow', precipitation: 'Precipitation' }[outlook.kind];
    const messages = chinese ? {
      starts: '预计约' + time + '开始' + kind,
      stops: '预计约' + time + '停止' + kind,
      ongoing: '预计' + kind + '持续至' + time,
      clear: '预计' + time + '前无降水'
    } : {
      starts: kind + ' expected around ' + time,
      stops: kind + ' expected to stop around ' + time,
      ongoing: kind + ' expected through ' + time,
      clear: 'No precipitation expected through ' + time
    };
    this.provideText(messages[outlook.state], stack, this.format.smallTemp);
    stack.addSpacer(2);
    const updated = this.formatTime(new Date(forecast.updateTime));
    this.provideText(chinese ? '更新于' + updated + ' · 和风天气' : 'Updated ' + updated + ' · QWeather',
      stack, this.format.tinyTemp, false, 'https://www.qweather.com/');
  }
};
