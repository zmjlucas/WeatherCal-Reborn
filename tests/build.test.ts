import { test } from 'vitest';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildArtifacts } from '../scripts/build.mjs';
import { validateSource, splitScript } from '#source/setup/script-format';
import { required } from './helpers/scriptable';

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
