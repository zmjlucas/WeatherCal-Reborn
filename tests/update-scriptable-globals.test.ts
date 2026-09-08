import { test, expect } from 'vitest';
import vm from 'node:vm';
import { mergeScriptUpdate } from '#source/setup/script-format';
import { scriptFixture } from './helpers/script-format';

test('an updated custom item can keep native Scriptable logging and base64 helpers', async () => {
  const user = `const custom = { render() {
    log('rendered'); logWarning('warning'); logError('error');
    return atob(btoa('custom text'));
  } };`;
  const updated = mergeScriptUpdate(scriptFixture(user, 'custom.render();'),
    scriptFixture(undefined, 'const result = custom.render(); Script.setWidget(result); Script.complete();'));
  const messages: string[] = [];
  let result: string | undefined;
  let completed = false;
  await vm.runInNewContext('(async () => {\n' + updated + '\n})()', {
    log: (text: string) => messages.push(text),
    logWarning: (text: string) => messages.push(text),
    logError: (text: string) => messages.push(text),
    atob: (text: string) => Buffer.from(text, 'base64').toString('ascii'),
    btoa: (text: string) => Buffer.from(text, 'ascii').toString('base64'),
    Script: { setWidget: (text: string) => { result = text; }, complete: () => { completed = true; } },
  });
  expect(messages).toEqual(['rendered', 'warning', 'error']);
  expect(result).toBe('custom text');
  expect(completed).toBe(true);
});
