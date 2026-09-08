import type { WeatherCalContext } from '../types/context';
import type { WidgetContainer } from '../types/rendering';
// Licensed under MIT. See LICENSE.

export default {
  async executeItem(this: WeatherCalContext, item: string): Promise<void> {
    const match = item.trim().replace(/[.,]$/, '').match(/^([^\s(]+)(?:\(([\s\S]*)\))?$/);
    const functionName = match?.[1] ?? item;
    const parameter = match?.[2] ?? null;
    const customItem = this.custom?.[functionName];
    if (typeof customItem === "function" && this.custom) {
      await customItem.call(this.custom, this.layoutColumn, parameter);
      return;
    }
    // Row and column directives establish state before an item can consume it.
    if (functionName === 'row') { this.row(undefined, parameter); return; }
    if (functionName === 'column') { this.column(undefined, parameter); return; }
    if (functionName === 'left') { this.left(); return; }
    if (functionName === 'right') { this.right(); return; }
    if (functionName === 'center') { this.center(); return; }
    // Public extensions may add callable properties to this composed context.
    // Narrow at the dynamic lookup boundary before invoking an extension.
    const method: unknown = Reflect.get(this, functionName);
    if (typeof method === 'function') {
      await method.call(this, this.layoutColumn, parameter);
      return;
    }
    console.error('The ' + functionName + ' item in your layout is unavailable. Check for misspellings or other formatting issues. If you have any custom items, ensure they are set up correctly.');
  },

  async processASCIILine(this: WeatherCalContext, line: string): Promise<void> {
    if (line.startsWith('-') && line.endsWith('-')) {
      for (const col of this.currentColumns) {
        if (!col) continue;
        this.column(undefined, col.width);
        for (const item of col.items) await this.executeItem(item);
      }
      this.currentColumns = [];
      this.rowNeedsSetup = true;
      return;
    }
    if (this.rowNeedsSetup) {
      this.row();
      this.rowNeedsSetup = false;
    }
    const items = line.split('|');
    for (let index = 1; index < items.length - 1; index++) {
      const entry = this.currentColumns[index] ?? { items: [] };
      this.currentColumns[index] = entry;
      const column = entry.items;
      const rawItem = items[index];
      if (rawItem === undefined) continue;
      const trimmedItem = rawItem.trim().split('(')[0] ?? '';
      const method: unknown = Reflect.get(this, trimmedItem);
      if (!(method || this.custom?.[trimmedItem])) {
        if (/\s+\d+\s+/.test(rawItem)) {
          const value = parseInt(trimmedItem);
          if (value) entry.width = value;
          continue;
        }
        const previous = column[column.length - 1];
        if (trimmedItem === '' && (!previous || !previous.startsWith('space'))) {
          column.push('space');
          continue;
        }
      }
      const leading = rawItem.startsWith(' ');
      const trailing = rawItem.endsWith(' ');
      column.push(leading && trailing ? 'center' : trailing ? 'left' : 'right');
      column.push(rawItem.trim());
    }
  },

  row(this: WeatherCalContext, _input?: WidgetStack, parameter?: string | number | null): void {
    this.currentRow = this.widget.addStack();
    this.currentRow.layoutHorizontally();
    this.currentRow.setPadding(0, 0, 0, 0);
    if (parameter) this.currentRow.size = new Size(0, parseInt(String(parameter)));
  },
  column(this: WeatherCalContext, _input?: WidgetStack, parameter?: string | number | null): void {
    this.currentColumn = this.currentRow.addStack();
    this.currentColumn.layoutVertically();
    this.currentColumn.setPadding(0, 0, 0, 0);
    this.currentColumn.spacing = 0;
    if (parameter) this.currentColumn.size = new Size(parseInt(String(parameter)), 0);
  },
  space(this: WeatherCalContext, input: WidgetStack, parameter?: string | number | null): void {
    if (parameter) input.addSpacer(parseInt(String(parameter)));
    else input.addSpacer();
  },
  align(this: WeatherCalContext, column: WidgetContainer): WidgetStack {
    const alignmentStack = column.addStack();
    alignmentStack.layoutHorizontally();
    const result = this.currentAlignment(alignmentStack);
    result.layoutVertically();
    return result;
  },
  setAlignment(this: WeatherCalContext, left = false, right = false): void {
    this.currentAlignment = (alignmentStack: WidgetStack): WidgetStack => {
      if (right) alignmentStack.addSpacer();
      const result = alignmentStack.addStack();
      if (left) alignmentStack.addSpacer();
      return result;
    };
  },
  right(this: WeatherCalContext): void { this.setAlignment(false, true); },
  left(this: WeatherCalContext): void { this.setAlignment(true, false); },
  center(this: WeatherCalContext): void { this.setAlignment(true, true); },
};
