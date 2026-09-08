const fs = require('node:fs');
const path = require('node:path');

/** Bundle this project's literal, relative CommonJS imports for Scriptable. */
function bundle(entry) {
  const modules = new Map();
  function visit(filename) {
    filename = path.resolve(filename);
    if (!path.extname(filename)) filename += '.js';
    if (modules.has(filename)) return modules.get(filename).id;
    const record = { id: modules.size, source: '' };
    modules.set(filename, record);
    record.source = fs.readFileSync(filename, 'utf8').replace(
      /\brequire\(\s*(['"])([^'"]+)\1\s*\)/g,
      (_, quote, request) => {
        if (!request.startsWith('.')) throw new Error('Only local modules can be bundled: ' + request);
        return '__load(' + visit(path.resolve(path.dirname(filename), request)) + ')';
      }
    );
    return record.id;
  }
  const entryId = visit(entry);
  const factories = [...modules.values()].map(({ id, source }) =>
    `${id}: function(module, exports, __load) {\n${source}\n}`
  ).join(',\n');
  return `module.exports = (() => {\nconst factories = {\n${factories}\n};\nconst cache = {};\nfunction __load(id) {\n  if (cache[id]) return cache[id].exports;\n  const mod = cache[id] = { exports: {} };\n  factories[id](mod, mod.exports, __load);\n  return mod.exports;\n}\nreturn __load(${entryId});\n})();\n`;
}

module.exports = { bundle };
