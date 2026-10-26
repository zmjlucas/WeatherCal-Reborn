import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { buildArtifacts } from './build.mjs';
import { validateSource, splitScript } from '../src/setup/script-format.ts';

export { validateSource };
const root = fileURLToPath(new URL('../', import.meta.url));

export async function validateBundles() {
  const first = await buildArtifacts();
  assert.deepEqual(await buildArtifacts(), first, 'Consecutive builds differ');
  for (const [name, expected] of Object.entries(first)) {
    const actual = await fs.readFile(path.join(root, 'dist', name), 'utf8');
    assert.equal(actual, expected, `Build drift: ${name}`);
    if (name.endsWith('.js')) {
      assert(actual.startsWith('// Variables used by Scriptable.'), `${name}: missing initial metadata`);
      validateSource(actual, name);
    }
  }
  splitScript(first['one.js']);
  for (const line of first.SHA256SUMS.trim().split('\n')) {
    const [hash, name] = line.split('  ');
    assert.equal(createHash('sha256').update(await fs.readFile(path.join(root, 'dist', name))).digest('hex'), hash, `Checksum mismatch: ${name}`);
  }
  const files = await fs.readdir(path.join(root, 'src'), { recursive: true });
  for (const file of files) {
    assert(!file.endsWith('.js'), `Unmigrated JavaScript: ${file}`);
    if (file.endsWith('.ts')) {
      const lines = (await fs.readFile(path.join(root, 'src', file), 'utf8')).trimEnd().split('\n').length;
      assert(lines <= 500, `${file}: exceeds 500 lines`);
    }
  }
  console.log('Both scripts pass AST validation; consecutive builds and SHA256SUMS match.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await validateBundles();
