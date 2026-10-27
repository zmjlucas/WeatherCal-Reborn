import fs from 'node:fs/promises';

const readmePath = new URL('../README.md', import.meta.url);
const sourcePath = new URL('../WeatherCal-Reborn-Setup.js', import.meta.url);
const begin = '<!-- setup-script:begin -->';
const end = '<!-- setup-script:end -->';

try {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node scripts/sync-readme-setup.mjs [--check]');
  }
  const [readme, source] = await Promise.all([
    fs.readFile(readmePath, 'utf8'), fs.readFile(sourcePath, 'utf8'),
  ]);
  const start = readme.indexOf(begin), finish = readme.indexOf(end);
  if (start < 0 || finish < start || readme.indexOf(begin, start + begin.length) !== -1 ||
      readme.indexOf(end, finish + end.length) !== -1) {
    throw new Error('README.md must contain exactly one ordered pair of setup-script:begin/end markers.');
  }
  const newline = readme.includes('\r\n') ? '\r\n' : '\n';
  const code = source.replace(/\r\n/g, '\n').replace(/\n$/, '');
  const block = ('\n```javascript\n' + code + '\n```\n').replace(/\n/g, newline);
  const updated = readme.slice(0, start + begin.length) + block + readme.slice(finish);
  if (updated === readme) {
    console.log('README setup script is in sync.');
  } else if (args[0] === '--check') {
    throw new Error('README setup script is out of sync. Run pnpm readme:sync and commit the updated README.md.');
  } else {
    await fs.writeFile(readmePath, updated);
    console.log('Updated README setup script from WeatherCal-Reborn-Setup.js.');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
