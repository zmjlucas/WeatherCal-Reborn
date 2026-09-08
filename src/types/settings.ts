/** Persisted numeric inputs retain legacy numbers as well as text, including zero. */
export type NumericSetting = string | number;
export interface PaddingSettings { top: NumericSetting; left: NumericSetting; bottom: NumericSetting; right: NumericSetting }
export interface FontFormat { size: NumericSetting; color: string; dark: string; font: string; caps: string }
export interface CalendarReference { identifier: string; title?: string }
export type CalendarSelection = string | (string | CalendarReference)[];
export type GetCalendars = (forReminders?: boolean) => Promise<Calendar[]>;

export interface WidgetSettings {
  locale: string;
  units: string;
  preview: string;
  padding: NumericSetting;
  widgetPadding: PaddingSettings;
  tintIcons: string;
  updateLocation: NumericSetting;
  instantDark: boolean;
}

export interface LocalizationSettings {
  morningGreeting: string;
  afternoonGreeting: string;
  eveningGreeting: string;
  nightGreeting: string;
  nextHourLabel: string;
  tomorrowLabel: string;
  noEventMessage: string;
  noRemindersMessage: string;
  durationMinute: string;
  durationHour: string;
  covid: string;
  week: string;
}

export interface FontSettings {
  defaultText: FontFormat;
  smallDate: FontFormat;
  largeDate1: FontFormat;
  largeDate2: FontFormat;
  greeting: FontFormat;
  eventLabel: FontFormat;
  eventTitle: FontFormat;
  eventLocation: FontFormat;
  eventTime: FontFormat;
  noEvents: FontFormat;
  reminderTitle: FontFormat;
  reminderTime: FontFormat;
  noReminders: FontFormat;
  newsTitle: FontFormat;
  newsDate: FontFormat;
  largeTemp: FontFormat;
  smallTemp: FontFormat;
  tinyTemp: FontFormat;
  customText: FontFormat;
  battery: FontFormat;
  sunrise: FontFormat;
  covid: FontFormat;
  week: FontFormat;
}

export interface DateSettings {
  dynamicDateSize: boolean;
  staticDateSize: string;
  smallDateFormat: string;
  largeDateLineOne: string;
  largeDateLineTwo: string;
  url: string;
}

export interface EventsSettings {
  numberOfEvents: NumericSetting;
  minutesAfter: NumericSetting;
  showAllDay: boolean;
  numberOfDays: NumericSetting;
  labelFormat: string;
  showTomorrow: NumericSetting | boolean;
  showEventLength: string;
  showLocation: boolean;
  selectCalendars: CalendarSelection;
  showCalendarColor: string;
  noEventBehavior: string;
  url: string;
}

export interface RemindersSettings {
  numberOfReminders: NumericSetting;
  useRelativeDueDate: boolean;
  showWithoutDueDate: boolean;
  showOverdue: boolean;
  overdueColor: string;
  todayOnly: boolean;
  selectLists: CalendarSelection;
  showListColor: string;
  noRemindersBehavior: string;
  url: string;
}

export interface SunriseSettings {
  showWithin: NumericSetting;
  separateElements: boolean;
}

export interface WeatherSettings {
  locale: string;
  showLocation: boolean;
  horizontalCondition: boolean;
  showCondition: boolean;
  showHighLow: boolean;
  showRain: boolean;
  tomorrowShownAtHour: NumericSetting;
  spacing: NumericSetting;
  horizontalHours: boolean;
  showHours: NumericSetting;
  showHoursFormat: string;
  horizontalForecast: boolean;
  showDays: NumericSetting;
  showDaysFormat: string;
  showToday: boolean;
  urlCurrent: string;
  urlFuture: string;
  urlForecast: string;
}

export interface CovidSettings {
  country: string;
  apiUrl: string;
  url: string;
}

export interface SymbolSettings {
  size: NumericSetting;
  padding: PaddingSettings;
  tintColor: string;
}

