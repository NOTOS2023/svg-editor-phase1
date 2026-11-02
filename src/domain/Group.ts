import { Shape } from './Shape.js';

export class Group extends Shape {
  #children: Shape[] = [];
  constructor(id: string) { super(id); }
  override get tag(): string { return 'g'; }
  override get children(): readonly Shape[] { return [...this.#children]; }
  override isContainer(): this is Group { return true; }
  append(shape: Shape): void { this.insert(this.#children.length, shape); }
  insert(index: number, shape: Shape): void {
    if (shape === this || this.contains(shape, this)) throw new Error(`cannot add a container into its own descendant: ${shape.id}`);
    if (this.#children.includes(shape)) throw new Error(`id already exists: ${shape.id}`);
    this.#children.splice(index, 0, shape);
  }
  remove(shape: Shape): void {
    const index = this.indexOf(shape);
    if (index < 0) throw new Error(`no such shape: ${shape.id}`);
    this.#children.splice(index, 1);
  }
  indexOf(shape: Shape): number { return this.#children.indexOf(shape); }
  override move(dx: number, dy: number): void {
    this.number(dx, 'dx'); this.number(dy, 'dy');
    const next = this.#children.map(child => child.clone());
    for (const child of next) child.move(dx, dy);
    this.#children = next;
  }
  override scale(factor: number): void {
    this.positiveScale(factor);
    const next = this.#children.map(child => child.clone());
    for (const child of next) child.scale(factor);
    this.#children = next;
  }
  override describe(): string { return `g#${this.id}${this.styleDescription()}`; }
  override clone(): Group {
    const copy = new Group(this.id);
    this.copyAttributesTo(copy);
    for (const child of this.#children) copy.append(child.clone());
    return copy;
  }
  private contains(root: Shape, sought: Shape): boolean {
    return root === sought || root.children.some(child => this.contains(child, sought));
  }
}
