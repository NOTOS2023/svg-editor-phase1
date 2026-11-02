import { Shape } from './Shape.js';

/** Shared geometry mechanics, parameterized by each concrete shape's own geometry schema. */
export abstract class GeometryShape extends Shape {
  #geometry: Map<string, number>;
  readonly #horizontal: readonly string[];
  readonly #vertical: readonly string[];
  readonly #nonNegative: ReadonlySet<string>;

  protected constructor(
    id: string,
    geometry: Readonly<Record<string, number>>,
    horizontal: readonly string[],
    vertical: readonly string[],
    nonNegative: readonly string[] = [],
  ) {
    super(id);
    this.#horizontal = horizontal;
    this.#vertical = vertical;
    this.#nonNegative = new Set(nonNegative);
    this.#geometry = new Map();
    for (const [key, value] of Object.entries(geometry)) {
      this.#geometry.set(key, this.validGeometry(key, value));
    }
  }

  override attributes(): Readonly<Record<string, string>> {
    return {
      ...Object.fromEntries([...this.#geometry].map(([key, value]) => [key, this.format(value)])),
      ...super.attributes(),
    };
  }

  override move(dx: number, dy: number): void {
    this.number(dx, 'dx');
    this.number(dy, 'dy');
    const next = new Map(this.#geometry);
    for (const key of this.#horizontal) next.set(key, this.validGeometry(key, this.value(key) + dx));
    for (const key of this.#vertical) next.set(key, this.validGeometry(key, this.value(key) + dy));
    this.#geometry = next;
  }

  override scale(factor: number): void {
    this.positiveScale(factor);
    const next = new Map<string, number>();
    for (const [key, value] of this.#geometry) next.set(key, this.validGeometry(key, value * factor));
    this.#geometry = next;
  }

  protected override setSpecificAttribute(name: string, value: string): boolean {
    if (!this.#geometry.has(name)) return false;
    this.#geometry.set(name, this.validGeometry(name, this.number(value, name)));
    return true;
  }

  protected value(name: string): number {
    const value = this.#geometry.get(name);
    if (value === undefined) throw new Error(`unknown geometry: ${name}`);
    return value;
  }

  private validGeometry(name: string, value: number): number {
    const result = this.number(value, name);
    if (this.#nonNegative.has(name) && result < 0) throw new Error(`${name} must be non-negative`);
    return result;
  }
}
