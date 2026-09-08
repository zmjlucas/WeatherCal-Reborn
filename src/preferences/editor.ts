// Licensed under MIT. See LICENSE.
import type { WeatherCalContext } from '../types/context';
import type { CalendarReference, EditableCategory } from '../types/settings';

export default {
  async loadPrefsTable(this: WeatherCalContext, table: UITable, category: EditableCategory): Promise<void> {
    table.removeAllRows();
    for (const [settingName, setting] of Object.entries(category)) {
      if (settingName === 'name' || typeof setting === 'string') continue;
      const row = new UITableRow();
      row.dismissOnSelect = false;
      row.height = 55;
      let valText = '';
      if (Array.isArray(setting.val)) {
        valText = setting.val.map(item => typeof item === 'string' ? item : item.title || '').join(', ');
      } else if (setting.type === 'fonts') {
        const item = setting.val;
        const size = String(item.size).length ? `size ${item.size}` : '';
        const font = item.font.length ? ` ${item.font}` : '';
        const color = item.color.length ? ` (${item.color}${item.dark.length ? '/' + item.dark : ''})` : '';
        const caps = item.caps.length && item.caps !== this.enum.caps.none ? ` - ${item.caps}` : '';
        valText = size + font + color + caps;
      } else if (typeof setting.val === 'object') {
        valText = Object.entries(setting.val).map(([key, value]) => key + ': ' + value).join(', ');
      } else {
        valText = String(setting.val);
      }
      const cell = row.addText(setting.name, valText);
      cell.subtitleColor = Color.gray();
      if (!setting.type) {
        row.onSelect = async () => {
          const result = await this.promptForText(setting.name, [String(setting.val)], [], setting.description);
          setting.val = result.textFieldValue(0).trim();
          await this.loadPrefsTable(table, category);
        };
      } else if (setting.type === 'enum') {
        row.onSelect = async () => {
          const choice = await this.generateAlert(setting.name, setting.options, setting.description);
          const value = setting.options[choice];
          if (value !== undefined) setting.val = value;
          await this.loadPrefsTable(table, category);
        };
      } else if (setting.type === 'bool') {
        row.onSelect = async () => {
          const choice = await this.generateAlert(setting.name, ['true', 'false'], setting.description);
          if (choice >= 0) setting.val = !choice;
          await this.loadPrefsTable(table, category);
        };
      } else if (setting.type === 'fonts') {
        row.onSelect = async () => {
          const keys = ['size', 'color', 'dark', 'font'] as const;
          const values = keys.map(key => String(setting.val[key]));
          const prompt = await this.generatePrompt(setting.name, setting.description, ['Capitalization', 'Save and Close'], values, [...keys]);
          const choice = await prompt.present();
          // Both actions accept the current fields before any second prompt.
          keys.forEach((key, index) => { setting.val[key] = prompt.textFieldValue(index).trim(); });
          if (!choice) {
            const options = [this.enum.caps.upper, this.enum.caps.lower, this.enum.caps.title, this.enum.caps.none];
            const capitalization = options[await this.generateAlert('Capitalization', options)];
            if (capitalization !== undefined) setting.val.caps = capitalization;
          }
          await this.loadPrefsTable(table, category);
        };
      } else if (setting.type === 'multival') {
        row.onSelect = async () => {
          const keys = ['top', 'left', 'bottom', 'right'] as const;
          const result = await this.promptForText(setting.name, keys.map(key => String(setting.val[key])), [...keys], setting.description);
          keys.forEach((key, index) => { setting.val[key] = result.textFieldValue(index).trim(); });
          await this.loadPrefsTable(table, category);
        };
      } else if (setting.type === 'multiselect') {
        row.onSelect = async () => {
          const options = new Set(setting.options);
          const selected = new Set(Array.isArray(setting.val) ? setting.val.map(item => typeof item === 'string' ? item : item.identifier) : []);
          const multiTable = new UITable();
          await this.loadMultiTable(multiTable, options, selected);
          await multiTable.present();
          setting.val = [...options].filter(option => selected.has(option.identifier));
          await this.loadPrefsTable(table, category);
        };
      }
      table.addRow(row);
    }
    table.reload();
  },

  async loadMultiTable(this: WeatherCalContext, table: UITable, options: Set<CalendarReference & { color?: Color }>, selected: Set<string>): Promise<void> {
    table.removeAllRows();
    for (const item of options) {
      const row = new UITableRow();
      row.dismissOnSelect = false;
      row.height = 55;
      const isSelected = selected.has(item.identifier);
      row.backgroundColor = isSelected ? Color.dynamic(new Color('d8d8de'), new Color('2c2c2c')) : Color.dynamic(Color.white(), new Color('151517'));
      if (item.color) {
        const colorCell = row.addText(isSelected ? '\u25CF' : '\u25CB');
        colorCell.titleColor = item.color;
        colorCell.widthWeight = 1;
      }
      const titleCell = row.addText(item.title || '');
      titleCell.widthWeight = 15;
      row.onSelect = async () => {
        if (isSelected) selected.delete(item.identifier);
        else selected.add(item.identifier);
        await this.loadMultiTable(table, options, selected);
      };
      table.addRow(row);
    }
    table.reload();
  },

  async editPreferences(this: WeatherCalContext): Promise<void> {
    const settings = await this.getSettings(true);
    const table = new UITable();
    table.showSeparators = true;
    for (const category of Object.values(settings)) {
      const row = new UITableRow();
      row.dismissOnSelect = false;
      row.addText(category.name);
      row.onSelect = async () => {
        const subTable = new UITable();
        subTable.showSeparators = true;
        await this.loadPrefsTable(subTable, category);
        await subTable.present();
      };
      table.addRow(row);
    }
    await table.present();
    const stored: Record<string, Record<string, unknown>> = {};
    for (const [key, source] of Object.entries(settings)) {
      const category: EditableCategory = source;
      const values: Record<string, unknown> = { name: category.name };
      for (const [field, descriptor] of Object.entries(category)) {
        if (typeof descriptor !== 'string') values[field] = descriptor.val;
      }
      stored[key] = values;
    }
    this.writePreference(null, stored, this.prefPath);
  }
};
