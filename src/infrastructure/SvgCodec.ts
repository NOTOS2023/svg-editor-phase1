import { DOMImplementation, DOMParser, XMLSerializer } from "@xmldom/xmldom";
import type { DocumentReadResult } from "../application/DocumentStore.js";
import type { Shape } from "../domain/Shape.js";
import { ShapeFactory } from "../domain/ShapeFactory.js";
import { SvgDocument } from "../domain/SvgDocument.js";
import { SvgTransform } from "./SvgTransform.js";

/** XML is confined to this adapter. Domain objects never depend on DOM nodes. */
export class SvgCodec {
  private static readonly namespace = "http://www.w3.org/2000/svg";

  constructor(private readonly factory = new ShapeFactory()) {}

  decode(source: string): DocumentReadResult {
    if (/<!\s*(?:DOCTYPE|ENTITY)\b/i.test(source)) {
      throw new Error("invalid SVG: DOCTYPE and entity declarations are not supported");
    }
    const errors: string[] = [];
    let dom: Document | undefined;
    try {
      dom = new DOMParser({
        errorHandler: {
          warning: (message) => { errors.push(String(message)); },
          error: (message) => { errors.push(String(message)); },
          fatalError: (message) => { errors.push(String(message)); },
        },
      }).parseFromString(source, "image/svg+xml");
    } catch { throw new Error("invalid SVG: malformed XML"); }
    if (errors.length > 0 || dom === undefined || dom.documentElement === null) {
      throw new Error("invalid SVG: malformed XML");
    }
    const roots = Array.from({ length: dom.childNodes.length }, (_, i) => dom.childNodes.item(i))
      .filter((node) => node?.nodeType === 1);
    if (roots.length !== 1) throw new Error("invalid SVG: expected one root element");
    const root = dom.documentElement;
    if (root.localName !== "svg") throw new Error("invalid SVG: root must be <svg>");
    this.validateNamespace(root);
    const rootAttributes = new Set(["width", "height", "viewBox", "version", "transform", "xmlns"]);
    for (let i = 0; i < root.attributes.length; i += 1) {
      const attr = root.attributes.item(i)!;
      if (attr.prefix !== "xmlns" && !rootAttributes.has(attr.name)) {
        throw new Error(`unsupported SVG root attribute: ${attr.name}`);
      }
    }
    const viewport = this.readViewport(root);
    const document = new SvgDocument(viewport.width, viewport.height);
    const reserved = new Set<string>();
    const elements = this.descendantElements(root);
    for (const element of elements) {
      this.validateNamespace(element);
      if (!element.hasAttribute("id")) continue;
      const id = element.getAttribute("id") ?? "";
      if (id.length === 0 || /\s/.test(id)) throw new Error(`invalid id: ${id}`);
      if (reserved.has(id)) throw new Error(`id already exists: ${id}`);
      reserved.add(id);
    }
    const warnings: string[] = [];
    const sequences = new Map<string, number>();
    for (const element of this.childElements(root)) {
      document.add(this.readShape(element, reserved, sequences, warnings));
    }
    if (root.hasAttribute("transform")) {
      const transform = SvgTransform.parse(root.getAttribute("transform") ?? "");
      for (const shape of document.children) transform.apply(shape);
    }
    return { document, warnings };
  }

