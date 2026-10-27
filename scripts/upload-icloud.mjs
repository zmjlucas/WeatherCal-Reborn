import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify, styleText } from 'node:util';
import { randomUUID } from 'node:crypto';
import { build } from './build.mjs';
import { mergeScriptUpdate, splitScript } from '../src/setup/script-format.ts';

const root = fileURLToPath(new URL('../', import.meta.url));
const exec = promisify(execFile);

/** Keep the same validation and user-region preservation as the in-app updater. */
export function prepareUpload(installed, fresh, buildInfo) {
  const [buildTime, uploadTime] = [buildInfo.time, buildInfo.uploadTime].map(value => {
    const date = new Date(value);
    const offset = -date.getTimezoneOffset();
    const localTime = new Date(date.getTime() + offset * 60_000).toISOString().slice(0, -1);
    const hours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
    const minutes = String(Math.abs(offset) % 60).padStart(2, '0');
    return `${localTime}${offset >= 0 ? '+' : '-'}${hours}:${minutes}`;
  });
  const annotated = `// Commit: ${buildInfo.commit}\n// Build time: ${buildTime}\n// Upload time: ${uploadTime}\n${fresh}`;
  if (installed === null) {
    splitScript(annotated);
    return annotated;
  }
  return mergeScriptUpdate(installed, annotated);
}

/** The helper uses Foundation file coordination, not an uncoordinated copy. */
export async function runNative(args) {
  if (process.platform !== 'darwin') throw new Error('iCloud upload requires macOS.');
  const cache = path.join(root, 'node_modules/.cache/weathercal-swift');
  await fs.mkdir(cache, { recursive: true });
  try {
    const { stdout } = await exec('/usr/bin/swift', [
      '-module-cache-path', cache, path.join(root, 'scripts/icloud-file.swift'), ...args,
    ], { maxBuffer: 16 * 1024 * 1024 });
    return JSON.parse(stdout);
  } catch (error) {
    throw new Error(`iCloud access failed: ${error.stderr?.trim() || error.message}`, { cause: error });
  }
}

export async function upload(args = process.argv.slice(2)) {
  if (args.length > 1 || (args.length && !['--check', '--probe', '--help'].includes(args[0]))) {
    throw new Error('Usage: pnpm upload:icloud [--check | --probe | --help]');
  }
  if (args[0] === '--help') {
    console.log('pnpm upload:icloud          Build and create WeatherCal-Test.js, or back up and update it');
    console.log('pnpm upload:icloud --check  Build and validate the merge without changing iCloud');
    console.log('pnpm upload:icloud --probe  Write/read/delete a temporary probe; leave the script alone');
    return;
  }
  const directory = path.join(os.homedir(), 'Library/Mobile Documents/iCloud~dk~simonbs~Scriptable/Documents');
  const target = path.join(directory, 'WeatherCal-Test.js');
  const success = styleText(['bgGreen', 'black', 'bold'], ' SUCCESS ');
  const current = await runNative(['inspect', target]);
  if (!current.ubiquitous) throw new Error('Destination is not a confirmed iCloud document or directory; refusing to write.');
  if (args[0] === '--probe') {
    await runNative(['probe', directory]);
    console.log(`${success} iCloud write access verified; script unchanged.`);
    return;
  }
  const { stdout: commit } = await exec('git', ['rev-parse', '--short', 'HEAD'], { cwd: root });
  const buildInfo = { commit: commit.trim(), time: new Date().toISOString() };
  const artifacts = await build();
  const replacement = prepareUpload(current.source, artifacts['one.js'], {
    ...buildInfo, uploadTime: new Date().toISOString(),
  });
  console.log(replacement.split('\n').slice(0, 3).join('\n'));
  if (args[0] === '--check') {
    console.log(`${success} Validated target: ${target} (no upload)`);
    return;
  }
  const staging = await fs.mkdtemp(path.join(os.tmpdir(), 'weathercal-upload-'));
  try {
    const candidate = path.join(staging, 'candidate.js');
    await fs.writeFile(candidate, replacement, { mode: 0o600 });
    if (!current.exists) {
      await runNative(['create', target, candidate]);
    } else {
      const backupDirectory = path.join(root, '.icloud-backups');
      await fs.mkdir(backupDirectory, { recursive: true, mode: 0o700 });
      const backupInfo = await fs.lstat(backupDirectory);
      if (!backupInfo.isDirectory() || backupInfo.isSymbolicLink()) throw new Error('Backup directory must not be a symlink.');
      await fs.chmod(backupDirectory, 0o700);
      const backup = path.join(backupDirectory, `WeatherCal-Test-${new Date().toISOString().replace(/[:.]/g, '-')}-${randomUUID()}.js`);
      const expected = path.join(staging, 'expected.js');
      await fs.writeFile(expected, current.source, { mode: 0o600 });
      await runNative(['update', target, expected, candidate, backup]);
    }
  } finally {
    await fs.rm(staging, { recursive: true, force: true });
  }
  console.log(`${success} Uploaded to target: ${target}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { await upload(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
