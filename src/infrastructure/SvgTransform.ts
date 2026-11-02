import type { Shape } from "../domain/Shape.js";

/** The Phase 1 transform subset, reduced to p' = scale * p + translation. */
export class SvgTransform {
  private static readonly scaledAttributes = new Set([
    "fill", "stroke", "stroke-width", "font-size", "text-anchor", "font-family", "font-weight", "font-style",
    "opacity", "fill-opacity", "stroke-opacity", "stroke-linecap", "stroke-linejoin", "class", "role",
  ]);
  private static readonly geometry = new Set(["x", "y", "width", "height", "cx", "cy", "r", "rx", "ry", "x1", "y1", "x2", "y2"]);
  private constructor(
    private readonly factor: number,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  static parse(source: string): SvgTransform {
    const pattern = /([A-Za-z]+)\s*\(([^)]*)\)/g;
    let factor = 1;
    let dx = 0;
    let dy = 0;
    let end = 0;
    let found = false;
    for (const match of source.matchAll(pattern)) {
      found = true;
      const start = match.index ?? 0;
      if (!/^[\s,]*$/.test(source.slice(end, start))) {
        throw new Error(`unsupported transform: ${source}`);
      }
      const name = match[1];
      const raw = (match[2] ?? "").trim();
      const parts = raw.length === 0 ? [] : raw.split(/[\s,]+/);
      if (parts.some((part) => !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/.test(part))) {
        throw new Error(`unsupported transform: ${source}`);
      }
      const values = parts.map(Number);
      if (values.some((value) => !Number.isFinite(value))) {
        throw new Error(`unsupported transform: ${source}`);
      }
      if (name === "translate" && (values.length === 1 || values.length === 2)) {
        dx += factor * values[0]!;
        dy += factor * (values[1] ?? 0);
      } else if (
        name === "scale" && (values.length === 1 || values.length === 2)
        && values[0]! > 0 && (values[1] === undefined || values[1] === values[0])
      ) {
        factor *= values[0]!;
      } else {
        throw new Error(`unsupported transform: ${source}`);
      }
      if (![factor, dx, dy].every(Number.isFinite) || factor <= 0) {
        throw new Error(`unsupported transform: ${source}`);
      }
      end = start + match[0].length;
    }
    if (!found || !/^[\s,]*$/.test(source.slice(end))) {
      throw new Error(`unsupported transform: ${source}`);
    }
    return new SvgTransform(factor, dx, dy);
  }

  apply(shape: Shape, inherited: Readonly<Record<string, string>> = {}): void {
    // SVG transforms also scale text and strokes; CLI scale only changes geometry.
    // Materialize inherited defaults on this subtree, then scale explicit overrides.
    if (this.factor !== 1) {
      this.validateScaledAttributes(shape);
      const attrs = shape.attributes();
      if (attrs["font-size"] === undefined) shape.importAttribute("font-size", inherited["font-size"] ?? "16");
      if (attrs["stroke-width"] === undefined) shape.importAttribute("stroke-width", inherited["stroke-width"] ?? "1");
      this.scalePresentation(shape);
    }
    shape.scale(this.factor);
    shape.move(this.dx, this.dy);
  }

  private scalePresentation(shape: Shape): void {
    const attrs = shape.attributes();
    for (const name of ["font-size", "stroke-width"]) {
      const raw = attrs[name];
      if (raw === undefined) continue;
      const match = /^([+]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:px)?$/.exec(raw);
      if (match === null) throw new Error(`unsupported transformed ${name}: ${raw}`);
      const scaled = Number(match[1]) * this.factor;
      if (!Number.isFinite(scaled)) throw new Error(`invalid transformed ${name}: ${raw}`);
      shape.importAttribute(name, String(scaled));
    }
    for (const child of shape.children) this.scalePresentation(child);
  }

  private validateScaledAttributes(shape: Shape): void {
    for (const [name, value] of Object.entries(shape.attributes())) {
      if (SvgTransform.scaledAttributes.has(name) || name.startsWith("data-") || name.startsWith("aria-")) continue;
      if (SvgTransform.geometry.has(name)) {
        // Ask the component whether this is its geometry. For example ellipse rx
        // scales through GeometryShape, whereas imported rect corner rx does not.
        try { shape.setAttribute(name, value); continue; } catch { /* Reject below. */ }
      }
      throw new Error(`unsupported scaled SVG attribute: ${name}`);
    }
    for (const child of shape.children) this.validateScaledAttributes(child);
  }
}
