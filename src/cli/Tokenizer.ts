import { Argument } from '../application/Argument.js';

export class Tokenizer {
  public tokenize(line: string): readonly Argument[] {
    if (line.trimStart().startsWith('#')) { return []; }
    const tokens: Argument[] = [];
    let index = 0;
    while (index < line.length) {
      while (index < line.length && /\s/.test(line[index]!)) { index++; }
      if (index >= line.length) { break; }
      if (line[index] === '"') {
        index++;
        let value = '', closed = false;
        while (index < line.length) {
          const char = line[index++]!;
          if (char === '"') { closed = true; break; }
          if (char === '\\' && (line[index] === '"' || line[index] === '\\')) {
            value += line[index++];
          } else { value += char; }
        }
        if (!closed) { throw new Error('unterminated double quote'); }
        if (index < line.length && !/\s/.test(line[index]!)) { throw new Error('expected whitespace after closing quote'); }
        tokens.push(new Argument(value, true));
      } else {
        let value = '';
        while (index < line.length && !/\s/.test(line[index]!)) {
          if (line[index] === '"') { throw new Error('double quotes must surround the whole argument'); }
          value += line[index++];
        }
        tokens.push(new Argument(value));
      }
    }
    return tokens;
  }
}
