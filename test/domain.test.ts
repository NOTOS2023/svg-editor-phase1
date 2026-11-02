import test from 'node:test';
import assert from 'node:assert/strict';
import { ShapeFactory } from '../src/domain/ShapeFactory.js';
import { SvgDocument } from '../src/domain/SvgDocument.js';
import { Group } from '../src/domain/Group.js';
import { Rect } from '../src/domain/Rect.js';
import { Circle } from '../src/domain/Circle.js';

const factory = new ShapeFactory();

test('factory creates every built-in type with absent default styles', () => {
  const cases = [
    ['rect', ['1', '2', '3', '4']], ['circle', ['1', '2', '3']],
    ['ellipse', ['1', '2', '3', '4']], ['line', ['1', '2', '3', '4']],
    ['text', ['1', '2', '开始 "A&B"']], ['g', []],
  ] as const;
  for (const [type, parameters] of cases) {
    const shape = factory.create(type, type, parameters);
    assert.equal(shape.tag, type);
    assert.equal(shape.attributes().fill, undefined);
    assert.equal(shape.attributes().stroke, undefined);
    assert.equal(shape.clone().describe(), shape.describe());
  }
  assert.equal(factory.create('text', 't', ['0', '0', '']).textContent, '');
  assert.equal(factory.create('line', 'l', ['0', '1', '2', '3', 'red']).attributes().stroke, 'red');
});

test('unsupported types, invalid parameter counts and invalid numbers are rejected', () => {
  assert.throws(() => factory.create('box', 'b', []), /unknown shape type: box \(is the plugin loaded\?\)/);
  assert.throws(() => factory.create('rect', 'r', ['0']), /invalid parameters/);
  assert.throws(() => factory.create('g', 'g', ['extra']), /invalid parameters/);
  assert.throws(() => factory.create('circle', 'c', ['NaN', '0', '1']), /invalid number/);
  assert.throws(() => new Rect('bad id', 0, 0, 1, 1), /invalid id/);
  assert.throws(() => new Circle('c', 0, 0, -1), /r must be non-negative/);
});

test('each geometric component moves all positions and scales positions and sizes', () => {
  const rect = factory.create('rect', 'r', ['10', '20', '30', '40']);
  rect.move(-2.5, 3.5); rect.scale(2);
  assert.deepEqual(rect.attributes(), { x: '15', y: '47', width: '60', height: '80' });
  const line = factory.create('line', 'l', ['0', '1', '2', '3']);
  line.move(10, 20); line.scale(0.5);
  assert.deepEqual(line.attributes(), { x1: '5', y1: '10.5', x2: '6', y2: '11.5' });
  const ellipse = factory.create('ellipse', 'e', ['1', '2', '3', '4']);
  ellipse.move(3, 4); ellipse.scale(2);
  assert.deepEqual(ellipse.attributes(), { cx: '8', cy: '12', rx: '6', ry: '8' });
});

test('attribute whitelist is per shape, geometry validated, imported presentation preserved', () => {
  const text = factory.fromAttributes('text', 't', { x: '1', 'font-size': '18', fill: 'red' }, 'before');
  text.setAttribute('text', 'after'); text.setAttribute('x', '2.5');
  assert.equal(text.textContent, 'after');
  assert.equal(text.attributes()['font-size'], '18');
  assert.equal(text.attributes().y, '0');
  assert.throws(() => text.setAttribute('font-size', '20'), /unknown attribute: font-size/);
  assert.throws(() => text.setAttribute('id', 'new'), /unknown attribute: id/);
  assert.throws(() => text.setAttribute('r', '2'), /unknown attribute: r/);
  assert.throws(() => text.setAttribute('stroke-width', '-1'), /must be non-negative/);
  text.setAttribute('stroke-width', '1.5');
  assert.equal(text.clone().attributes()['stroke-width'], '1.5');
  assert.throws(() => new Group('g').setAttribute('x', '1'), /unknown attribute: x/);
});

test('geometry failures do not partially apply; nonpositive scale is rejected', () => {
  const rect = new Rect('r', 1e308, 1, 2, 3);
  const before = rect.attributes();
  assert.throws(() => rect.move(1e308, 10), /invalid number/);
  assert.deepEqual(rect.attributes(), before);
  assert.throws(() => rect.scale(10), /invalid number/);
  assert.deepEqual(rect.attributes(), before);
  for (const factor of [0, -1, NaN, Infinity]) assert.throws(() => rect.scale(factor), /scale factor must be positive/);
});

test('nested composite move and scale apply once per leaf and preserve styles', () => {
  const document = new SvgDocument();
  document.add(new Group('outer'));
  document.add(new Group('inner'), 'outer');
  document.add(new Rect('r', 1, 2, 3, 4), 'inner');
  document.add(new Circle('c', 5, 6, 7), 'outer');
  document.get('outer').setAttribute('fill', 'blue');
  document.get('outer').move(10, 20);
  document.get('outer').scale(2);
  assert.deepEqual(document.get('r').attributes(), { x: '22', y: '44', width: '6', height: '8' });
  assert.deepEqual(document.get('c').attributes(), { cx: '30', cy: '52', r: '14' });
  assert.equal(document.get('outer').attributes().fill, 'blue');
});

