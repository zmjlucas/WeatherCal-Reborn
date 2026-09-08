import { build as esbuild } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const metadata = glyph => '// Variables used by Scriptable.\n// These must be at the very top of the file. Do not edit.\n' +
  `// icon-color: deep-purple; icon-glyph: ${glyph};\n`;

/** Deterministic UTF-8 artifacts; esbuild handles all production module linking.
 * @returns {Promise<Record<'one.js' | 'weather-cal-converter.js' | 'SHA256SUMS', string>>}
 */
export async function buildArtifacts() {
  const { version } = JSON.parse(await fs.readFile(path.join(root, 'package.json'), 'utf8'));
  const license = (await fs.readFile(path.join(root, 'LICENSE'), 'utf8')).trim();
  const notice = `/* WeatherCal-Reborn ${version}\n${license}\n*/\n`;
  const parserLicense = (await fs.readFile(path.join(root, 'node_modules/acorn/LICENSE'), 'utf8')).trim();
  const parserNotice = `/* Acorn 8.18.0 (bundled JavaScript parser)\n${parserLicense}\n*/\n`;
  async function bundle(entry) {
    const result = await esbuild({
      absWorkingDir: root, entryPoints: [entry], bundle: true, platform: 'neutral', format: 'esm',
      target: 'es2020', supported: { 'top-level-await': true }, charset: 'utf8',
      minify: false, sourcemap: false, legalComments: 'inline', write: false,
    });
    if (result.outputFiles.length !== 1) throw new Error(`Unexpected output for ${entry}`);
    return result.outputFiles[0].text;
  }
  const combined = await bundle('src/entry.ts');
  const begin = '/*! WeatherCal: user begin v1 */';
  const end = '/*! WeatherCal: user end v1 */';
  const start = combined.indexOf(begin), finish = combined.indexOf(end);
  if (start < 0 || finish < start || combined.indexOf(begin, start + 1) !== -1 || combined.indexOf(end, finish + 1) !== -1) {
    throw new Error('esbuild did not retain the editable user region.');
  }
  const user = combined.slice(start + begin.length, finish);
  const engine = combined.slice(0, start) + combined.slice(finish + end.length);
  const artifacts = {
    'one.js': metadata('calendar') + '// WeatherCal: user begin v1\n' + user +
      '// WeatherCal: user end v1\n// WeatherCal: engine begin v1\n' + notice + parserNotice + engine +
      '// WeatherCal: engine end v1\n',
    'weather-cal-converter.js': metadata('magic') + notice + await bundle('src/scriptable/converter.ts'),
  };
  const SHA256SUMS = Object.entries(artifacts).map(([name, content]) =>
    `${createHash('sha256').update(content, 'utf8').digest('hex')}  ${name}`).join('\n') + '\n';
  return { ...artifacts, SHA256SUMS };
}

export async function build() {
  const artifacts = await buildArtifacts();
  const directory = path.join(root, 'dist');
  await fs.mkdir(directory, { recursive: true });
  for (const name of await fs.readdir(directory)) {
    if (!Object.hasOwn(artifacts, name)) await fs.rm(path.join(directory, name), { recursive: true, force: true });
  }
  for (const [name, content] of Object.entries(artifacts)) await fs.writeFile(path.join(directory, name), content, 'utf8');
  console.log('Built dist/one.js, dist/weather-cal-converter.js and dist/SHA256SUMS');
  return artifacts;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await build();
