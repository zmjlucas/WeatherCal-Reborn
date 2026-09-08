// Licensed under MIT. See LICENSE.
const { tokenize } = require('./converter/tokens');

/** Embed a conventional single-ListWidget script. Review generated custom code:
 * arbitrary JavaScript and template interpolations are not an interchange format.
 */
function convertWidget(source, name, options = {}) {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('Use a JavaScript identifier for the item name.');
  const tokens = tokenize(source);
  const declaration = tokens.findIndex((token, index) =>
    ['const', 'let', 'var'].includes(token.value) && /^[A-Za-z_$][\w$]*$/.test(tokens[index + 1]?.value) &&
    tokens.slice(index + 2, index + 7).map(x => x.value).join(' ') === '= new ListWidget ( )');
  if (declaration < 0) throw new Error('Choose a script with a declared ListWidget.');
  const variable = tokens[declaration + 1].value;
  const padding = Number.isFinite(options.padding) ? options.padding : 10;
  const radius = Number.isFinite(options.cornerRadius) ? options.cornerRadius : 20;
  const edits = [{ start: tokens[declaration].start, end: tokens[declaration + 6].end,
    text: `${tokens[declaration].value} ${variable} = column.addStack();\n${variable}.layoutVertically();\n${variable}.cornerRadius = ${radius};\n${variable}.setPadding(${padding}, ${padding}, ${padding}, ${padding})` }];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (tokens[index - 1]?.value === '.' || tokens[index + 1]?.value !== '.') continue;
    const property = tokens[index + 2]?.value;
    if (token.value === 'args' && property === 'widgetParameter' && options.parameter !== undefined) {
      edits.push({ start: token.start, end: tokens[index + 2].end, text: JSON.stringify(String(options.parameter)) });
      index += 2;
      continue;
    }
    const rootCall = token.value === 'Script' && ['setWidget', 'complete'].includes(property);
    const preview = token.value === variable && /^present(Small|Medium|Large|ExtraLarge)$/.test(property);
    if ((rootCall || preview) && tokens[index + 3]?.value === '(') {
      let depth = 0;
      let end = index + 3;
      for (; end < tokens.length; end++) {
        if (tokens[end].value === '(') depth++;
        if (tokens[end].value === ')' && --depth === 0) break;
      }
      if (end === tokens.length) throw new Error('Unbalanced widget call; review the source script.');
      edits.push({ start: token.start, end: tokens[end].end, text: 'void 0' });
      index = end;
    } else if (token.value === variable && property === 'refreshAfterDate' && tokens[index + 3]?.value === '=' && tokens[index + 4]?.value !== '=') {
      let end = index + 4;
      let depth = 0;
      for (; end < tokens.length; end++) {
        const value = tokens[end].value;
        if (!depth && (value === ';' || value === '}' || (end > index + 4 && /\n/.test(source.slice(tokens[end - 1].end, tokens[end].start))))) break;
        if (['(', '[', '{'].includes(value)) depth++;
        if ([')', ']', '}'].includes(value)) depth--;
      }
      edits.push({ start: token.start, end: tokens[end - 1].end, text: 'void 0' });
      index = end - 1;
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return `async ${name}(column) {\n${output}\n},`;
}
module.exports = { convertWidget };
