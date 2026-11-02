import type { SvgDocument } from "../domain/SvgDocument.js";

export interface DocumentReadResult {
  readonly document: SvgDocument;
  readonly warnings: readonly string[];
}

/** Application port: the editor knows documents and paths, never XML or Node fs. */
export interface DocumentStore {
  read(path: string): DocumentReadResult;
  write(path: string, document: SvgDocument): void;
}
