import { readdirSync, readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

/** Static boundary checks supplement the behavioral tests; no application code runs here. */
export class ArchitectureCheck {
  private readonly root = fileURLToPath(new URL('../../', import.meta.url));
  private readonly errors: string[] = [];
  private filesChecked = 0;

  run(): void {
    const sourceRoot = resolve(this.root, 'src');
    for (const file of this.filesIn(sourceRoot)) this.checkFile(file, sourceRoot);
    if (this.errors.length > 0) {
      for (const error of this.errors) console.error(`architecture error: ${error}`);
      process.exitCode = 1;
      return;
    }
    console.log(`architecture check passed (${this.filesChecked} source files; dependencies, class/file names, no switch)`);
  }

  private filesIn(directory: string): string[] {
    return readdirSync(directory, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))
      .flatMap((entry) => {
        const path = resolve(directory, entry.name);
        return entry.isDirectory() ? this.filesIn(path) : entry.name.endsWith('.ts') ? [path] : [];
      });
  }

  private checkFile(path: string, sourceRoot: string): void {
    this.filesChecked += 1;
    const label = relative(this.root, path).split(sep).join('/');
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const classes: ts.ClassDeclaration[] = [];
    const visit = (node: ts.Node): void => {
      if (ts.isClassDeclaration(node)) classes.push(node);
      if (ts.isSwitchStatement(node)) this.errors.push(`${label}: switch dispatch is forbidden; use registered objects/polymorphism`);
      if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
        if (node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
          this.checkImport(path, sourceRoot, node.moduleSpecifier.text);
        }
      }
      if (ts.isCallExpression(node)) {
        const isDynamicImport = node.expression.kind === ts.SyntaxKind.ImportKeyword;
        const isRequire = ts.isIdentifier(node.expression) && node.expression.text === 'require';
        if (isDynamicImport || isRequire) {
          const specifier = node.arguments[0];
          if (!specifier || !ts.isStringLiteral(specifier)) this.errors.push(`${label}: nonliteral imports cannot be checked`);
          else this.checkImport(path, sourceRoot, specifier.text);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
    if (classes.length > 1) this.errors.push(`${label}: expected at most one class, found ${classes.length}`);
    for (const declaration of classes) {
      if (!declaration.name || declaration.name.text !== basename(path, '.ts')) {
        this.errors.push(`${label}: class name must match the file name`);
      }
    }
  }

  private checkImport(path: string, sourceRoot: string, specifier: string): void {
    const source = relative(sourceRoot, path).split(sep).join('/');
    const layer = source.split('/')[0];
    if (source === 'main.ts') return;
    if (!specifier.startsWith('.')) {
      if (layer === 'domain' || layer === 'application') {
        this.errors.push(`src/${source}: ${layer} must not depend on external module ${specifier}`);
      }
      return;
    }
    const target = relative(sourceRoot, resolve(dirname(path), specifier)).split(sep).join('/');
    const targetLayer = target.split('/')[0];
    const allowed: Readonly<Record<string, readonly string[]>> = {
      domain: ['domain'],
      application: ['application', 'domain'],
      infrastructure: ['infrastructure', 'domain', 'application'],
      cli: ['cli', 'application'],
    };
    if (!layer || !targetLayer || !allowed[layer]?.includes(targetLayer)) {
      this.errors.push(`src/${source}: forbidden dependency on ${specifier}`);
    }
    if (layer === 'infrastructure' && targetLayer === 'application' && target !== 'application/DocumentStore.js') {
      this.errors.push(`src/${source}: infrastructure may depend on application/DocumentStore only`);
    }
  }
}

new ArchitectureCheck().run();
