import items from '../index';
import type { WeatherCalContext } from '../../types/context';
import type { PreparedItem, Value } from '../../layout/types';
import { intrinsic, measurePresentation, renderPresentation } from './geometry';
import { recordingContext } from './recording';
import { scalePresentation } from './typography';
import type { PresentationNode } from './recording';

export const builtinNames = Object.keys(items) as Array<keyof typeof items>;

export async function prepareBuiltin(name: keyof typeof items, host: WeatherCalContext, options: Readonly<Record<string, Value>>): Promise<PreparedItem> {
  const orientations = name === 'current' ? ['inline', 'stacked']
    : ['forecast', 'daily', 'hourly'].includes(name) ? ['horizontal', 'vertical'] : ['normal'];
  const trees = new Map<string, PresentationNode>();
  const effects: PreparedItem['effects'] = {};
  let state: PreparedItem['state'] = 'ready';
  for (const [index, orientation] of orientations.entries()) {
    const recording = recordingContext(host);
    const { context, root } = recording;
    const chinese = (context.settings.weather.locale || context.locale).startsWith('zh');
    const messages: Record<string, string> = chinese ? {
      events: '暂无日程', reminders: '暂无提醒事项', sunrise: '日出时间暂不可用', sunset: '日落时间暂不可用',
      weather: '天气暂不可用', forecast: '暂无天气预报', text: '未设置文本', symbol: '图标暂不可用',
    } : {
      events: 'No upcoming events', reminders: 'No reminders', sunrise: 'Sunrise unavailable', sunset: 'Sunset unavailable',
      weather: 'Weather unavailable', forecast: 'No forecast available', text: 'No text configured', symbol: 'Symbol unavailable',
    };
    // Explicit empty states remain visible even when a configured message is blank.
    context.localization.noEventMessage ||= messages.events!;
    context.localization.noRemindersMessage ||= messages.reminders!;
    let fallback: string | undefined;
    try {
      const stack = root as unknown as WidgetStack;
      if (name === 'text') items.text.call(context, stack, String(options.text ?? ''));
      else if (name === 'symbol') items.symbol.call(context, stack, String(options.name ?? ''));
      else if (name === 'current') await items.current.call(context, stack, orientation === 'inline');
      else if (name === 'forecast' || name === 'daily' || name === 'hourly') await items.forecast.call(context, stack, name === 'hourly', orientation === 'horizontal');
      else {
        const render: (this: WeatherCalContext, target: WidgetStack) => void | Promise<void | WidgetText> = items[name];
        await render.call(context, stack);
      }
      if (name === 'events' && !context.data.events?.length) state = 'empty';
      if (name === 'reminders' && !context.data.reminders?.length) state = 'empty';
      if (name === 'rain') {
        if (context.settings.weather.provider === 'openweather' || !context.data.rain?.forecast?.summary || !context.data.rain?.outlook) state = 'error';
        else if (context.data.rain.outlook.state === 'clear') state = 'empty';
      }
      if (name === 'sunrise' || name === 'sunset') {
        const sun = context.data.sun;
        const available = name === 'sunset' ? sun?.sunset : context.now.getTime() > (sun?.sunset ?? Infinity) ? sun?.tomorrow : sun?.sunrise;
        if (available == null) { state = 'empty'; fallback = messages[name]; }
      }
      if (['current', 'future', 'forecast', 'daily', 'hourly'].includes(name)) {
        if (context.data.weatherError) { state = 'error'; fallback = messages.weather; }
        else if (name === 'current' && context.data.weather?.currentTemp == null) { state = 'error'; fallback = messages.weather; }
        else if (name !== 'current') {
          const weather = context.data.weather!;
          const hourly = name === 'hourly' || name === 'future' && context.now.getHours() < Number(context.settings.weather.tomorrowShownAtHour);
          const start = name === 'future' ? 1 : hourly || context.settings.weather.showToday ? 0 : 1;
          const count = name === 'future' ? 1 : Number(hourly ? context.settings.weather.showHours : context.settings.weather.showDays);
          const available = hourly
            ? weather.hourly.slice(start, start + count).some(hour => hour.Temp !== null || hour.Condition !== 100)
            : weather.forecast.slice(start, start + count).some(day => day.High !== null || day.Low !== null || day.Condition !== 100);
          const rain = name === 'future' && context.settings.weather.showRain && (hourly ? weather.nextHourRain != null :
            weather.tomorrowRain != null || weather.tomorrowRainByPeriod?.daytime != null || weather.tomorrowRainByPeriod?.nighttime != null);
          if (!available && !rain) { state = 'empty'; fallback = messages.forecast; }
        }
      }
    } catch {
      state = 'error';
      fallback = ['current', 'future', 'forecast', 'daily', 'hourly'].includes(name) ? messages.weather : messages[name] || `${name} unavailable`;
    }
    const pending = [...root.children];
    let visible = false;
    while (pending.length) {
      const node = pending.pop()!;
      if (node.kind === 'text' && node.text || node.kind === 'image') visible = true;
      pending.push(...node.children);
    }
    if (!visible && !fallback) {
      state = 'empty'; fallback = messages[name] || (['daily', 'hourly'].includes(name) ? messages.forecast : `${name} unavailable`);
    }
    if (fallback) {
      root.children.length = 0;
      context.provideText(fallback, root as unknown as WidgetStack, context.format.smallTemp, true);
    }
    if (root.refreshAfterDate && (!effects.refreshAfterDate || root.refreshAfterDate < effects.refreshAfterDate)) effects.refreshAfterDate = new Date(root.refreshAfterDate.getTime());
    recording.finish();
    trees.set(orientation, root);
  }
  const snapshots = new Map<number, PreparedItem>();
  function atFontScale(scale: number): PreparedItem {
    if (!Number.isFinite(scale) || scale < 0.7 || scale > 1) throw new Error('Font scale must be between 0.7 and 1.');
    const cached = snapshots.get(scale);
    if (cached) return cached;
    const selected = scale === 1 ? trees : new Map([...trees].map(([id, root]) => [id, scalePresentation(root, scale)]));
    const variants = [...selected].map(([id, root], index) => {
      const size = intrinsic(root);
      return Object.freeze({
        id, minWidth: size.min, preferredWidth: Math.max(size.min, Math.min(360, size.preferred)), adaptationCost: index,
        measure(width: number) {
          const requiredHeight = measurePresentation(root, width);
          return { requiredHeight, preferredHeight: requiredHeight, confidence: 'estimated' as const };
        },
      });
    });
    const prepared: PreparedItem = Object.freeze({ state, variants: Object.freeze(variants), effects: Object.freeze(effects), atFontScale,
      render(container, placement) {
        const tree = selected.get(placement.variant);
        if (!tree) throw new Error(`Unknown prepared variant: ${placement.variant}`);
        renderPresentation(tree, container, placement);
      },
    } satisfies PreparedItem);
    snapshots.set(scale, prepared);
    return prepared;
  }
  return atFontScale(1);
}