export interface NewsSettings {
  url: string;
  numberOfItems: NumericSetting;
  limitLineHeight: boolean;
  showDate: string;
  dateFormat: string;
}

export interface SettingsValues {
  widget: WidgetSettings;
  localization: LocalizationSettings;
  font: FontSettings;
  date: DateSettings;
  events: EventsSettings;
  reminders: RemindersSettings;
  sunrise: SunriseSettings;
  weather: WeatherSettings;
  covid: CovidSettings;
  symbol: SymbolSettings;
  news: NewsSettings;
}
export interface ParsedSettings extends SettingsValues { layout?: string }
export type Settings = ParsedSettings;

interface DescriptorMetadata { name: string; description?: string }
export interface TextDescriptor extends DescriptorMetadata { type?: undefined; val: string | number | boolean }
export interface EnumDescriptor extends DescriptorMetadata { type: 'enum'; val: string; options: string[] }
export interface BoolDescriptor extends DescriptorMetadata { type: 'bool'; val: boolean }
export interface FontDescriptor extends DescriptorMetadata { type: 'fonts'; val: FontFormat }
export interface PaddingDescriptor extends DescriptorMetadata { type: 'multival'; val: PaddingSettings }
export interface MultiselectDescriptor extends DescriptorMetadata { type: 'multiselect'; val: CalendarSelection; options: Calendar[] }
export type SettingDescriptor = TextDescriptor | EnumDescriptor | BoolDescriptor | FontDescriptor | PaddingDescriptor | MultiselectDescriptor;
export type EditingCategory<T> = { name: string } & { [K in keyof T]: SettingDescriptor & { val: T[K] } };
export type EditingSettings = { [K in keyof SettingsValues]: EditingCategory<SettingsValues[K]> };
export type EditableCategory = { name: string; [field: string]: string | SettingDescriptor };

