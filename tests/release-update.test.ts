import { test } from 'vitest';
import assert from 'node:assert/strict';
import { installScriptable } from './helpers/scriptable';
import { initializedContext } from './helpers/context';
import { scriptFixture } from './helpers/script-format';
import { splitScript } from '#source/setup/script-format';

const endpoint = 'https://api.github.com/repos/zmjlucas/WeatherCal-Reborn/releases/latest';
const assetUrl = 'https://github.com/zmjlucas/WeatherCal-Reborn/releases/download/v0.2.0/WeatherCal-Reborn-v0.2.0.js';
const release = {
  tag_name: 'v0.2.0', draft: false, prerelease: false,
  assets: [{ name: 'WeatherCal-Reborn-v0.2.0.js', state: 'uploaded', browser_download_url: assetUrl }],
};
const installed = scriptFixture('const layout = `my layout`; const custom = {};');
const downloaded = scriptFixture(undefined, 'const version = 2;');

for (const reset of [false, true]) {
  test(`release asset discovery supports ${reset ? 'reset' : 'update with preserved customizations'}`, async t => {
    const env = installScriptable(t, { request: async (url, type) => {
      if (url === endpoint && type === 'json') return release;
      if (url === assetUrl && type === 'string') return downloaded;
      throw new Error('Unexpected request');
    } });
    const engine = await initializedContext(env);
    const path = '/documents/Test Widget.js';
    env.local.writeString(path, installed);
    assert.equal(await engine.downloadCode(engine.name, engine.widgetUrl, reset), true);
    const result = splitScript(env.local.readString(path));
    assert.equal(result.engine, splitScript(downloaded).engine);
    assert.equal(result.user, splitScript(reset ? downloaded : installed).user);
    assert.deepEqual(env.requests, [endpoint, assetUrl]);
  });
}

test('unavailable or invalid release metadata leaves the installed widget untouched', async t => {
  let metadata: unknown;
  const env = installScriptable(t, { request: async (url, type) => {
    assert.equal(url, endpoint);
    assert.equal(type, 'json');
    if (metadata instanceof Error) throw metadata;
    return metadata;
  } });
  const engine = await initializedContext(env);
  env.local.writeString('/documents/Test Widget.js', installed);
  const before = new Map(env.local.store);
  for (metadata of [null, { tag_name: 42 }, { ...release, assets: [] },
    { ...release, assets: [{ ...release.assets[0], browser_download_url: 'https://example.test/code.js' }] },
    new Error('Rate limited')]) {
    for (const reset of [false, true]) {
      const requestCount = env.requests.length;
      assert.equal(await engine.downloadCode(engine.name, engine.widgetUrl, reset), false);
      assert.deepEqual(env.local.store, before);
      assert.deepEqual(env.requests.slice(requestCount), [endpoint]);
    }
  }
});
