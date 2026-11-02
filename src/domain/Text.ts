import { GeometryShape } from './GeometryShape.js';

export class Text extends GeometryShape {
  #content: string;
  constructor(id: string, x: number, y: number, content: string) {
    super(id, { x, y }, ['x'], ['y']);
    this.#content = content;
  }
  override get tag(): string { return 'text'; }
  override get textContent(): string { return this.#content; }
  override describe(): string {
    return `text#${this.id}  (${this.value('x')},${this.value('y')}) ${JSON.stringify(this.#content)}${this.styleDescription()}`;
  }
  protected override setSpecificAttribute(name: string, value: string): boolean {
    if (name === 'text') { this.#content = value; return true; }
    return super.setSpecificAttribute(name, value);
  }
  override clone(): Text {
    const copy = new Text(this.id, this.value('x'), this.value('y'), this.#content);
    this.copyAttributesTo(copy);
    return copy;
  }
}
