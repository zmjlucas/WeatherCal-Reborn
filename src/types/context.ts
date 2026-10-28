import type { WidgetLayoutOptions } from '../layout/types';
import type { ParsedSettings, LocalizationSettings, FontFormat, EditingSettings, EditableCategory, CalendarReference } from './settings';
import type { WidgetData, WeatherData, SunData, WeatherResponse } from './data';
import type { CustomItems, LayoutInput, WidgetContainer, ColorFormat, GradientSettings, RuntimeSettings, RuntimeFontSettings } from './rendering';

export type { CustomItems, LayoutInput } from './rendering';
type PromptValue = string | number | boolean | null | undefined;
export type PreviewSize = 'small' | 'medium' | 'large';

/** Each factory owns its state. Accessors report use before initialization explicitly. */
export class WidgetState {
  name = '';
  bgPath = '';
  prefPath = '';
  widgetUrl = '';
  now = new Date();
  data: WidgetData = {};
  initialized = false;
  locale = '';
  padding = 0;
  darkMode = false;
  custom: CustomItems | undefined;
  private fileManager: FileManager | undefined;
  private parsedSettings: RuntimeSettings | undefined;
  private listWidget: ListWidget | undefined;
  private textFormats: RuntimeFontSettings | undefined;
  private localizedText: LocalizationSettings | undefined;

  get fm(): FileManager {
    if (!this.fileManager) throw new Error('Initialize the widget before accessing files.');
    return this.fileManager;
  }
  set fm(value: FileManager) { this.fileManager = value; }
  get hasSettings(): boolean { return this.parsedSettings !== undefined; }
  get settings(): RuntimeSettings {
    if (!this.parsedSettings) throw new Error('Load widget preferences before rendering.');
    return this.parsedSettings;
  }
  set settings(value: RuntimeSettings) { this.parsedSettings = value; }
  get widget(): ListWidget {
    if (!this.listWidget) throw new Error('Create a widget before rendering items.');
    return this.listWidget;
  }
  set widget(value: ListWidget) { this.listWidget = value; }
  get format(): RuntimeFontSettings {
    if (!this.textFormats) throw new Error('Load font preferences before rendering.');
    return this.textFormats;
  }
  set format(value: RuntimeFontSettings) { this.textFormats = value; }
  get localization(): LocalizationSettings {
    if (!this.localizedText) throw new Error('Load localization before rendering.');
    return this.localizedText;
  }
  set localization(value: LocalizationSettings) { this.localizedText = value; }
}

export interface WeatherCalContext extends WidgetState {
  enum: { caps: { upper: string; lower: string; title: string; none: string }; icons: { never: string; always: string; dark: string; light: string } };
  initialize(name: string, iCloudInUse: boolean): void;
  createWidget(layout: LayoutInput, name: string, iCloudInUse: boolean, custom?: CustomItems, options?: WidgetLayoutOptions): Promise<ListWidget>;
  align(column: WidgetContainer): WidgetStack;
  displayNumber(number: number | null | undefined, dummy?: string): string;
  tintIcon(icon: WidgetImage, format?: ColorFormat | null, force?: boolean): void;
  isNight(dateInput: Date): boolean;
  dateDiff(first: Date, second: Date): number;
  formatTime(date: Date): string;
  formatDatetime(date: Date): string;
  formatDate(date: Date, format?: string | null, showDate?: boolean, showTime?: boolean): string;
  provideTextSymbol(shape: string): string;
  provideFont(fontName: string, fontSize: number): Font;
  provideText(text: unknown, stack: WidgetContainer, format?: Partial<FontFormat> | null, standardize?: boolean, url?: string): WidgetText;
  provideColor(format?: ColorFormat | null, alpha?: number): Color;
  provideBackgroundColor(format: { color: string; dark?: string | undefined }): Color;
  provideBatteryIcon(batteryLevel: number, charging?: boolean): Image;
  provideConditionSymbol(condition: number, night: boolean): Image;
  drawVerticalLine(color: Color, height: number): Image;
  provideTempBar(): Image;
  setupGradient(): Promise<GradientSettings>;
  generateAlert(title: string, options?: string[], message?: string): Promise<number>;
  promptForText(title: string, values: PromptValue[], keys?: string[], message?: string): Promise<Alert>;
  generatePrompt(title: string, message?: string | null, options?: string[] | null): Promise<number>;
  generatePrompt(title: string, message: string | null | undefined, options: string[] | null | undefined, textvals: PromptValue[], placeholders?: string[]): Promise<Alert>;
  writePreference(name: string | null, value: unknown, inputPath?: string | null): void;
  getCache(path: string, minAge?: number | null, maxAge?: number): Record<string, unknown> | null;
  getOpenWeatherLocaleCodes(): string[];
  defaultSettings(forEditing?: boolean): Promise<EditingSettings>;
  getSettings(forEditing: true): Promise<EditingSettings>;
  getSettings(forEditing?: false): Promise<ParsedSettings>;
  getSettings(forEditing: boolean): Promise<EditingSettings | ParsedSettings>;
  previewValue(): PreviewSize;
  loadPrefsTable(table: UITable, category: EditableCategory): Promise<void>;
  loadMultiTable(table: UITable, options: Set<CalendarReference & {color?: Color}>, selected: Set<string>): Promise<void>;
  editPreferences(): Promise<void>;
  getDataCachePath(prefix: string, identity: string): string;
  setupEvents(): Promise<void>;
  setupReminders(): Promise<void>;
  setupLocation(): Promise<boolean>;
  loadWeatherData(minAge: number, maxAge: number): Promise<{locale: string; response: WeatherResponse | null}>;
  setupWeather(): Promise<void>;
  setupSunrise(): Promise<void>;
  setupRain(): Promise<void>;
  selectWeatherProvider(firstRun?: boolean): Promise<boolean>;
  getWeatherApiPath(newApiKey: string): Promise<string | WeatherResponse | null>;
  getWeatherApiPath(): Promise<string>;
  date(column: WidgetStack): Promise<void>;
  events(column: WidgetStack): Promise<void | WidgetText>;
  reminders(column: WidgetStack): Promise<void | WidgetText>;
  current(column: WidgetStack, horizontal?: boolean): Promise<void>;
  future(column: WidgetStack): Promise<void>;
  rain(column: WidgetStack): Promise<void>;
  forecast(column: WidgetStack, hourly?: boolean, horizontal?: boolean): Promise<void>;
  daily(column: WidgetStack, horizontal?: boolean): Promise<void>;
  hourly(column: WidgetStack, horizontal?: boolean): Promise<void>;
  sunrise(column: WidgetStack): Promise<void>;
  sunset(column: WidgetStack): Promise<void>;
  greeting(column: WidgetStack): void;
  text(column: WidgetStack, input?: string | null): void;
  battery(column: WidgetStack): void;
  week(column: WidgetStack): void;
  symbol(column: WidgetStack, name?: string | null): void;
  runSetup(name: string, iCloudInUse: boolean, codeFilename?: string, gitHubUrl?: string): Promise<string | undefined>;
  editSettings(codeFilename?: string, gitHubUrl?: string): Promise<string | undefined>;
  initialSetup(imported?: boolean): Promise<string | undefined>;
  getWeatherKey(firstRun?: boolean): Promise<boolean>;
  setWidgetBackground(): Promise<string | undefined>;
  downloadCode(filename: string, url: string, reset?: boolean): Promise<boolean>;
  exportWidget(): Promise<string>;
}
