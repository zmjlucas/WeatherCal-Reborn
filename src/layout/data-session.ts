import type { WeatherCalContext } from '../types/context';

/** One creation owns promises, including rejected promises, so retries never occur in measure/render. */
export class DataSession {
  private readonly values = new Map<string, Promise<unknown>>();
  readonly host: WeatherCalContext;

  constructor(host: WeatherCalContext) {
    this.host = Object.create(host) as WeatherCalContext;
    this.host.data = { ...host.data };
    this.host.now = new Date(host.now.getTime());
    this.host.settings = JSON.parse(JSON.stringify(host.settings)) as typeof host.settings;
    this.host.format = this.host.settings.font;
    this.host.localization = this.host.settings.localization;
    for (const method of ['setupWeather', 'setupSunrise', 'setupRain', 'setupEvents', 'setupReminders', 'setupLocation'] as const) {
      const original: () => Promise<void | boolean> = host[method];
      // The only boolean-returning loader is location; other loaders ignore that return value.
      Object.defineProperty(this.host, method, {
        value: () => this.get(`builtin:${method}`, () => Promise.resolve(original.call(this.host))),
      });
    }
  }

  get<T>(key: string, load: () => Promise<T>): Promise<T> {
    let pending = this.values.get(key);
    if (!pending) {
      pending = Promise.resolve().then(load);
      this.values.set(key, pending);
    }
    return pending as Promise<T>;
  }
}
