import { test, expect } from 'vitest';
import { installScriptable, texts, inspect, mockColor } from './helpers/scriptable';
import { createWeatherCal as create } from '#source/create';
import type { ItemModule, WidgetLayoutOptions } from '#source/layout/types';

const options: WidgetLayoutOptions = {family: 'large', viewport:{width:320,height:340}};
function label(value: string): ItemModule {
  return { async prepare() { return { state:'ready', effects:{}, variants:[{id:'normal',minWidth:40,preferredWidth:80,adaptationCost:0,measure:()=>({requiredHeight:20,preferredHeight:20,confidence:'estimated'})}], render(stack) {stack.addText(value);} }; } };
}

test('semi-auto renders every prepared custom instance exactly once with local text alignment', async t => {
  installScriptable(t);
  const received: string[] = [];
  const module = label('same');
  const prepare = module.prepare;
  let preparations = 0;
  module.prepare = async (context, props) => {
    preparations++;
    const item = await prepare(context, props);
    return {...item, render(stack, placement) { received.push(placement.id + ':' + placement.textAlign); item.render(stack,placement); }};
  };
  const widget = await create().createWidget('row(gap: 8)[column(width: 80, textAlign: "end")[value],auto[value,value]]', 'A', false, {items:{value:module}}, options);
  expect(texts(widget)).toEqual(['same','same','same']);
  expect(preparations).toBe(3);
  expect(received).toEqual(['0.0.0:end','0.1.0:start','0.1.1:start']);
});

test('creation resets paths, prepared data and customization between runs', async t => {
  const env = installScriptable(t);
  const code = create();
  await code.createWidget('value', 'Old', false, {items:{value:label('old')}}, options);
  code.data.location = {locality:'Old marker'};
  env.cloud.writeString('/library/weather-cal-New', '{"type":"color","color":"abc123"}');
  const widget = inspect(await code.createWidget('text("new")', 'New', true, undefined, options));
  expect(texts(widget)).toEqual(['new']);
  expect(code.data.location).toBeUndefined();
  expect(code.custom).toBeUndefined();
  expect(code.fm).toBe(env.cloud);
  expect(code.prefPath).toBe('/library/weather-cal-preferences-New');
  expect(widget.backgroundColor.hex).toBe('abc123');
});

test('custom backgrounds and iCloud image backgrounds survive native layout', async t => {
  const env = installScriptable(t, {iCloud:true,dark:true});
  const code = create();
  const widget = inspect(await code.createWidget('text("Custom")', 'Custom', true, {background(widget) {widget.backgroundColor = mockColor('ff0000');}}, options));
  expect(widget.backgroundColor.hex).toBe('ff0000');
  env.cloud.writeString('/library/weather-cal-Image', '{"type":"image","dark":true}');
  env.cloud.writeImage('/documents/Weather Cal/Image (Dark).jpg', {fixture:'dark'});
  const image = inspect(await code.createWidget('text("Image")', 'Image', true, undefined, options));
  expect(image.backgroundImage).toEqual({fixture:'dark'});
  expect(env.downloads).toContain('/documents/Weather Cal/Image (Dark).jpg');
});

test('automatic and custom gradients retain their color stops', async t => {
  const env = installScriptable(t);
  const code = create();
  env.local.writeString('/library/weather-cal-Gradient', '{"type":"gradient","initialColor":"111111","finalColor":"222222"}');
  const custom = inspect(await code.createWidget('text("Gradient")','Gradient',false,undefined,options));
  expect(custom.backgroundGradient.colors.map(x=>x.hex)).toEqual(['111111','222222']);
  env.local.writeString('/library/weather-cal-Auto','{"type":"auto"}');
  code.setupGradient = async () => ({color:()=>[mockColor('000000'),mockColor('888888')],position:()=>[0,1]});
  const automatic = inspect(await code.createWidget('text("Auto")','Auto',false,undefined,options));
  expect(automatic.backgroundGradient.locations).toEqual([0,1]);
});

test('layout diagnostics occur before data requests and no partial content is rendered on fit failure', async t => {
  const env = installScriptable(t);
  const code = create();
  let prepared = 0;
  const module = label('content');
  const prepare = module.prepare;
  module.prepare = async (...args) => {prepared++; return prepare(...args);};
  const unknown = await code.createWidget('auto[value, typo]', 'Unknown', false, {items:{value:module}}, options);
  expect(texts(unknown).join(' ')).toContain('UNKNOWN_ITEM');
  expect(prepared).toBe(0);
  expect(env.requests).toEqual([]);
  env.globals.Device.screenSize = () => ({width:777,height:999});
  const unsupported = await code.createWidget('current', 'Unsupported', false, undefined, {family:'large'});
  expect(texts(unsupported).join(' ')).toContain('VIEWPORT_UNKNOWN');
  expect(env.requests).toEqual([]);
  const noFit = await code.createWidget('column[value,value]', 'Small', false, {items:{value:module}}, {family:'small',viewport:{width:50,height:25}});
  expect(texts(noFit).join(' ')).toContain('NO_CANDIDATE_FITS');
  expect(texts(noFit)).not.toContain('content');
});

test('widget creation detects the active family and manual overrides bypass device access', async t => {
  const env = installScriptable(t);
  env.globals.config.widgetFamily = 'medium';
  const code = create();
  const automatic = inspect(await code.createWidget('text("Automatic")', 'Automatic', false));
  expect(texts(automatic)).toEqual(['Automatic']);
  expect(automatic.children[0]?.size).toMatchObject({width:338,height:158});
  env.globals.Device.screenSize = () => { throw new Error('Device unavailable'); };
  env.local.writeString('/library/weather-cal-preferences-Manual', JSON.stringify({widget:{mediumViewport:'310 x 150'}}));
  const manual = inspect(await code.createWidget('text("Manual")', 'Manual', false));
  expect(texts(manual)).toEqual(['Manual']);
  expect(manual.children[0]?.size).toMatchObject({width:310,height:150});
});

test('automatic background and selected sun items share one data load per creation', async t => {
  const env = installScriptable(t);
  const code = create();
  env.local.writeString('/library/weather-cal-Sun', '{"type":"auto"}');
  let loads = 0;
  code.setupSunrise = async function() { loads++; this.data.sun = {sunrise:0,sunset:1,tomorrow:2}; };
  const widget = await code.createWidget('auto[sunrise,sunset]', 'Sun', false, undefined, options);
  expect(texts(widget).join(' ')).not.toContain('LAYOUT_FAILED');
  expect(loads).toBe(1);
});
