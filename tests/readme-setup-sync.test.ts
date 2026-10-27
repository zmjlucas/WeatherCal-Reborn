import { test } from 'vitest';
import type { TestContext } from 'vitest';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const begin = '<!-- setup-script:begin -->';
const end = '<!-- setup-script:end -->';
const before = '# Example\n\nUser-edited instructions.\n';
const after = '\n## Credits\nKeep these.\n';
const stale = `${before}${begin}\n\`\`\`javascript\nold();\n\`\`\`\n${end}${after}`;

async function fixture(t: TestContext, readme = stale, source = 'await install();\n') {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'weathercal-readme-sync-'));
  t.onTestFinished(() => fs.rm(root, { recursive: true, force: true }));
  await fs.mkdir(path.join(root, 'scripts'));
  const command = path.join(root, 'scripts/sync-readme-setup.mjs');
  await fs.copyFile(new URL('../scripts/sync-readme-setup.mjs', import.meta.url), command);
  const readmePath = path.join(root, 'README.md');
  const sourcePath = path.join(root, 'WeatherCal-Reborn-Setup.js');
  await fs.writeFile(readmePath, readme);
  await fs.writeFile(sourcePath, source);
  return { readmePath, sourcePath,
    run: (...args: string[]) => spawnSync(process.execPath, [command, ...args], { cwd: os.tmpdir(), encoding: 'utf8' }),
  };
}

test('check detects drift without writing and directs maintainers to the sync command', async t => {
  const f = await fixture(t);
  const result = f.run('--check');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /pnpm readme:sync/);
  assert.equal(await fs.readFile(f.readmePath, 'utf8'), stale);
  assert.equal(await fs.readFile(f.sourcePath, 'utf8'), 'await install();\n');
});

for (const newline of ['\n', '\r\n']) {
  test(`sync preserves surrounding prose, normalizes source line endings and is idempotent (${JSON.stringify(newline)})`, async t => {
    const f = await fixture(t, stale.replace(/\n/g, newline), 'const text = "$&";\r\n  await install();  \r\n');
    assert.equal(f.run().status, 0);
    const expected = `${before}${begin}\n\`\`\`javascript\nconst text = "$&";\n  await install();  \n\`\`\`\n${end}${after}`.replace(/\n/g, newline);
    assert.equal(await fs.readFile(f.readmePath, 'utf8'), expected);
    const stat = await fs.stat(f.readmePath);
    assert.equal(f.run('--check').status, 0);
    assert.equal(f.run().status, 0);
    assert.equal((await fs.stat(f.readmePath)).mtimeMs, stat.mtimeMs);
    assert.equal(await fs.readFile(f.sourcePath, 'utf8'), 'const text = "$&";\r\n  await install();  \r\n');
    await fs.writeFile(f.sourcePath, 'changed();');
    assert.equal(f.run('--check').status, 1);
    assert.equal(f.run().status, 0);
    assert.equal(f.run('--check').status, 0);
  });
}

for (const [name, readme] of [
  ['missing begin', stale.replace(begin, '')],
  ['missing end', stale.replace(end, '')],
  ['duplicate begin', begin + stale],
  ['duplicate end', stale + end],
  ['reversed', `${end}\n${begin}`],
]) {
  test(`invalid markers (${name}) fail without modifying README`, async t => {
    const f = await fixture(t, readme);
    for (const args of [[], ['--check']]) {
      const result = f.run(...args);
      assert.equal(result.status, 1);
      assert.match(result.stderr, /marker/i);
      assert.equal(await fs.readFile(f.readmePath, 'utf8'), readme);
    }
  });
}

test('unknown options fail without writing', async t => {
  const f = await fixture(t);
  assert.equal(f.run('--chek').status, 1);
  assert.equal(await fs.readFile(f.readmePath, 'utf8'), stale);
});
