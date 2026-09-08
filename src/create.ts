// All public methods retain their original `this` context for custom widget code.
import widget from './widget';
import layout from './layout/engine';
import formatting from './core/formatting';
import drawing from './core/drawing';
import gradient from './core/gradient';
import prompts from './core/prompts';
import storage from './core/storage';
import defaults from './preferences/defaults';
import store from './preferences/store';
import editor from './preferences/editor';
import cache from './data/cache';
import agenda from './data/agenda';
import location from './data/location';
import weather from './data/weather';
import feeds from './data/feeds';
import items from './items/index';
import menu from './setup/menu';
import onboarding from './setup/onboarding';
import backgrounds from './setup/backgrounds';
import distribution from './setup/distribution';
import { WidgetState } from './types/context';
import type { WeatherCalContext } from './types/context';

export function createWeatherCal(): WeatherCalContext {
  return Object.assign(new WidgetState(), {
    ...widget, ...layout, ...formatting, ...drawing, ...gradient, ...prompts, ...storage,
    ...defaults, ...store, ...editor, ...cache, ...agenda, ...location, ...weather,
    ...feeds, ...items, ...menu, ...onboarding, ...backgrounds, ...distribution,
    // Clone mutable enum groups per instance without a JSON or assertion boundary.
    enum: { caps: { ...defaults.enum.caps }, icons: { ...defaults.enum.icons } },
  });
}
