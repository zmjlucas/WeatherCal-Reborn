/** Token spans for conventional Scriptable scripts; literals/comments stay untouched.
 * Template literals are deliberately opaque, so their embedded code needs manual review.
 */
function tokenize(source) {
  const tokens = [];
  let index = 0;
  while (index < source.length) {
    const start = index;
    const char = source[index];
    if (/\s/.test(char)) { index++; continue; }
    if (source.startsWith('//', index)) {
      const end = source.indexOf('\n', index);
      index = end < 0 ? source.length : end;
      continue;
    }
    if (source.startsWith('/*', index)) {
      const end = source.indexOf('*/', index + 2);
      index = end < 0 ? source.length : end + 2;
      continue;
    }
    const previous = tokens[tokens.length - 1]?.value;
    const regex = char === '/' && (!previous || ['=', '(', '[', ',', ':', 'return', '!', '?', '{', ';'].includes(previous));
    if (char === '"' || char === "'" || char === '`' || regex) {
      let characterClass = false;
      index++;
      while (index < source.length) {
        const current = source[index++];
        if (current === '\\') { index++; continue; }
        if (regex && current === '[') characterClass = true;
        if (regex && current === ']') characterClass = false;
        if (current === char && !characterClass) break;
      }
      if (regex) while (/[a-z]/i.test(source[index] || '') && index < source.length) index++;
      tokens.push({ value: '<literal>', start, end: index });
      continue;
    }
    if (/[A-Za-z_$]/.test(char)) {
      index++;
      while (index < source.length && /[\w$]/.test(source[index])) index++;
    } else { index++; }
    tokens.push({ value: source.slice(start, index), start, end: index });
  }
  return tokens;
}
module.exports = { tokenize };
