import test from 'node:test';
import assert from 'node:assert/strict';
import { CliEngine } from '../src/cli/CliEngine.js';
import { EditorSession } from '../src/application/EditorSession.js';
import type { DocumentStore } from '../src/application/DocumentStore.js';
import type { SvgDocument } from '../src/domain/SvgDocument.js';

class MemoryStore implements DocumentStore {
  private files = new Map<string, SvgDocument>();
  public read(path: string): { document: SvgDocument; warnings: readonly string[] } {
    const document = this.files.get(path);
    if (!document) { throw new Error(`cannot read file: ${path}`); }
    return { document: document.clone(), warnings: [] };
  }
  public write(path: string, document: SvgDocument): void {
    if (path === 'fail.svg') { throw new Error(`cannot write file: ${path}`); }
    this.files.set(path, document.clone());
  }
}

class Harness {
  public readonly engine = new CliEngine(new EditorSession(new MemoryStore()));
  public run(line: string): string { return this.engine.execute(line).join('\n'); }
  public init(): void { this.run('init'); }
}

test('no document guard, help, comments, and strict double-quoted tokens', () => {
  const h = new Harness();
  assert.equal(h.run('tree'), "error: no document. use 'init' or 'read' first");
  assert.match(h.run('help'), /create <type>/);
  assert.equal(h.run('  # comment'), '');
  h.init();
  assert.equal(h.run('create text t 1 2 "in"'), 'text#t created');
  assert.match(h.run('set t text "a \\"quote\\" and \\\\ path"'), /updated/);
  assert.match(h.run('show t'), /quote/);
  assert.equal(h.run('create text x 0 0 "oops'), 'error: unterminated double quote');
});

test('failed edits and display commands preserve redo; successful edit clears redo', () => {
  const h = new Harness(); h.init();
  h.run('create rect r 0 0 10 10 #eee');
  h.run('move r 12 3');
  h.run('undo');
  const before = h.run('tree');
  assert.match(h.run('scale r 0'), /^error: scale factor must be positive$/);
  h.run('canvas'); h.run('show r'); h.run('help');
  assert.equal(h.run('tree'), before);
  assert.match(h.run('redo'), /moved/);
  assert.match(h.run('show r'), /x=12/);
  h.run('undo'); h.run('set r fill red');
  assert.equal(h.run('redo'), 'error: nothing to redo');
});

test('document operations block undo/redo, query and failed IO do not', () => {
  const h = new Harness(); h.init();
  assert.equal(h.run('undo'), 'error: undo not allowed after io command');
  h.run('create g g1');
  assert.equal(h.run('save fail.svg'), 'error: cannot write file: fail.svg');
  assert.equal(h.run('read missing.svg'), 'error: cannot read file: missing.svg');
  h.run('undo');
  assert.match(h.run('redo'), /created/);
  h.run('save good.svg');
  assert.equal(h.run('redo'), 'error: undo not allowed after io command');
  h.run('create circle c 2 3 4'); h.run('canvas 200 300');
  assert.equal(h.run('undo'), 'error: undo not allowed after io command');
  h.run('create g another'); h.run('read good.svg');
  assert.equal(h.run('undo'), 'error: undo not allowed after io command');
  assert.equal(h.run('show another'), 'error: no such shape: another');
});

test('one group/delete/ungroup command is one complete undo unit', () => {
  const h = new Harness(); h.init();
  h.run('create g outer'); h.run('create rect a 1 2 3 4 in outer');
  h.run('create circle b 5 6 7 in outer');
  const before = h.run('tree');
  h.run('group nested b a');
  assert.match(h.run('tree nested'), /rect#a[\s\S]*circle#b/);
  h.run('undo'); assert.equal(h.run('tree'), before);
  h.run('redo'); const grouped = h.run('tree');
  h.run('ungroup nested'); h.run('undo'); assert.equal(h.run('tree'), grouped);
  h.run('delete outer'); h.run('undo'); assert.equal(h.run('tree'), grouped);
});

test('every error is a single line and preserves the complete document', () => {
  const h = new Harness(); h.init(); h.run('create rect r 0 0 10 10');
  const before = h.run('tree');
  const invalid = ['create rect r 0 0 1 1', 'set r id changed', 'move r Infinity 0',
    'set r width -1', 'canvas 0 10', 'create box x 0 0 1 1 "label"',
    'create circle c 0 0 1 in missing', 'create g child in r', 'move r 1 2 extra'];
  for (const line of invalid) {
    assert.match(h.run(line), /^error: [^\r\n]+$/);
    assert.equal(h.run('tree'), before, line);
  }
});