test('composite overflow rolls back all children', () => {
  const group = new Group('g');
  group.append(new Rect('a', 1, 2, 3, 4));
  group.append(new Rect('b', 1e308, 0, 1, 1));
  const before = group.children.map(child => child.attributes());
  assert.throws(() => group.scale(2), /invalid number/);
  assert.deepEqual(group.children.map(child => child.attributes()), before);
});

test('document ids are global and case-sensitive; subtree collisions rejected atomically', () => {
  const document = new SvgDocument();
  document.add(new Rect('r', 0, 0, 1, 1));
  document.add(new Rect('R', 0, 0, 1, 1));
  const group = new Group('g'); group.append(new Circle('r', 0, 0, 1));
  assert.throws(() => document.add(group), /id already exists: r/);
  assert.equal(document.count(), 2);
  assert.throws(() => document.get('missing'), /no such shape: missing/);
  assert.throws(() => document.getContainer('missing'), /no such container: missing/);
  assert.throws(() => document.add(new Group('child'), 'r'), /not a container: r/);
});

test('group uses document order, inserts at first selected position and supports mixed parents', () => {
  const document = new SvgDocument();
  document.add(new Group('parent'));
  document.add(new Rect('a', 0, 0, 1, 1), 'parent');
  document.add(new Rect('b', 0, 0, 1, 1), 'parent');
  document.add(new Circle('c', 0, 0, 1));
  document.group('g', ['c', 'b']);
  assert.deepEqual(document.children.map(shape => shape.id), ['parent']);
  assert.deepEqual(document.get('parent').children.map(shape => shape.id), ['a', 'g']);
  assert.deepEqual(document.get('g').children.map(shape => shape.id), ['b', 'c']);
  assert.equal(document.parentLabel('b'), 'g#g');
});

test('ancestor/descendant selection and containment cycles fail without changing tree', () => {
  const document = new SvgDocument();
  document.add(new Group('g1')); document.add(new Group('g2'), 'g1');
  document.add(new Rect('r', 0, 0, 1, 1), 'g2');
  assert.throws(() => document.group('bad', ['r', 'g1']), /cannot group a container into its own descendant: g1/);
  assert.throws(() => document.addTo('g2', 'g1'), /cannot add a container into its own descendant: g1/);
  assert.throws(() => document.addTo('g1', 'g1'), /cannot add a container into its own descendant: g1/);
  assert.throws(() => document.group('dup', ['r', 'r']), /duplicate shape id: r/);
  assert.equal(document.count(), 3);
  assert.equal(document.parentLabel('r'), 'g#g2');
});

test('ungroup promotes into the exact container position; top-level groups are protected', () => {
  const document = new SvgDocument();
  document.add(new Group('scene'));
  document.add(new Rect('before', 0, 0, 1, 1), 'scene');
  document.add(new Group('inner'), 'scene');
  document.add(new Circle('c', 0, 0, 1), 'inner');
  document.add(new Rect('after', 0, 0, 1, 1), 'scene');
  document.ungroup('inner');
  assert.deepEqual(document.get('scene').children.map(shape => shape.id), ['before', 'c', 'after']);
  assert.equal(document.parentLabel('c'), 'g#scene');
  assert.throws(() => document.ungroup('scene'), /cannot ungroup top-level container: scene/);
  assert.throws(() => document.ungroup('c'), /not a container: c/);
});

test('addto appends, front/back change sibling z order and deleting a container removes descendants', () => {
  const document = new SvgDocument(); document.add(new Group('g'));
  for (const id of ['a', 'b', 'c']) document.add(new Rect(id, 0, 0, 1, 1), 'g');
  document.front('a');
  assert.deepEqual(document.get('g').children.map(shape => shape.id), ['b', 'c', 'a']);
  document.back('a');
  assert.deepEqual(document.get('g').children.map(shape => shape.id), ['a', 'b', 'c']);
  document.addTo('g', 'a');
  assert.deepEqual(document.get('g').children.map(shape => shape.id), ['b', 'c', 'a']);
  document.delete('g');
  assert.equal(document.count(), 0);
  assert.throws(() => document.get('a'), /no such shape/);
});

test('document cloning is deep and attribute/children snapshots cannot mutate internals', () => {
  const document = new SvgDocument(400, 300); document.add(new Group('g'));
  document.add(new Rect('r', 1, 2, 3, 4), 'g');
  const copy = document.clone(); copy.get('g').move(10, 20); copy.resize(500, 600);
  assert.equal(document.get('r').attributes().x, '1');
  assert.equal(copy.get('r').attributes().x, '11');
  assert.equal(document.width, 400);
  const attrs = document.get('r').attributes() as Record<string, string>; attrs.x = '999';
  const children = document.children as Array<unknown>; children.length = 0;
  assert.equal(document.get('r').attributes().x, '1');
  assert.equal(document.children.length, 1);
});

test('canvas resize validates both dimensions before committing', () => {
  const document = new SvgDocument();
  assert.throws(() => document.resize(500, -1), /canvas height must be positive/);
  assert.equal(document.width, 800);
  assert.equal(document.height, 600);
  assert.throws(() => new SvgDocument(NaN, 1), /canvas width must be positive/);
});
