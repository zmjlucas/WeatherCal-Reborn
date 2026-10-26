import { dataCacheFilename } from '../data/cache';
import type { WeatherCalContext } from '../types/context';
import { getQWeatherHost, normalizeQWeatherHost, qweatherCacheScope } from '../data/qweather';
import { record } from '../types/json';

export default {
  async selectWeatherProvider(this: WeatherCalContext, firstRun = false): Promise<boolean> {
    if (this.fm.fileExists(this.prefPath) && this.fm.isFileStoredIniCloud(this.prefPath)) await this.fm.downloadFileFromiCloud(this.prefPath);
    const selection = await this.generateAlert('Choose your weather provider', [
      'QWeather (default)', 'OpenWeather', firstRun ? "I don't want to show weather info" : 'Cancel'
    ], 'QWeather needs your API Host and key from console.qweather.com. OpenWeather uses its own API key.');
    if (selection < 0 || selection > 1) return firstRun && selection === 2;
    const provider = selection === 0 ? 'qweather' : 'openweather';
    let host = getQWeatherHost(this.name) || '';
    if (provider === 'qweather') {
      const prompt = new Alert();
      prompt.title = 'QWeather credentials';
      prompt.message = 'Find API Host in QWeather Console → Settings. Leave key blank to keep a key already saved for this host.';
      prompt.addSecureTextField('your-host.qweatherapi.com', host);
      prompt.addSecureTextField('API key', '');
      prompt.addAction('Save');
      prompt.addAction('Cancel');
      if (await prompt.presentAlert() !== 0) return false;
      const normalized = normalizeQWeatherHost(prompt.textFieldValue(0));
      if (!normalized) {
        await this.generateAlert('Enter the dedicated qweatherapi.com API Host from your QWeather console.');
        return false;
      }
      host = normalized;
      const keyName = 'weather-cal-qweather-key:' + host;
      const previous = Keychain.contains(keyName) ? Keychain.get(keyName) : '';
      const key = prompt.textFieldValue(1).trim() || previous;
      if (!key || /[\r\n]/.test(key)) {
        await this.generateAlert('Enter a valid QWeather API key.');
        return false;
      }
      Keychain.set(keyName, key);
      Keychain.set('weather-cal-qweather-host:' + this.name, host);
      if (key !== previous) {
        const files = FileManager.local();
        const ratePath = files.joinPath(files.libraryDirectory(), dataCacheFilename('qweather-rate', qweatherCacheScope(host)));
        if (files.fileExists(ratePath)) files.remove(ratePath);
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
    delete this.data.weatherAttributions;
    delete this.data.weatherError;
    if (provider === 'qweather') await this.generateAlert('QWeather settings saved. Weather will load when you preview the widget.', [firstRun ? 'Continue' : 'OK']);
    return true;
  }
};
