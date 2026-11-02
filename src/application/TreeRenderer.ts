import type { Shape } from '../domain/Shape.js';
import type { SvgDocument } from '../domain/SvgDocument.js';

export class TreeRenderer {
  public render(document: SvgDocument, id?: string): readonly string[] {
    if (id !== undefined) {
      const shape = document.get(id);
      return [shape.describe(), ...this.children(shape.children, '')];
    }
    return [`svg (${document.width}x${document.height})`, ...this.children(document.children, '')];
  }

  private children(shapes: readonly Shape[], indent: string): readonly string[] {
    const lines: string[] = [];
    shapes.forEach((shape, index) => {
      const last = index === shapes.length - 1;
      lines.push(`${indent}${last ? '└── ' : '├── '}${shape.describe()}`);
      lines.push(...this.children(shape.children, `${indent}${last ? '    ' : '│   '}`));
    });
    return lines;
  }
}
