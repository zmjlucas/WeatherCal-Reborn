import type { WeatherCalContext } from '../types/context';
import { getQWeatherHost } from '../data/qweather-state';
import { verifyAndSaveQWeatherCredentials } from './qweather-credentials';
import { record } from '../types/json';

export default {
  async selectWeatherProvider(this: WeatherCalContext, firstRun = false): Promise<boolean> {
    if (this.fm.fileExists(this.prefPath) && this.fm.isFileStoredIniCloud(this.prefPath)) await this.fm.downloadFileFromiCloud(this.prefPath);
    const selection = await this.generateAlert('Choose your weather provider', [
      'QWeather (default)', 'OpenWeather', firstRun ? "I don't want to show weather info" : 'Cancel'
    ], 'QWeather needs your API Host and key from console.qweather.com. OpenWeather uses its own API key.');
    if (selection < 0 || selection > 1) return firstRun && selection === 2;
    const provider = selection === 0 ? 'qweather' : 'openweather';
    const host = getQWeatherHost(this.name) || '';
    if (provider === 'qweather') {
      const prompt = new Alert();
      prompt.title = 'QWeather credentials';
      prompt.message = 'Find API Host in QWeather Console → Settings. Leave key blank to keep a key already saved for this host. Verification makes one weather request before saving.';
      prompt.addSecureTextField('your-host.qweatherapi.com', host);
      prompt.addSecureTextField('API key', '');
      prompt.addAction('Verify and save');
      prompt.addAction('Cancel');
      if (await prompt.presentAlert() !== 0) return false;
      const error = await verifyAndSaveQWeatherCredentials(this.name, prompt.textFieldValue(0), prompt.textFieldValue(1));
      if (error) {
        await this.generateAlert('QWeather verification failed', ['OK'], error);
        return false;
      }
    } else if (!(await this.getWeatherKey(firstRun))) return false;

    let saved: Record<string, unknown> = {};
    try { saved = record(JSON.parse(this.fm.readString(this.prefPath))); } catch { }
    const weather: Record<string, unknown> = { ...record(saved.weather), provider };
    delete weather.qweatherHost;
    saved.weather = weather;
    this.writePreference(null, saved, this.prefPath);
    if (this.hasSettings) {
      this.settings.weather.provider = provider;
    }
    delete this.data.weather;
    delete this.data.sun;
    delete this.data.rain;
    delete this.data.weatherAttributions;
    delete this.data.weatherError;
    if (provider === 'qweather') await this.generateAlert('QWeather credentials verified', [firstRun ? 'Continue' : 'OK'], 'Settings saved. Weather will load when you preview the widget.');
    return true;
  }
};
