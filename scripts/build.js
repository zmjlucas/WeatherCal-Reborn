const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { bundle } = require('./bundle');
const root = path.resolve(__dirname, '..');

/** Return deterministic installable artifacts; no source changes or network requests. */
function buildArtifacts() {
  const { version } = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8').trim();
  const notice = `\n/* WeatherCal-Reborn ${version}\nGenerated from modular source. Edit the launcher for customizations.\n\n${license}\n*/\n`;
  const engine = '// Variables used by Scriptable.\n// These must be at the very top of the file. Do not edit.\n// icon-color: deep-purple; icon-glyph: calendar;\n' +
    notice + '"use strict";\n' + bundle(path.join(root, 'src/index.js')) + '\n//4\n';
  const launcher = fs.readFileSync(path.join(root, 'src/scriptable/launcher.js'), 'utf8');
  const converter = fs.readFileSync(path.join(root, 'src/scriptable/converter.js'), 'utf8')
    .replace('/* CONVERTER_MODULE */', notice + bundle(path.join(root, 'src/converter.js')));
  const artifacts = {
    'weather-cal-code.js': engine,
    'weather-cal.js': launcher.replace('// icon-color: deep-purple; icon-glyph: calendar;', '// icon-color: deep-purple; icon-glyph: calendar;\n' + notice),
    'weather-cal-converter.js': converter
  };
  artifacts.SHA256SUMS = Object.entries(artifacts).map(([name, content]) =>
    crypto.createHash('sha256').update(content).digest('hex') + '  ' + name
  ).join('\n') + '\n';
  return artifacts;
}

if (require.main === module) {
  const directory = path.join(root, 'dist');
  fs.mkdirSync(directory, { recursive: true });
  for (const [name, content] of Object.entries(buildArtifacts())) {
    fs.writeFileSync(path.join(directory, name), content);
    console.log('Built dist/' + name);
  }
}
module.exports = { buildArtifacts };
