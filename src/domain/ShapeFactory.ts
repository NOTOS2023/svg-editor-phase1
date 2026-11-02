import { Shape } from './Shape.js';
import { Rect } from './Rect.js';
import { Circle } from './Circle.js';
import { Ellipse } from './Ellipse.js';
import { Line } from './Line.js';
import { Text } from './Text.js';
import { Group } from './Group.js';
import { SvgNumber } from './SvgNumber.js';

interface ShapeDefinition {
  readonly geometry: readonly string[];
  readonly required: number;
  readonly style?: string;
  readonly build: (id: string, parameters: readonly string[]) => Shape;
}

/** The one allowed shape-name dispatch boundary. Replace registrations with providers in Phase 2. */
export class ShapeFactory {
  readonly #definitions = new Map<string, ShapeDefinition>([
    ['rect', {
      geometry: ['x', 'y', 'width', 'height'], required: 4, style: 'fill',
      build: (id, p) => new Rect(id, this.numeric(p, 0), this.numeric(p, 1), this.numeric(p, 2), this.numeric(p, 3)),
    }],
    ['circle', {
      geometry: ['cx', 'cy', 'r'], required: 3, style: 'fill',
      build: (id, p) => new Circle(id, this.numeric(p, 0), this.numeric(p, 1), this.numeric(p, 2)),
    }],
    ['ellipse', {
      geometry: ['cx', 'cy', 'rx', 'ry'], required: 4, style: 'fill',
      build: (id, p) => new Ellipse(id, this.numeric(p, 0), this.numeric(p, 1), this.numeric(p, 2), this.numeric(p, 3)),
    }],
    ['line', {
      geometry: ['x1', 'y1', 'x2', 'y2'], required: 4, style: 'stroke',
      build: (id, p) => new Line(id, this.numeric(p, 0), this.numeric(p, 1), this.numeric(p, 2), this.numeric(p, 3)),
    }],
    ['text', {
      geometry: ['x', 'y'], required: 3,
      build: (id, p) => new Text(id, this.numeric(p, 0), this.numeric(p, 1), p[2] ?? ''),
    }],
    ['g', { geometry: [], required: 0, build: id => new Group(id) }],
  ]);

  create(type: string, id: string, parameters: readonly string[]): Shape {
    const definition = this.definition(type);
    const maximum = definition.required + (definition.style ? 1 : 0);
    if (parameters.length < definition.required || parameters.length > maximum) {
      throw new Error(`invalid parameters for ${type}: expected ${definition.required}${maximum > definition.required ? ` or ${maximum}` : ''}, got ${parameters.length}`);
    }
    const shape = definition.build(id, parameters);
    const style = parameters[definition.required];
    if (definition.style && style !== undefined) shape.setAttribute(definition.style, style);
    return shape;
  }

  fromAttributes(type: string, id: string, attributes: Readonly<Record<string, string>>, text = ''): Shape {
    const definition = this.definition(type);
    const parameters = definition.geometry.map(name => attributes[name] ?? '0');
    if (definition.required > definition.geometry.length) parameters.push(text);
    const shape = definition.build(id, parameters);
    for (const [name, value] of Object.entries(attributes)) shape.importAttribute(name, value);
    return shape;
  }

  private definition(type: string): ShapeDefinition {
    const result = this.#definitions.get(type);
    if (!result) throw new Error(`unknown shape type: ${type} (is the plugin loaded?)`);
    return result;
  }

  private numeric(parameters: readonly string[], index: number): number {
    const token = parameters[index];
    return SvgNumber.parse(token ?? '');
  }
}
