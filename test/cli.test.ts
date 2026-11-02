import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

class CliHarness {
  readonly directory = mkdtempSync(join(tmpdir(), 'svg-editor-cli-'));
  private readonly entry = fileURLToPath(new URL('../src/main.js', import.meta.url));

  pipe(lines: readonly string[]): { status: number | null; output: string } {
    return this.execute([], `${lines.join('\n')}\n`);
  }

  script(path: string): { status: number | null; output: string } {
    return this.execute(['--script', path]);
  }

  write(path: string, contents: string): void {
    writeFileSync(join(this.directory, path), contents, 'utf8');
  }

  copyExamples(): void {
    cpSync(fileURLToPath(new URL('../../examples', import.meta.url)), join(this.directory, 'examples'), { recursive: true });
  }

  read(path: string): string {
    return readFileSync(join(this.directory, path), 'utf8');
  }

  close(): void {
    rmSync(this.directory, { recursive: true, force: true });
  }

  private execute(args: readonly string[], input?: string): { status: number | null; output: string } {
    const result = spawnSync(process.execPath, [this.entry, ...args], {
      cwd: this.directory,
      input,
      encoding: 'utf8',
      timeout: 10_000,
      windowsHide: true,
    });
    assert.equal(result.error, undefined);
    return { status: result.status, output: `${result.stdout}${result.stderr}`.replaceAll('\r\n', '\n') };
  }
}

test('piped commands accept comments, hexadecimal colors, quoted text, floats, and the literal word in', () => {
  const cli = new CliHarness();
  try {
    const result = cli.pipe([
      '# this is a comment', '   # indented comment', '', 'init',
      'create rect r 1.5 -2 30 40 #abcdef',
      'create text t 5 10 "say \\"hello\\" & 你好"',
      'create text keyword 0 0 "in"', 'show t', 'tree', 'save "drawing with spaces.svg"',
    ]);
    assert.equal(result.status, 0, result.output);
    assert.doesNotMatch(result.output, /error:|svg>/);
    assert.match(result.output, /svg \(800x600\)/);
    const svg = cli.read('drawing with spaces.svg');
    assert.match(svg, /fill="#abcdef"/);
    assert.match(svg, /x="1.5" y="-2"/);
    assert.match(svg, /say .*hello.* &amp; 你好/);
    assert.match(svg, />in<\/text>/);
  } finally {
    cli.close();
  }
});

test('help works before init, while edits require a document and errors remain one line each', () => {
  const cli = new CliHarness();
  try {
    const result = cli.pipe(['help', 'create rect r 0 0 1 1', 'init', 'create box n 0 0 1 1 "title"', 'tree']);
    assert.equal(result.status, 1);
    assert.match(result.output, /create <type>/);
    assert.match(result.output, /error: no document\. use 'init' or 'read' first/);
    assert.match(result.output, /error: unknown shape type: box \(is the plugin loaded\?\)/);
    assert.match(result.output, /svg \(800x600\)/);
    assert.equal(result.output.split('\n').filter((line) => line.startsWith('error:')).length, 2);
    assert.doesNotMatch(result.output, /\bat .*\.js:\d+/);
  } finally {
    cli.close();
  }
});

test('nested Composite movement, undo/redo, ungroup, z-order, deletion and save/read replay together', () => {
  const cli = new CliHarness();
  try {
    const result = cli.pipe([
      'init 400 300', 'create g outer', 'create g inner in outer',
      'create rect a 10 20 30 40 red in inner', 'create text label 12 35 "开始" in inner',
      'create circle c 100 100 10 blue in outer', 'create ellipse e 2 3 4 5', 'create line l 1 2 3 4 black',
      'move inner 5 7', 'undo', 'redo', 'scale inner 2', 'ungroup inner',
      'front a', 'back c', 'delete label', 'undo', 'save drawing.svg', 'read drawing.svg', 'tree', 'show a',
    ]);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /parent=g#outer/);
    const svg = cli.read('drawing.svg');
    assert.match(svg, /<rect id="a" x="30" y="54" width="60" height="80" fill="red"/);
    assert.match(svg, /<text id="label" x="34" y="84">开始<\/text>/);
    assert.doesNotMatch(svg, /id="inner"/);
    assert.ok(svg.indexOf('id="c"') < svg.indexOf('id="a"'));
    assert.match(svg, /<ellipse /);
    assert.match(svg, /<line /);
  } finally {
    cli.close();
  }
});

