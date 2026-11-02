import { SvgDocument } from '../domain/SvgDocument.js';
import { CommandHistory } from './CommandHistory.js';
import type { DocumentStore } from './DocumentStore.js';
import type { EditCommand } from './EditCommand.js';

export class EditorSession {
  private current: SvgDocument | undefined;
  private currentPath: string | undefined;
  private readonly history = new CommandHistory();

  public constructor(private readonly store: DocumentStore) {}

  public get document(): SvgDocument {
    if (!this.current) { throw new Error("no document. use 'init' or 'read' first"); }
    return this.current;
  }

  public init(width = 800, height = 600): string {
    const document = new SvgDocument(width, height);
    this.current = document;
    this.currentPath = undefined;
    this.history.barrier();
    return `canvas ${width}x${height} created`;
  }

  public read(path: string): readonly string[] {
    const result = this.store.read(path);
    this.current = result.document;
    this.currentPath = path;
    this.history.barrier();
    return [...result.warnings, `read ${path} (${result.document.count()} elements)`];
  }

  public save(path?: string): string {
    const document = this.document;
    const target = path ?? this.currentPath;
    if (!target) { throw new Error("no file path. use 'save <file.svg>' first"); }
    this.store.write(target, document);
    this.currentPath = target;
    this.history.barrier();
    return `saved to ${target} (${document.count()} elements)`;
  }

  public resize(width: number, height: number): string {
    const draft = this.document.clone();
    draft.resize(width, height);
    this.current = draft;
    this.history.barrier();
    return `canvas resized to ${width}x${height}`;
  }

  public commitEdit(command: EditCommand, document: SvgDocument): void {
    this.current = document;
    this.history.record(command);
  }

  public restore(document: SvgDocument): void { this.current = document; }
  public undo(): string { void this.document; return this.history.undo(this); }
  public redo(): string { void this.document; return this.history.redo(this); }
}
