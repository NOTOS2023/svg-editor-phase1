import { Shape } from './Shape.js';
import { Group } from './Group.js';

interface ShapeLocation {
  readonly shape: Shape;
  readonly parent: Group | undefined;
  readonly index: number;
}

/** Owns a scene forest and its globally unique, case-sensitive addressing invariant. */
export class SvgDocument {
  #width: number;
  #height: number;
  readonly #children: Shape[] = [];

  constructor(width = 800, height = 600) {
    this.#width = this.dimension(width, 'width');
    this.#height = this.dimension(height, 'height');
  }
  get width(): number { return this.#width; }
  get height(): number { return this.#height; }
  get children(): readonly Shape[] { return [...this.#children]; }

  resize(width: number, height: number): void {
    const nextWidth = this.dimension(width, 'width');
    const nextHeight = this.dimension(height, 'height');
    this.#width = nextWidth; this.#height = nextHeight;
  }

  get(id: string): Shape { return this.locate(id).shape; }

  getContainer(id: string): Group {
    const location = this.find(id);
    if (!location) throw new Error(`no such container: ${id}`);
    if (!location.shape.isContainer()) throw new Error(`not a container: ${id}`);
    return location.shape;
  }

  add(shape: Shape, parentId?: string): void {
    const parent = parentId === undefined ? undefined : this.getContainer(parentId);
    const existing = new Set(this.all().map(item => item.id));
    for (const item of this.flatten([shape])) {
      if (existing.has(item.id)) throw new Error(`id already exists: ${item.id}`);
      existing.add(item.id);
    }
    this.insert(parent, parent?.children.length ?? this.#children.length, shape);
  }

  delete(id: string): Shape {
    const location = this.locate(id);
    this.detach(location);
    return location.shape;
  }

  group(newId: string, ids: readonly string[]): Group {
    if (this.find(newId)) throw new Error(`id already exists: ${newId}`);
    const group = new Group(newId);
    if (ids.length === 0) throw new Error('group requires at least one shape');
    const selected = new Set<string>();
    for (const id of ids) {
      this.get(id);
      if (selected.has(id)) throw new Error(`duplicate shape id: ${id}`);
      selected.add(id);
    }
    const ordered = this.all().filter(shape => selected.has(shape.id));
    for (const shape of ordered) {
      if (shape.children.some(child => this.flatten([child]).some(item => selected.has(item.id)))) {
        throw new Error(`cannot group a container into its own descendant: ${shape.id}`);
      }
    }
    const first = ordered[0];
    if (!first) throw new Error('group requires at least one shape');
    const destination = this.locate(first.id);
    for (const shape of ordered) {
      this.detach(this.locate(shape.id));
      group.append(shape);
    }
    this.insert(destination.parent, destination.index, group);
    return group;
  }

  ungroup(id: string): void {
    const location = this.locate(id);
    if (!location.shape.isContainer()) throw new Error(`not a container: ${id}`);
    if (!location.parent) throw new Error(`cannot ungroup top-level container: ${id}`);
    const children = location.shape.children;
    this.detach(location);
    for (const [offset, child] of children.entries()) this.insert(location.parent, location.index + offset, child);
  }

  addTo(gid: string, id: string): void {
    const target = this.getContainer(gid);
    const location = this.locate(id);
    if (this.flatten([location.shape]).includes(target)) {
      throw new Error(`cannot add a container into its own descendant: ${id}`);
    }
    this.detach(location);
    target.append(location.shape);
  }

  front(id: string): void {
    const location = this.locate(id);
    this.detach(location);
    this.insert(location.parent, location.parent?.children.length ?? this.#children.length, location.shape);
  }

  back(id: string): void {
    const location = this.locate(id);
    this.detach(location);
    this.insert(location.parent, 0, location.shape);
  }

  parentLabel(id: string): string {
    const parent = this.locate(id).parent;
    return parent ? `g#${parent.id}` : 'svg';
  }

  count(): number { return this.all().length; }
  all(): readonly Shape[] { return this.flatten(this.#children); }

  clone(): SvgDocument {
    const copy = new SvgDocument(this.#width, this.#height);
    for (const child of this.#children) copy.add(child.clone());
    return copy;
  }

  private dimension(value: number, name: string): number {
    if (!Number.isFinite(value) || value <= 0) throw new Error(`canvas ${name} must be positive`);
    return value;
  }

  private flatten(shapes: readonly Shape[]): Shape[] {
    return shapes.flatMap(shape => [shape, ...this.flatten(shape.children)]);
  }

  private find(id: string, children: readonly Shape[] = this.#children, parent?: Group): ShapeLocation | undefined {
    for (const [index, shape] of children.entries()) {
      if (shape.id === id) return { shape, parent, index };
      if (shape.isContainer()) {
        const found = this.find(id, shape.children, shape);
        if (found) return found;
      }
    }
    return undefined;
  }

  private locate(id: string): ShapeLocation {
    const location = this.find(id);
    if (!location) throw new Error(`no such shape: ${id}`);
    return location;
  }

  private detach(location: ShapeLocation): void {
    if (location.parent) location.parent.remove(location.shape);
    else this.#children.splice(location.index, 1);
  }

  private insert(parent: Group | undefined, index: number, shape: Shape): void {
    if (parent) parent.insert(index, shape);
    else this.#children.splice(index, 0, shape);
  }
}
