import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createWeatherCal } from '#source/create';
import { descendants, inspect, installScriptable, mockImage } from './helpers/scriptable';
import { initializedContext } from './helpers/context';

for (const instantDark of [false, true]) {
  test(`text and icons with their own light color retain text dark inheritance, instantDark=${instantDark}`, async t => {
    const env = installScriptable(t, { dark: true });
    const host = await initializedContext(env);
    host.darkMode = true;
    host.settings.widget.instantDark = instantDark;
    host.format.defaultText.dark = 'abcdef';
    const stack = new env.Stack();
    for (const dark of [undefined, '']) {
      const format = { color: '123456', ...(dark === undefined ? {} : { dark }) };
      assert.equal(inspect(host.provideText('Hello', stack, format)).textColor.hex, 'abcdef');
      const icon = stack.addImage(mockImage({ symbol: 'sun.max' }));
      host.tintIcon(icon, format, true);
      assert.equal(inspect(icon).tintColor.hex, 'abcdef');
    }
  });
  for (const dark of [false, true]) {
    for (const omitted of [undefined, '']) {
      test(`backgrounds retain their light colors with dark=${dark}, instantDark=${instantDark}, omitted=${String(omitted)}`, async t => {
        const env = installScriptable(t, { dark });
        env.local.writeString('/library/weather-cal-preferences-Colors', JSON.stringify({
          widget: { instantDark }, font: { defaultText: { color: '123456', dark: 'ffffff' } },
        }));
        for (const background of [
          { type: 'color', color: '16296b', dark: omitted },
          { type: 'gradient', initialColor: '16296b', finalColor: 'aabbcc', initialDark: omitted, finalDark: omitted },
        ]) {
          env.local.writeString('/library/weather-cal-Colors', JSON.stringify(background));
          const widget = await createWeatherCal().createWidget('text("Hello")', 'Colors', false, undefined, { family: 'small', viewport: { width: 158, height: 158 } });
          const node = inspect(widget);
          assert.deepEqual(background.type === 'color' ? [node.backgroundColor.hex] : node.backgroundGradient.colors.map(color => color.hex),
            background.type === 'color' ? ['16296b'] : ['16296b', 'aabbcc']);
          assert.equal(descendants(widget).find(item => item.type === 'text')?.textColor.hex, dark ? 'ffffff' : '123456');
        }
      });
    }
    test(`explicit background dark colors apply with dark=${dark}, instantDark=${instantDark}`, async t => {
      const env = installScriptable(t, { dark });
      env.local.writeString('/library/weather-cal-preferences-Colors', JSON.stringify({ widget: { instantDark } }));
      for (const background of [
        { type: 'color', color: '16296b', dark: '010203' },
        { type: 'gradient', initialColor: '16296b', finalColor: 'aabbcc', initialDark: '010203', finalDark: '040506' },
      ]) {
        env.local.writeString('/library/weather-cal-Colors', JSON.stringify(background));
        const node = inspect(await createWeatherCal().createWidget('text("Hello")', 'Colors', false, undefined, { family: 'small', viewport: { width: 158, height: 158 } }));
        assert.deepEqual(background.type === 'color' ? [node.backgroundColor.hex] : node.backgroundGradient.colors.map(color => color.hex),
          background.type === 'color' ? [dark ? '010203' : '16296b'] : (dark ? ['010203', '040506'] : ['16296b', 'aabbcc']));
      }
    });
  }
}
