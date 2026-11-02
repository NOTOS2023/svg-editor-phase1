import type { Group } from './Group.js';
import { SvgNumber } from './SvgNumber.js';

/** A polymorphic component. Mutable SVG state is only exposed as detached values. */
export abstract class Shape {
  readonly #id: string;
  readonly #attributes = new Map<string, string>();

  protected constructor(id: string) {
    if (!id || /\s/.test(id)) throw new Error(`invalid id: ${id}`);
    this.#id = id;
  }

  get id(): string { return this.#id; }
  abstract get tag(): string;
  get children(): readonly Shape[] { return []; }
  get textContent(): string | undefined { return undefined; }
  isContainer(): this is Group { return false; }
  abstract move(dx: number, dy: number): void;
  abstract scale(factor: number): void;
  abstract describe(): string;
  abstract clone(): Shape;

  attributes(): Readonly<Record<string, string>> {
    return Object.fromEntries(this.#attributes);
  }

  setAttribute(name: string, value: string): void {
    if (name === 'fill' || name === 'stroke') {
      this.#attributes.set(name, value);
      return;
    }
    if (name === 'stroke-width') {
      const width = this.number(value, name);
      if (width < 0) throw new Error('stroke-width must be non-negative');
      this.#attributes.set(name, this.format(width));
      return;
    }
    if (!this.setSpecificAttribute(name, value)) throw new Error(`unknown attribute: ${name}`);
  }

  /** Import preserves presentation/metadata attributes; interactive set stays whitelisted. */
  importAttribute(name: string, value: string): void {
    if (name === 'id') throw new Error('unknown attribute: id');
    if (name === 'fill' || name === 'stroke' || name === 'stroke-width') {
      this.setAttribute(name, value);
    } else if (!this.setSpecificAttribute(name, value)) {
      this.#attributes.set(name, value);
    }
  }

  protected setSpecificAttribute(_name: string, _value: string): boolean { return false; }

  protected copyAttributesTo(target: Shape): void {
    for (const [name, value] of this.#attributes) target.importAttribute(name, value);
  }

  protected styleDescription(): string {
    return ['fill', 'stroke', 'stroke-width']
      .filter(name => this.#attributes.has(name))
      .map(name => ` ${name}=${this.#attributes.get(name)}`)
      .join('');
  }

  protected number(value: string | number, name: string): number {
    return SvgNumber.parse(value, name);
  }

  protected positiveScale(factor: number): void {
    if (!Number.isFinite(factor) || factor <= 0) throw new Error('scale factor must be positive');
  }

  protected format(value: number): string { return String(Object.is(value, -0) ? 0 : value); }
}
