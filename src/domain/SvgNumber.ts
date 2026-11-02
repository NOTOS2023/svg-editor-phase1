/** The shared finite decimal/exponent grammar used by SVG geometry and CLI numbers. */
export class SvgNumber {
  static parse(value: string | number, name?: string): number {
    const number = typeof value === 'number' ? value : Number(value);
    const decimal = typeof value === 'number'
      || /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(value);
    if (!decimal || !Number.isFinite(number)) {
      throw new Error(`invalid number${name ? ` for ${name}` : ''}: ${value}`);
    }
    return Object.is(number, -0) ? 0 : number;
  }
}
