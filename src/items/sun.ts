import type { WeatherCalContext } from '../types/context';

// The named item always selects its own event; after sunset, sunrise uses tomorrow.
async function renderSun(context: WeatherCalContext, column: WidgetStack, sunset: boolean): Promise<void> {
  if (!context.data.sun) await context.setupSunrise();
  const sun = context.data.sun;
  if (!sun) throw new Error('Sunrise setup did not provide sun data.');
  const time = sunset ? sun.sunset : context.now.getTime() > (sun.sunset ?? Infinity) ? sun.tomorrow : sun.sunrise;
  const stack = context.align(column);
  stack.setPadding(context.padding / 2, context.padding, context.padding / 2, context.padding);
  stack.layoutHorizontally();
  stack.centerAlignContent();
  stack.addSpacer(context.padding * 0.3);
  const symbol = stack.addImage(SFSymbol.named(sunset ? 'sunset.fill' : 'sunrise.fill').image);
  symbol.imageSize = new Size(22, 22);
  context.tintIcon(symbol, context.format.sunrise);
  stack.addSpacer(context.padding);
  context.provideText(time == null ? '--' : context.formatTime(new Date(time)), stack, context.format.sunrise);
}

export default {
  async sunrise(this: WeatherCalContext, column: WidgetStack): Promise<void> { await renderSun(this, column, false); },
  async sunset(this: WeatherCalContext, column: WidgetStack): Promise<void> { await renderSun(this, column, true); },
};
