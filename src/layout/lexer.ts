import { LayoutError } from './errors';
import type { SourceLocation } from './types';

export interface Token {
  kind: 'identifier' | 'number' | 'string' | 'symbol' | 'eof';
  value: string | number;
  source: SourceLocation;
}

/** Streaming lexer: layout input is data and is never evaluated as JavaScript. */
export class LayoutLexer {
  private offset = 0;
  private line = 1;
  private column = 1;
  nodeId = '0';

  constructor(private readonly input: string) {}

  private location(): SourceLocation {
    return { offset: this.offset, line: this.line, column: this.column };
  }

  private advance(length = 1): void {
    for (let index = 0; index < length; index++) {
      const character = this.input[this.offset++];
      if (character === '\r' || (character === '\n' && this.input[this.offset - 2] !== '\r')) {
        this.line++;
        this.column = 1;
      } else if (character !== '\n') {
        this.column++;
      }
    }
  }

  private fail(message: string, source = this.location()): never {
    throw new LayoutError({ code: 'SYNTAX_ERROR', message, nodeId: this.nodeId, source });
  }

  next(): Token {
    while (this.offset < this.input.length) {
      if (/\s/.test(this.input[this.offset]!)) {
        this.advance();
      } else if (this.input.startsWith('//', this.offset)) {
        while (this.offset < this.input.length && !/[\r\n]/.test(this.input[this.offset]!)) this.advance();
      } else if (this.input.startsWith('/*', this.offset)) {
        const source = this.location();
        this.advance(2);
        while (!this.input.startsWith('*/', this.offset)) {
          if (this.offset === this.input.length) this.fail('Close the block comment with */.', source);
          if (this.input.startsWith('/*', this.offset)) this.fail('Block comments cannot be nested.');
          this.advance();
        }
        this.advance(2);
      } else break;
    }

    const source = this.location();
    if (this.offset === this.input.length) return { kind: 'eof', value: '', source };
    const character = this.input[this.offset]!;
    if ('[](),:'.includes(character)) {
      this.advance();
      return { kind: 'symbol', value: character, source };
    }
    if (character === '"') {
      this.advance();
      let escaped = false;
      while (this.offset < this.input.length) {
        const next = this.input[this.offset]!;
        this.advance();
        if (next === '"' && !escaped) {
          const raw = this.input.slice(source.offset, this.offset);
          try {
            return { kind: 'string', value: JSON.parse(raw) as string, source };
          } catch {
            this.fail('Use a valid JSON double-quoted string and escape control characters.', source);
          }
        }
        escaped = next === '\\' && !escaped;
      }
      this.fail('Close the double-quoted string.', source);
    }
    const remaining = this.input.slice(this.offset);
    const number = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/.exec(remaining)?.[0];
    if (number) {
      this.advance(number.length);
      const value = Number(number);
      if (!Number.isFinite(value)) this.fail('Numbers must be finite.', source);
      return { kind: 'number', value, source };
    }
    const identifier = /^[A-Za-z_][A-Za-z0-9_]*/.exec(remaining)?.[0];
    if (identifier) {
      this.advance(identifier.length);
      return { kind: 'identifier', value: identifier, source };
    }
    this.fail(`Unexpected character ${JSON.stringify(character)}; use a layout node or literal value.`, source);
  }
}
