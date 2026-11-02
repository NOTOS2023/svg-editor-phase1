/** A CLI value remembers quoting so a quoted "in" never becomes a clause. */
export class Argument {
  public constructor(private readonly content: string, private readonly quoted = false) {}
  public get value(): string { return this.content; }
  public isKeyword(keyword: string): boolean { return !this.quoted && this.content === keyword; }
}
