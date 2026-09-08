// Preference descriptors are rebuilt per call so editors never mutate shared defaults.
import locales from '../core/locales';
import widget from './schema/widget';
import localization from './schema/localization';
import font from './schema/font';
import date from './schema/date';
import events from './schema/events';
import reminders from './schema/reminders';
import sunrise from './schema/sunrise';
import weather from './schema/weather';
import covid from './schema/covid';
import symbol from './schema/symbol';
import news from './schema/news';
import type { WeatherCalContext } from '../types/context';
import type { EditingSettings } from '../types/settings';

export default {
  ...locales,
  enum: {
    caps: { upper: 'ALL CAPS', lower: 'all lowercase', title: 'Title Case', none: 'None (Default)' },
    icons: { never: 'Never', always: 'Always', dark: 'In dark mode', light: 'In light mode' }
  },
  async defaultSettings(this: WeatherCalContext, forEditing = true): Promise<EditingSettings> {
    async function getFromCalendar(forReminders = false): Promise<Calendar[]> {
      if (!forEditing) return [];
      try { return await (forReminders ? Calendar.forReminders() : Calendar.forEvents()); }
      catch { return []; }
    }
    return {
      ...await widget.call(this, getFromCalendar),
      ...await localization.call(this, getFromCalendar),
      ...await font.call(this, getFromCalendar),
      ...await date.call(this, getFromCalendar),
      ...await events.call(this, getFromCalendar),
      ...await reminders.call(this, getFromCalendar),
      ...await sunrise.call(this, getFromCalendar),
      ...await weather.call(this, getFromCalendar),
      ...await covid.call(this, getFromCalendar),
      ...await symbol.call(this, getFromCalendar),
      ...await news.call(this, getFromCalendar)
    };
  }
};
