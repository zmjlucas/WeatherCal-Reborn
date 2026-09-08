import type { ParsedSettings, FontSettings, FontFormat } from './settings';

/** A Scriptable container accepted by public render helpers and custom items. */
export type WidgetContainer = WidgetStack | ListWidget;
/** Layouts may retain the historical object form, including parsed preferences. */
export type RuntimeFontSettings = { defaultText: FontFormat } & Partial<{
  [K in Exclude<keyof FontSettings, 'defaultText'>]: Partial<FontFormat>;
}>;
export type RuntimeSettings = Omit<ParsedSettings, 'font'> & { font: RuntimeFontSettings };
export type LayoutInput = string | RuntimeSettings;
/** Methods keep the custom object as `this`, matching existing user extensions. */
export type CustomRenderer = {
  render(this: CustomItems, container: WidgetContainer, parameter?: string | null): unknown;
}['render'];
export interface CustomItems {
  [name: string]: unknown;
  background?: CustomRenderer;
}
export interface ASCIIColumn {
  width?: number;
  items: string[];
}
export interface GradientSettings {
  color(): Color[];
  position(): number[];
}
export interface ColorFormat {
  color?: string | undefined;
  dark?: string | undefined;
}
