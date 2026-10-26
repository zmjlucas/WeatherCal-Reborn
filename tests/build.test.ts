import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import { parse } from 'acorn';
import type { Comment } from 'acorn';
import { buildArtifacts } from '../scripts/build.mjs';
import { validateSource, splitScript, mergeScriptUpdate } from '#source/setup/script-format';
import { required } from './helpers/scriptable';
import { scriptFixture } from './helpers/script-format';

test('release artifacts rebuild byte-identically and their checksum manifest authenticates every script', async () => {
  const artifacts = await buildArtifacts();
  assert.deepEqual(artifacts, await buildArtifacts());
  const names = Object.keys(artifacts).filter(name => name.endsWith('.js')).sort();
  assert.deepEqual(names, ['one.js', 'weather-cal-converter.js']);
  const records = required(artifacts.SHA256SUMS).trim().split('\n');
  assert.equal(records.length, names.length);
  for (const record of records) {
    const [digest, name] = record.split('  ');
    assert((name === 'one.js' || name === 'weather-cal-converter.js') && digest);
    const source = required(artifacts[name]);
    assert.equal(createHash('sha256').update(source, 'utf8').digest('hex'), digest);
    assert(source.startsWith('// Variables used by Scriptable.\n'));
    assert(source.includes('MIT License'));
    validateSource(source, name);
  }
  const script = splitScript(required(artifacts['one.js']));
  assert(script.user.includes('layout'));
  assert(script.user.includes('custom'));
  assert(script.engine.length > script.user.length);
});

test('release scripts carry complete license footers after executable code and preserve them through updates', async () => {
  const artifacts = await buildArtifacts();
  const widget = required(artifacts['one.js']);
  const installed = scriptFixture('const layout = `row`;\nconst custom = {};', 'const oldEngine = true;');
  const updated = mergeScriptUpdate(installed, widget);
  assert.equal(splitScript(updated).user, splitScript(installed).user);
  assert.equal(splitScript(updated).engine, splitScript(widget).engine);

  for (const [name, source] of [
    ['one.js', widget], ['updated.js', updated],
    ['weather-cal-converter.js', required(artifacts['weather-cal-converter.js'])]
  ] as const) {
    const comments: Comment[] = [];
    const tree = parse(source, { ecmaVersion: 2020, sourceType: 'module', allowAwaitOutsideFunction: true, onComment: comments });
    const lastStatement = required(tree.body.at(-1));
    const paths = ['LICENSE', 'licenses/weather-cal.LICENSE'];
    if (name !== 'weather-cal-converter.js') paths.push('licenses/acorn.LICENSE', 'licenses/cldr-core.LICENSE');
    for (const path of paths) {
      const license = (await fs.readFile(new URL(`../${path}`, import.meta.url), 'utf8')).trim();
      const notices = comments.filter(comment => comment.value.includes(license));
      assert.equal(notices.length, 1, `${name}: complete ${path} notice appears once`);
      assert(required(notices[0]).start > lastStatement.end, `${name}: ${path} follows executable code`);
    }
  }
});
