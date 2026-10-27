import { test } from 'vitest';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import { createEnvironment } from './helpers/scriptable';

const endpoint = 'https://api.github.com/repos/zmjlucas/WeatherCal-Reborn/releases/latest';
const url = 'https://github.com/zmjlucas/WeatherCal-Reborn/releases/download/v0.2.0/WeatherCal-Reborn-v0.2.0.js';
const release = { tag_name: 'v0.2.0', assets: [{ name: 'WeatherCal-Reborn-v0.2.0.js', browser_download_url: url }] };
const downloaded = '// WeatherCal: user begin\nconst layout = "date";\n// WeatherCal: engine end\n';
const target = '/documents/WeatherCal-Reborn.js';
const installer = '/documents/WeatherCal-Reborn-Setup.js';

for (const iCloud of [false, true]) {
  test(`installer saves latest release and removes itself using ${iCloud ? 'iCloud' : 'local'} storage`, async () => {
    const env = createEnvironment({ iCloud, request: async (address, type) => {
      if (address === endpoint && type === 'json') return release;
      assert.equal(address, url);
      return downloaded;
    } });
    const files = iCloud ? env.cloud : env.local;
    files.writeString(installer, 'setup');
    const opened: string[] = [];
    const source = await readFile(new URL('../WeatherCal-Reborn-Setup.js', import.meta.url), 'utf8');
    await runInNewContext(`(async () => { ${source}\n })()`, {
      ...env.globals, module: { filename: installer },
      Safari: { open: (address: string) => {
        assert.equal(files.readString(target), downloaded);
        assert.equal(files.fileExists(installer), false);
        opened.push(address);
      } },
    });
    assert.equal(files.readString(target), downloaded);
    assert.equal((iCloud ? env.local : env.cloud).fileExists(target), false);
    assert.deepEqual(opened, ['scriptable:///run?scriptName=WeatherCal-Reborn']);
    assert.equal(env.globals.Script.completed, true);
  });
}

for (const failure of ['existing', 'same name', 'metadata', 'download', 'invalid body', 'write', 'delete', 'launch']) {
  test(`installer handles ${failure} without losing user files`, async () => {
    const env = createEnvironment({ request: async (_address, type) => {
      if (type === 'json') return failure === 'metadata' ? { assets: [] } : release;
      if (failure === 'download') throw Error('Offline');
      return failure === 'invalid body' ? '<html>Error</html>' : downloaded;
    } });
    const self = failure === 'same name' ? target : installer;
    env.local.writeString(self, 'setup');
    if (failure === 'existing') env.local.writeString(target, 'custom layout');
    if (failure === 'write') env.local.writeString = () => { throw Error('Disk full'); };
    if (failure === 'delete') env.local.remove = () => { throw Error('Cannot delete'); };
    const opened: string[] = [];
    const source = await readFile(new URL('../WeatherCal-Reborn-Setup.js', import.meta.url), 'utf8');
    await runInNewContext(`(async () => { ${source}\n })()`, {
      ...env.globals, module: { filename: self },
      Safari: { open: (address: string) => {
        if (failure === 'launch') throw Error('Cannot open');
        opened.push(address);
      } },
    });
    const installed = failure === 'delete' || failure === 'launch';
    assert.equal(env.local.fileExists(self), failure !== 'launch');
    if (installed) assert.equal(env.local.readString(target), downloaded);
    else if (failure === 'existing') assert.equal(env.local.readString(target), 'custom layout');
    else if (failure === 'same name') assert.equal(env.local.readString(target), 'setup');
    else assert.equal(env.local.fileExists(target), false);
    assert.equal(opened.length, failure === 'delete' ? 1 : 0);
    assert(env.alerts.some(alert => alert.message.length > 0));
    assert.equal(env.globals.Script.completed, true);
  });
}
