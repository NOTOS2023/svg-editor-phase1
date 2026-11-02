import { Argument } from './Argument.js';
import { SvgNumber } from '../domain/SvgNumber.js';

export class CommandArguments {
  public constructor(private readonly tokens: readonly Argument[], private readonly usage: string) {}
  public get length(): number { return this.tokens.length; }
  public expectCount(min: number, max = min): void {
    if (this.length < min || this.length > max) { throw new Error(`usage: ${this.usage}`); }
  }
  public value(index: number): string {
    const token = this.tokens[index];
    if (!token) { throw new Error(`usage: ${this.usage}`); }
    return token.value;
  }
  public number(index: number): number {
    return SvgNumber.parse(this.value(index));
  }
  public isKeyword(index: number, keyword: string): boolean {
    return this.tokens[index]?.isKeyword(keyword) ?? false;
  }
  public values(start = 0, end = this.length): readonly string[] {
    return this.tokens.slice(start, end).map(token => token.value);
  }
}
