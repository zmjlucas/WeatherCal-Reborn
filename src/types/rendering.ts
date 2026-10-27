import type { ItemModule } from '../layout/types';
import type { ParsedSettings, FontSettings, FontFormat } from './settings';

/** A Scriptable container accepted by public render helpers and custom items. */
export type WidgetContainer = WidgetStack | ListWidget;
/** Runtime font inheritance used by prepared content helpers. */
export type RuntimeFontSettings = { defaultText: FontFormat } & Partial<{
  [K in Exclude<keyof FontSettings, 'defaultText'>]: Partial<FontFormat>;
}>;
export type RuntimeSettings = Omit<ParsedSettings, 'font'> & { font: RuntimeFontSettings };
export type LayoutInput = string;
export interface CustomItems {
  items?: Record<string, ItemModule>;
  /** Apply background styling only; content is owned by the layout engine. */
  background?: (widget: ListWidget) => void | Promise<void>;
}
export interface GradientSettings {
  color(): Color[];
  position(): number[];
}
export interface ColorFormat {
  color?: string | undefined;
  dark?: string | undefined;
}
