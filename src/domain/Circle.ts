import { GeometryShape } from './GeometryShape.js';

export class Circle extends GeometryShape {
  constructor(id: string, cx: number, cy: number, r: number) {
    super(id, { cx, cy, r }, ['cx'], ['cy'], ['r']);
  }
  override get tag(): string { return 'circle'; }
  override describe(): string {
    return `circle#${this.id}  cx=${this.value('cx')} cy=${this.value('cy')} r=${this.value('r')}${this.styleDescription()}`;
  }
  override clone(): Circle {
    const copy = new Circle(this.id, this.value('cx'), this.value('cy'), this.value('r'));
    this.copyAttributesTo(copy);
    return copy;
  }
}
