import { test, expect } from 'vitest';
import { descendants, texts } from './helpers/scriptable';
import { renderLayout } from '#source/layout/renderer';
import { rainContext } from './helpers/rain';
import { parseLayout } from '#source/layout/parser';
import { prepareItems } from '#source/items/registry';
import { planLayout } from '#source/layout/planner';
import { resolveViewport } from '#source/layout/viewport';

const weatherLayout = `auto(padding: 12, gap: 8)[
  current(textAlign: "start"),
  rain(textAlign: "end"),
  future(textAlign: "end")
]`;

test('small weather layout fits every selected item without exhausting search', async t => {
  const { service, Stack, requests } = await rainContext(t);
  service.padding = 5;
  service.data.location = {latitude:31.2345,longitude:121.4756,locality:'Shanghai'};
  service.data.sun = {sunrise:service.now.getTime()-3600000,sunset:service.now.getTime()+3600000,tomorrow:service.now.getTime()+86400000};
  service.data.weather = {
    currentTemp:24,currentCondition:800,currentDescription:'Clear',todayHigh:26,todayLow:19,nextHourRain:20,tomorrowRain:30,
    hourly:[{Temp:24,Condition:800},{Temp:25,Condition:801}],forecast:[{High:26,Low:19,Condition:800},{High:25,Low:18,Condition:801}],
  };
  const ast = parseLayout(weatherLayout);
  const items = await prepareItems(ast, service);
  for (const family of ['large','medium','small'] as const) {
    const viewport = resolveViewport({}, {family}, undefined, () => ({width:393,height:852}));
    const result = planLayout(ast, viewport, items);
    expect(result.ok, JSON.stringify(result.diagnostics)).toBe(true);
    if (!result.ok) continue;
    const target = new Stack();
    renderLayout(target, result.tree, items);
    const content = texts(target).join(' ');
    expect(content).toContain('24°');
    expect(content).toContain('Rain in 20 minutes');
    expect(content).toContain('25°');
    const temperature = descendants(target).find(node => node.text === '24°')!;
    expect(temperature.font.size).toBe(family === 'small' ? 34 * result.fontScale : 34);
    if (family === 'small') expect(result.fontScale).toBeLessThan(1);
    else expect(result.fontScale).toBe(1);
    expect(result.measurements).toBeLessThanOrEqual(4096);
    expect(result.candidates).toBeLessThanOrEqual(256);
  }
  expect(requests).toHaveLength(1);
});

test('impossible long multilingual content reports no fit without truncating its prepared text', async t => {
  const { service, Stack } = await rainContext(t);
  service.padding = 5;
  const message = '未来两小时持续降雨，请注意出行安全。 Long forecast text. '.repeat(40);
  const ast = parseLayout(`auto(padding:12)[text(${JSON.stringify(message)})]`);
  const items = await prepareItems(ast, service);
  const viewport = resolveViewport({}, {family:'small'}, undefined, () => ({width:393,height:852}));
  const result = planLayout(ast, viewport, items);
  expect(result.ok).toBe(false);
  expect(result.diagnostics[0]!.code).toBe('NO_CANDIDATE_FITS');
  const entry = items.get('0.0')!.atFontScale!(0.7);
  const variant = entry.variants[0]!;
  const target = new Stack();
  entry.render(target,{id:'0.0',variant:variant.id,width:134,height:variant.measure(134).requiredHeight,textAlign:'start'});
  expect(texts(target)).toEqual([message]);
  expect(descendants(target).find(n=>n.type === 'text')!.font.size).toBe(10);
});