/** This explicit projection makes schema completeness a compile-time invariant. */
export function settingsValues(schema: EditingSettings): ParsedSettings {
  return {
    widget: {
      locale: schema.widget.locale.val,
      units: schema.widget.units.val,
      preview: schema.widget.preview.val,
      padding: schema.widget.padding.val,
      widgetPadding: schema.widget.widgetPadding.val,
      tintIcons: schema.widget.tintIcons.val,
      updateLocation: schema.widget.updateLocation.val,
      instantDark: schema.widget.instantDark.val,
    },
    localization: {
      morningGreeting: schema.localization.morningGreeting.val,
      afternoonGreeting: schema.localization.afternoonGreeting.val,
      eveningGreeting: schema.localization.eveningGreeting.val,
      nightGreeting: schema.localization.nightGreeting.val,
      nextHourLabel: schema.localization.nextHourLabel.val,
      tomorrowLabel: schema.localization.tomorrowLabel.val,
      noEventMessage: schema.localization.noEventMessage.val,
      noRemindersMessage: schema.localization.noRemindersMessage.val,
      durationMinute: schema.localization.durationMinute.val,
      durationHour: schema.localization.durationHour.val,
      covid: schema.localization.covid.val,
      week: schema.localization.week.val,
    },
    font: {
      defaultText: schema.font.defaultText.val,
      smallDate: schema.font.smallDate.val,
      largeDate1: schema.font.largeDate1.val,
      largeDate2: schema.font.largeDate2.val,
      greeting: schema.font.greeting.val,
      eventLabel: schema.font.eventLabel.val,
      eventTitle: schema.font.eventTitle.val,
      eventLocation: schema.font.eventLocation.val,
      eventTime: schema.font.eventTime.val,
      noEvents: schema.font.noEvents.val,
      reminderTitle: schema.font.reminderTitle.val,
      reminderTime: schema.font.reminderTime.val,
      noReminders: schema.font.noReminders.val,
      newsTitle: schema.font.newsTitle.val,
      newsDate: schema.font.newsDate.val,
      largeTemp: schema.font.largeTemp.val,
      smallTemp: schema.font.smallTemp.val,
      tinyTemp: schema.font.tinyTemp.val,
      customText: schema.font.customText.val,
      battery: schema.font.battery.val,
      sunrise: schema.font.sunrise.val,
      covid: schema.font.covid.val,
      week: schema.font.week.val,
    },
    date: {
      dynamicDateSize: schema.date.dynamicDateSize.val,
      staticDateSize: schema.date.staticDateSize.val,
      smallDateFormat: schema.date.smallDateFormat.val,
      largeDateLineOne: schema.date.largeDateLineOne.val,
      largeDateLineTwo: schema.date.largeDateLineTwo.val,
      url: schema.date.url.val,
    },
    events: {
      numberOfEvents: schema.events.numberOfEvents.val,
      minutesAfter: schema.events.minutesAfter.val,
      showAllDay: schema.events.showAllDay.val,
      numberOfDays: schema.events.numberOfDays.val,
      labelFormat: schema.events.labelFormat.val,
      showTomorrow: schema.events.showTomorrow.val,
      showEventLength: schema.events.showEventLength.val,
      showLocation: schema.events.showLocation.val,
      selectCalendars: schema.events.selectCalendars.val,
      showCalendarColor: schema.events.showCalendarColor.val,
      noEventBehavior: schema.events.noEventBehavior.val,
      url: schema.events.url.val,
    },
    reminders: {
      numberOfReminders: schema.reminders.numberOfReminders.val,
      useRelativeDueDate: schema.reminders.useRelativeDueDate.val,
      showWithoutDueDate: schema.reminders.showWithoutDueDate.val,
      showOverdue: schema.reminders.showOverdue.val,
      overdueColor: schema.reminders.overdueColor.val,
      todayOnly: schema.reminders.todayOnly.val,
      selectLists: schema.reminders.selectLists.val,
      showListColor: schema.reminders.showListColor.val,
      noRemindersBehavior: schema.reminders.noRemindersBehavior.val,
      url: schema.reminders.url.val,
    },
    sunrise: {
      showWithin: schema.sunrise.showWithin.val,
      separateElements: schema.sunrise.separateElements.val,
    },
    weather: {
      locale: schema.weather.locale.val,
      showLocation: schema.weather.showLocation.val,
      horizontalCondition: schema.weather.horizontalCondition.val,
      showCondition: schema.weather.showCondition.val,
      showHighLow: schema.weather.showHighLow.val,
      showRain: schema.weather.showRain.val,
      tomorrowShownAtHour: schema.weather.tomorrowShownAtHour.val,
      spacing: schema.weather.spacing.val,
      horizontalHours: schema.weather.horizontalHours.val,
      showHours: schema.weather.showHours.val,
      showHoursFormat: schema.weather.showHoursFormat.val,
      horizontalForecast: schema.weather.horizontalForecast.val,
      showDays: schema.weather.showDays.val,
      showDaysFormat: schema.weather.showDaysFormat.val,
      showToday: schema.weather.showToday.val,
      urlCurrent: schema.weather.urlCurrent.val,
      urlFuture: schema.weather.urlFuture.val,
      urlForecast: schema.weather.urlForecast.val,
    },
    covid: {
      country: schema.covid.country.val,
      apiUrl: schema.covid.apiUrl.val,
      url: schema.covid.url.val,
    },
    symbol: {
      size: schema.symbol.size.val,
      padding: schema.symbol.padding.val,
      tintColor: schema.symbol.tintColor.val,
    },
    news: {
      url: schema.news.url.val,
      numberOfItems: schema.news.numberOfItems.val,
      limitLineHeight: schema.news.limitLineHeight.val,
      showDate: schema.news.showDate.val,
      dateFormat: schema.news.dateFormat.val,
    },
  };
}