  encode(document: SvgDocument): string {
    const dom = new DOMImplementation().createDocument(SvgCodec.namespace, "svg", null);
    const root = dom.documentElement;
    root.setAttribute("xmlns", SvgCodec.namespace);
    root.setAttribute("width", String(document.width));
    root.setAttribute("height", String(document.height));
    root.setAttribute("viewBox", `0 0 ${document.width} ${document.height}`);
    for (const shape of document.children) {
      root.appendChild(dom.createTextNode("\n  "));
      root.appendChild(this.writeShape(dom, shape, 1));
    }
    if (document.children.length > 0) root.appendChild(dom.createTextNode("\n"));
    return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(dom)}\n`;
  }

  private readShape(
    element: Element,
    reserved: Set<string>,
    sequences: Map<string, number>,
    warnings: string[],
    inherited: Readonly<Record<string, string>> = {},
  ): Shape {
    const type = element.localName;
    let id = element.getAttribute("id") ?? "";
    if (!element.hasAttribute("id")) {
      let sequence = sequences.get(type) ?? 0;
      do { sequence += 1; id = `${type}${sequence}`; } while (reserved.has(id));
      sequences.set(type, sequence);
      reserved.add(id);
      warnings.push(`warning: assigned id ${id} to unnamed <${type}>`);
    }
    const attrs: Record<string, string> = Object.create(null) as Record<string, string>;
    for (let i = 0; i < element.attributes.length; i += 1) {
      const attr = element.attributes.item(i)!;
      if (attr.name === "id" || attr.name === "transform" || attr.name === "xmlns" || attr.prefix === "xmlns") continue;
      if (attr.prefix !== null && attr.prefix !== "") {
        throw new Error(`unsupported SVG attribute: ${attr.name}`);
      }
      attrs[attr.name] = attr.value;
    }
    const children = this.childElements(element, true);
    const text = element.textContent ?? "";
    const shape = this.factory.fromAttributes(type, id, attrs, text);
    if (shape.textContent === undefined && this.hasDirectText(element)) {
      throw new Error(`invalid SVG: unexpected text in <${type}>`);
    }
    if (shape.isContainer()) {
      const presentation = { ...inherited, ...attrs };
      for (const child of children) shape.append(this.readShape(child, reserved, sequences, warnings, presentation));
    } else if (children.length > 0) {
      throw new Error(`unsupported child element in <${type}>`);
    }
    if (element.hasAttribute("transform")) {
      SvgTransform.parse(element.getAttribute("transform") ?? "").apply(shape, inherited);
    }
    return shape;
  }

  private writeShape(dom: Document, shape: Shape, depth: number): Element {
    const element = dom.createElementNS(SvgCodec.namespace, shape.tag);
    element.setAttribute("id", shape.id);
    for (const [name, value] of Object.entries(shape.attributes())) element.setAttribute(name, value);
    if (shape.textContent !== undefined) element.appendChild(dom.createTextNode(shape.textContent));
    for (const child of shape.children) {
      element.appendChild(dom.createTextNode(`\n${"  ".repeat(depth + 1)}`));
      element.appendChild(this.writeShape(dom, child, depth + 1));
    }
    if (shape.children.length > 0) element.appendChild(dom.createTextNode(`\n${"  ".repeat(depth)}`));
    return element;
  }

  private childElements(parent: Element, allowText = false): Element[] {
    const elements: Element[] = [];
    for (let i = 0; i < parent.childNodes.length; i += 1) {
      const node = parent.childNodes.item(i)!;
      if (node.nodeType === 1) elements.push(node as Element);
      else if (!allowText && (node.nodeType === 3 || node.nodeType === 4) && /\S/.test(node.nodeValue ?? "")) {
        throw new Error(`invalid SVG: unexpected text in <${parent.localName}>`);
      }
    }
    return elements;
  }

  private descendantElements(root: Element): Element[] {
    const elements: Element[] = [];
    for (const child of this.childElements(root, true)) {
      elements.push(child, ...this.descendantElements(child));
    }
    return elements;
  }

  private hasDirectText(element: Element): boolean {
    for (let i = 0; i < element.childNodes.length; i += 1) {
      const node = element.childNodes.item(i)!;
      if ((node.nodeType === 3 || node.nodeType === 4) && /\S/.test(node.nodeValue ?? "")) return true;
    }
    return false;
  }

  private validateNamespace(element: Element): void {
    if (element.namespaceURI && element.namespaceURI !== SvgCodec.namespace) {
      throw new Error(`invalid SVG namespace: ${element.namespaceURI}`);
    }
  }

  private readViewport(root: Element): { width: number; height: number } {
    const rawViewBox = root.getAttribute("viewBox");
    const viewBox = rawViewBox === null || rawViewBox === "" ? undefined : rawViewBox.trim().split(/[\s,]+/).map(Number);
    if (viewBox !== undefined && (viewBox.length !== 4 || viewBox.some((part) => !Number.isFinite(part)))) {
      throw new Error("invalid SVG: invalid viewBox");
    }
    const width = this.readLength(root.getAttribute("width"), viewBox?.[2] ?? 800, "width");
    const height = this.readLength(root.getAttribute("height"), viewBox?.[3] ?? 600, "height");
    if (viewBox !== undefined && (viewBox[0] !== 0 || viewBox[1] !== 0 || viewBox[2] !== width || viewBox[3] !== height)) {
      throw new Error("unsupported SVG viewBox: expected 0 0 width height");
    }
    return { width, height };
  }

  private readLength(raw: string | null, fallback: number, name: string): number {
    if (raw === null || raw === "") return fallback;
    const match = /^\s*([+]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)(?:px)?\s*$/.exec(raw);
    const value = match === null ? Number.NaN : Number(match[1]);
    if (!Number.isFinite(value) || value <= 0) throw new Error(`invalid SVG ${name}: ${raw}`);
    return value;
  }
}
