import { finiteNumber, isRecord, record } from '../types/json';
import { settingsValues } from '../types/settings';
import type { WeatherCalContext } from '../types/context';
import type { CalendarReference, EditableCategory, EditingSettings, ParsedSettings } from '../types/settings';

const numericFields = new Set(['padding', 'updateLocation', 'numberOfEvents', 'minutesAfter', 'numberOfDays', 'showTomorrow', 'numberOfReminders', 'showWithin', 'tomorrowShownAtHour', 'spacing', 'showHours', 'showDays', 'size', 'numberOfItems']);

function isCalendarSelection(value: unknown): value is (string | CalendarReference)[] {
  return Array.isArray(value) && value.every((item: unknown) => typeof item === 'string' || (isRecord(item) && typeof item.identifier === 'string' && (item.title === undefined || typeof item.title === 'string')));
}

/** Overlay values only after checking the descriptor's own domain. Null/missing
 * fields retain current defaults; false, zero and empty text remain explicit. */
function overlayCategory(category: EditableCategory, stored: unknown): void {
  const values = record(stored);
  for (const [key, descriptor] of Object.entries(category)) {
    if (typeof descriptor === 'string') continue;
    const saved = values[key];
    if (saved === undefined || saved === null) continue;
    switch (descriptor.type) {
      case 'bool':
        if (typeof saved === 'boolean') descriptor.val = saved;
        break;
      case 'enum':
        if (typeof saved === 'string') descriptor.val = saved;
        break;
      case 'fonts': {
        const source = record(saved);
        if (typeof source.size === 'string' || finiteNumber(source.size)) descriptor.val.size = source.size;
        for (const field of ['color', 'dark', 'font', 'caps'] as const) {
          const value = source[field];
          if (typeof value === 'string') descriptor.val[field] = value;
        }
        break;
      }
      case 'multival': {
        const source = record(saved);
        for (const field of ['top', 'left', 'bottom', 'right'] as const) {
          const value = source[field];
          if (typeof value === 'string' || finiteNumber(value)) descriptor.val[field] = value;
        }
        break;
      }
      case 'multiselect':
        if (typeof saved === 'string' || isCalendarSelection(saved)) descriptor.val = saved;
        break;
      default:
        if (typeof saved === 'string' || (numericFields.has(key) && finiteNumber(saved)) || (key === 'showTomorrow' && typeof saved === 'boolean')) descriptor.val = saved;
    }
  }
}

function getSettings(this: WeatherCalContext, forEditing: true): Promise<EditingSettings>;
function getSettings(this: WeatherCalContext, forEditing?: false): Promise<ParsedSettings>;
function getSettings(this: WeatherCalContext, forEditing: boolean): Promise<EditingSettings | ParsedSettings>;
async function getSettings(this: WeatherCalContext, forEditing = false): Promise<EditingSettings | ParsedSettings> {
  let stored: unknown;
  try { stored = JSON.parse(this.fm.readString(this.prefPath)); } catch { stored = {}; }
  const values = record(stored);
  const schema = await this.defaultSettings(forEditing);
  for (const [category, fields] of Object.entries(schema)) overlayCategory(fields, values[category]);
  return forEditing ? schema : settingsValues(schema);
}

export default {
  getSettings,
  previewValue(this: WeatherCalContext): 'small' | 'medium' | 'large' {
    try {
      const parsed: unknown = JSON.parse(this.fm.readString(this.prefPath));
      const size = record(record(parsed).widget).preview;
      if (size === 'small' || size === 'medium' || size === 'large') return size;
    } catch { /* Missing or damaged preferences use the default preview. */ }
    return 'large';
  }
};
