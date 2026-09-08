import { test, expect } from 'vitest';
import { validateSource, splitScript, mergeScriptUpdate } from '#source/setup/script-format';

test('validator resolves references in their own lexical scope', () => {
  expect(() => validateSource('function unused(URL) {} new URL("https://example.test");')).toThrow();
  expect(() => validateSource('{ const hidden = 1; } hidden;')).toThrow();
  validateSource('function local(URL) { return new URL("x"); }');
  validateSource('function local() { if (true) { var value = 1; } return value; }');
});

test('arguments belongs to normal functions and is inherited by arrows', () => {
  validateSource('function local() { return (() => arguments[0])(); }');
  expect(() => validateSource('arguments[0];')).toThrow();
  expect(() => validateSource('const arrow = () => arguments[0];')).toThrow();
});

test('editable and engine boundaries cannot divide a JavaScript statement', () => {
  const source = '// Variables used by Scriptable.\n// WeatherCal: user begin v1\nfunction unfinished() {\n' +
    '// WeatherCal: user end v1\n// WeatherCal: engine begin v1\n}\n// WeatherCal: engine end v1\n';
  expect(() => splitScript(source)).toThrow();
});

test('updates reject engine declarations that would overwrite user variables', () => {
  const source = (user: string, engine: string): string => '// Variables used by Scriptable.\n' +
    `// WeatherCal: user begin v1\n${user}\n// WeatherCal: user end v1\n` +
    `// WeatherCal: engine begin v1\n${engine}\n// WeatherCal: engine end v1\n`;
  expect(() => mergeScriptUpdate(source('var helper = () => "mine";', 'var version = 1;'),
    source('var layout = "";', 'var helper = () => "engine";'))).toThrow();
  expect(() => mergeScriptUpdate(source('function custom() { var helper = 1; }', 'var version = 1;'),
    source('var layout = "";', 'var helper = 2;'))).not.toThrow();
});
