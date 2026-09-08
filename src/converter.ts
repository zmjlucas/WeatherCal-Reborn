// Licensed under MIT. See LICENSE.
import { tokenize } from './converter/tokens';

export interface ConverterOptions { parameter?: string; padding?: number; cornerRadius?: number }

/** Embed a conventional single-ListWidget script. Review generated custom code:
 * arbitrary JavaScript and template interpolations are not an interchange format.
 */
export function convertWidget(source: string, name: string, options: ConverterOptions = {}): string {
  if (!/^[A-Za-z_$][\w$]*$/.test(name)) throw new Error('Use a JavaScript identifier for the item name.');
  const tokens = tokenize(source);
  const declaration = tokens.findIndex((token, index) =>
    ['const', 'let', 'var'].includes(token.value) && /^[A-Za-z_$][\w$]*$/.test((tokens[index + 1]?.value ?? '')) &&
    tokens.slice(index + 2, index + 7).map(x => x.value).join(' ') === '= new ListWidget ( )');
  if (declaration < 0) throw new Error('Choose a script with a declared ListWidget.');
  const startToken = tokens[declaration];
  const nameToken = tokens[declaration + 1];
  const closeToken = tokens[declaration + 6];
  if (!startToken || !nameToken || !closeToken) throw new Error('Incomplete widget declaration.');
  const variable = nameToken.value;
  const padding = options.padding !== undefined && Number.isFinite(options.padding) ? options.padding : 10;
  const radius = options.cornerRadius !== undefined && Number.isFinite(options.cornerRadius) ? options.cornerRadius : 20;
  const edits = [{ start: startToken.start, end: closeToken.end,
    text: `${startToken.value} ${variable} = column.addStack();\n${variable}.layoutVertically();\n${variable}.cornerRadius = ${radius};\n${variable}.setPadding(${padding}, ${padding}, ${padding}, ${padding})` }];
  for (let index = 0; index < tokens.length; index++) {
    const token = tokens[index];
    if (!token) continue;
    if (tokens[index - 1]?.value === '.' || tokens[index + 1]?.value !== '.') continue;
    const propertyToken = tokens[index + 2];
    if (!propertyToken) continue;
    const property = propertyToken.value;
    if (token.value === 'args' && property === 'widgetParameter' && options.parameter !== undefined) {
      edits.push({ start: token.start, end: propertyToken.end, text: JSON.stringify(String(options.parameter)) });
      index += 2;
      continue;
    }
    const rootCall = token.value === 'Script' && ['setWidget', 'complete'].includes(property);
    const preview = token.value === variable && /^present(Small|Medium|Large|ExtraLarge)$/.test(property);
    if ((rootCall || preview) && tokens[index + 3]?.value === '(') {
      let depth = 0;
      let end = index + 3;
      for (; end < tokens.length; end++) {
        if (tokens[end]?.value === '(') depth++;
        if (tokens[end]?.value === ')' && --depth === 0) break;
      }
      if (end === tokens.length) throw new Error('Unbalanced widget call; review the source script.');
      const endToken = tokens[end];
      if (!endToken) throw new Error('Unbalanced widget call.');
      edits.push({ start: token.start, end: endToken.end, text: 'void 0' });
      index = end;
    } else if (token.value === variable && property === 'refreshAfterDate' && tokens[index + 3]?.value === '=' && tokens[index + 4]?.value !== '=') {
      let end = index + 4;
      let depth = 0;
      for (; end < tokens.length; end++) {
        const value = tokens[end]?.value ?? '';
        if (!depth && (value === ';' || value === '}' || (end > index + 4 && /\n/.test(source.slice(tokens[end - 1]?.end ?? 0, tokens[end]?.start ?? source.length))))) break;
        if (['(', '[', '{'].includes(value)) depth++;
        if ([')', ']', '}'].includes(value)) depth--;
      }
      const endToken = tokens[end - 1];
      if (!endToken) throw new Error('Incomplete refresh assignment.');
      edits.push({ start: token.start, end: endToken.end, text: 'void 0' });
      index = end - 1;
    }
  }
  let output = source;
  for (const edit of edits.sort((a, b) => b.start - a.start)) {
    output = output.slice(0, edit.start) + edit.text + output.slice(edit.end);
  }
  return `async ${name}(column) {\n${output}\n},`;
}
