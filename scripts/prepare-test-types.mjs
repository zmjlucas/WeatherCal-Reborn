/** Keep Node's ambient globals out of Scriptable production type checking.
 * Tests execute the real src modules through Vitest's #source alias, but typecheck
 * against freshly emitted declarations whose Scriptable API names are scoped.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('..', import.meta.url));
const generated = path.join(project, '.typecheck');
const require = createRequire(import.meta.url);
rmSync(generated, { recursive: true, force: true });
mkdirSync(generated, { recursive: true });

// Appending exports makes the authoritative ambient declarations module-local;
// their definitions remain byte-for-byte unchanged, including API overloads.
const definitions = readFileSync(require.resolve('@types/scriptable-ios/index.d.ts'), 'utf8');
const names = [...new Set([...definitions.matchAll(/^declare (?:class|namespace|var|function) (\w+)/gm)].map(match => match[1]))];
if (!names.includes('Request') || !names.includes('ListWidget')) {
  throw new Error('The Scriptable declaration format changed; update the scoped type bridge.');
}
writeFileSync(path.join(generated, 'scriptable.d.ts'), `${definitions}\nexport { ${names.join(', ')} };\n`);

const compiler = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
execFileSync(process.execPath, [compiler, '-p', 'tsconfig.declarations.json'], { cwd: project, stdio: 'inherit' });

function scopeDeclarations(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) { scopeDeclarations(filename); continue; }
    if (!entry.name.endsWith('.d.ts')) continue;
    const declaration = readFileSync(filename, 'utf8');
    let apiModule = path.relative(directory, path.join(generated, 'scriptable')).split(path.sep).join('/');
    if (!apiModule.startsWith('.')) apiModule = './' + apiModule;
    writeFileSync(filename, `import type { ${names.join(', ')} } from '${apiModule}';\n${declaration}`);
  }
}
scopeDeclarations(path.join(generated, 'src'));