test('failed edit and failed read preserve redo; canvas query skips history; canvas edit establishes a barrier', () => {
  const cli = new CliHarness();
  try {
    const result = cli.pipe([
      'init', 'create rect r 1 2 3 4', 'move r 10 20', 'undo',
      'set r radius 8', 'read missing.svg', 'canvas', 'redo', 'save state.svg',
      'undo', 'move r 1 1', 'undo', 'canvas 320 240', 'redo', 'save state.svg',
    ]);
    assert.equal(result.status, 1);
    assert.match(result.output, /error: unknown attribute: radius/);
    assert.match(result.output, /error: cannot read file: missing.svg/);
    assert.equal(result.output.split('\n').filter((line) => line === 'error: undo not allowed after io command').length, 2);
    const svg = cli.read('state.svg');
    assert.match(svg, /width="320" height="240"/);
    assert.match(svg, /<rect id="r" x="11" y="22" width="3" height="4"/);
  } finally {
    cli.close();
  }
});

test('a new edit clears redo and invalid command arity leaves existing shapes unchanged', () => {
  const cli = new CliHarness();
  try {
    const result = cli.pipe([
      'init', 'create rect r 1 2 3 4', 'move r 10 20', 'undo', 'set r fill blue', 'redo',
      'move r 8 9 extra', 'create rect bad 0 0 -3 4', 'scale r 0', 'save saved.svg',
    ]);
    assert.equal(result.status, 1);
    assert.match(result.output, /error: scale factor must be positive/);
    const svg = cli.read('saved.svg');
    assert.match(svg, /<rect id="r" x="1" y="2" width="3" height="4" fill="blue"/);
    assert.doesNotMatch(svg, /id="bad"/);
  } finally {
    cli.close();
  }
});

test('missing IDs warn during import, and save with no path reuses the imported path', () => {
  const cli = new CliHarness();
  try {
    cli.write('import.svg', '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="30"><rect width="2" height="3"/><rect id="rect1" width="4" height="5"/></svg>');
    const result = cli.pipe(['read import.svg', 'set rect2 fill green', 'save', 'tree']);
    assert.equal(result.status, 0, result.output);
    assert.match(result.output, /warning: assigned id rect2 to unnamed <rect>/);
    const svg = cli.read('import.svg');
    assert.match(svg, /id="rect2"[^>]*fill="green"/);
    assert.match(svg, /id="rect1"/);
  } finally {
    cli.close();
  }
});

test('script mode continues after errors, reports a failing exit status, and preserves atomic state', () => {
  const cli = new CliHarness();
  try {
    cli.write('session.txt', [
      'init', 'create g scene', 'create g nested in scene', 'create rect r 0 0 5 5 in nested',
      'group invalid r nested', 'ungroup scene', 'addto nested scene', 'create circle r 0 0 1',
      'create rect bad 0 0 1 1 in absent', 'create rect bad 0 0 1 1 in r',
      'save valid.svg', 'tree',
    ].join('\n'));
    const result = cli.script('session.txt');
    assert.equal(result.status, 1);
    assert.match(result.output, /error: cannot group a container into its own descendant: nested/);
    assert.match(result.output, /error: cannot ungroup top-level container: scene/);
    assert.match(result.output, /error: id already exists: r/);
    assert.match(result.output, /error: no such container: absent/);
    assert.match(result.output, /error: not a container: r/);
    assert.ok(existsSync(join(cli.directory, 'valid.svg')));
    const svg = cli.read('valid.svg');
    assert.doesNotMatch(svg, /id="invalid"|id="bad"/);
    assert.match(svg, /<g id="scene">\s*<g id="nested">\s*<rect id="r"/);
  } finally {
    cli.close();
  }
});

test('published demonstration scripts execute and generate browser-readable SVG files', () => {
  const cli = new CliHarness();
  try {
    cli.copyExamples();
    for (const name of ['flowchart', 'demo', 'import']) {
      const result = cli.script(`examples/${name}.txt`);
      assert.equal(result.status, 0, `${name}: ${result.output}`);
      assert.doesNotMatch(result.output, /error:/);
    }
    assert.match(cli.read('examples/flowchart.svg'), /处理数据 v2/);
    assert.match(cli.read('examples/demo.svg'), /svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    assert.match(cli.read('examples/imported.svg'), /id="rect1"/);
  } finally {
    cli.close();
  }
});
