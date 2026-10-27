import { test, expect, vi } from 'vitest';
import { resolveViewport } from '#source/layout/viewport';

const screen = () => ({width:393,height:852});

test('empty or auto preferences select the family from screen points in either orientation', () => {
  const portrait = resolveViewport({}, {family:'medium'}, undefined, screen);
  const landscape = resolveViewport({medium:' AuTo '}, {}, 'medium', () => ({width:852,height:393}));
  expect(landscape).toEqual(portrait);
  expect(portrait.confidence).toBe('estimated');
  expect(portrait.source).toMatch(/auto:.*393x852.*medium/);
  expect(portrait.width).toBeLessThan(screen().width);
  const small = resolveViewport({small:' '}, {family:'small'}, null, screen);
  const large = resolveViewport({}, {family:'large'}, null, screen);
  expect(small.width).toBe(small.height);
  expect(portrait.height).toBe(small.height);
  expect(large.width).toBe(portrait.width);
  expect(large.height).toBeGreaterThan(portrait.height);
});

test('iPad canvas selection is stable across rotation and remains distinct from phone profiles', () => {
  const large = resolveViewport({}, {family:'large'}, null, () => ({width:1194,height:834}));
  const portrait = resolveViewport({}, {family:'large'}, null, () => ({width:834,height:1194}));
  expect(large).toEqual(portrait);
  expect(large.source).toContain('ipad-canvas');
  expect(large.width).toBe(large.height);
  expect(large.width).toBeLessThan(834);
});

test('manual and programmatic overrides bypass device APIs and keep precedence', () => {
  const unavailable = vi.fn(() => {throw new Error('No device API');});
  expect(resolveViewport({medium:'300 x 140'}, {family:'medium'}, null, unavailable)).toMatchObject({width:300,height:140,source:'preferences:medium'});
  expect(resolveViewport({medium:'invalid'}, {family:'medium',viewport:{width:280,height:130}}, null, unavailable)).toMatchObject({width:280,height:130,source:'explicit:medium'});
  expect(unavailable).not.toHaveBeenCalled();
  const read = vi.fn(screen);
  expect(() => resolveViewport({medium:'320xNaN'}, {family:'medium'}, null, read)).toThrow(expect.objectContaining({diagnostic:expect.objectContaining({code:'VIEWPORT_INVALID'})}));
  expect(() => resolveViewport({}, {family:'medium',viewport:{width:0,height:120}}, null, read)).toThrow(expect.objectContaining({diagnostic:expect.objectContaining({code:'VIEWPORT_INVALID'})}));
  expect(read).not.toHaveBeenCalled();
});

test('family validation precedes screen lookup and preview choices remain explicit', () => {
  const read = vi.fn(screen);
  for (const [options,actual,code] of [
    [{family:'small' as const},'large','FAMILY_CONFLICT'],
    [{},'accessoryInline','FAMILY_UNSUPPORTED'],
    [{},null,'FAMILY_UNSUPPORTED'],
  ] as const) expect(() => resolveViewport({}, options, actual, read)).toThrow(expect.objectContaining({diagnostic:expect.objectContaining({code})}));
  expect(read).not.toHaveBeenCalled();
  expect(resolveViewport({}, {family:'small'}, null, read).source).toContain('small');
  expect(read).toHaveBeenCalledOnce();
});

test('unknown, invalid and unavailable screens produce actionable diagnostics', () => {
  expect(() => resolveViewport({}, {family:'large'}, null, () => ({width:777,height:999}))).toThrow(/777 x 999.*large.*override/i);
  for (const read of [undefined, () => {throw Error('Offline device');}, () => ({width:NaN,height:800}), () => ({width:0,height:800})]) {
    expect(() => resolveViewport({}, {family:'large'}, null, read)).toThrow(expect.objectContaining({diagnostic:expect.objectContaining({code:'VIEWPORT_UNKNOWN'})}));
  }
  // Physical pixel dimensions must not accidentally select a point-size profile.
  expect(() => resolveViewport({}, {family:'medium'}, null, () => ({width:1179,height:2556}))).toThrow(/1179 x 2556/);
});
