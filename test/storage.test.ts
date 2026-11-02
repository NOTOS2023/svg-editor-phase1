import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { ShapeFactory } from "../src/domain/ShapeFactory.js";
import { SvgDocument } from "../src/domain/SvgDocument.js";
import { NodeDocumentStore } from "../src/infrastructure/NodeDocumentStore.js";
import { SvgCodec } from "../src/infrastructure/SvgCodec.js";

test("SVG read/save/read preserves all built-in types, order, style and XML text", () => {
  const codec = new SvgCodec();
  const source = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
  <g id="flow" fill="#eee" data-kind="box">
    <rect id="r" x="1.5" y="-2" width="30" height="40" stroke="blue" stroke-width="2"/>
    <circle id="c" cx="30" cy="40" r="5"/>
    <ellipse id="e" cx="10" cy="20" rx="3" ry="6"/>
    <line id="l" x1="0" y1="10" x2="40" y2="10" stroke="black"/>
    <text id="t" x="3" y="9" font-size="18" text-anchor="middle">中文 &amp; &lt;tag&gt; "引号"</text>
  </g>
</svg>`;
  const first = codec.decode(source);
  assert.deepEqual(first.warnings, []);
  assert.equal(first.document.count(), 6);
  assert.equal(first.document.get("t").textContent, '中文 & <tag> "引号"');
  const encoded = codec.encode(first.document);
  assert.match(encoded, /encoding="UTF-8"/);
  assert.match(encoded, /&amp; &lt;tag&gt;/);
  assert.match(encoded, /data-kind="box"/);
  const second = codec.decode(encoded);
  assert.equal(codec.encode(second.document), encoded);
});

test("missing IDs reserve future explicit IDs and keep case sensitivity", () => {
  const { document, warnings } = new SvgCodec().decode(`<svg width="100" height="80">
    <rect/><rect id="rect1"/><g><circle/><circle id="circle1"/></g><rect id="Rect1"/>
  </svg>`);
  assert.deepEqual(warnings, [
    "warning: assigned id rect2 to unnamed <rect>",
    "warning: assigned id g1 to unnamed <g>",
    "warning: assigned id circle2 to unnamed <circle>",
  ]);
  assert.equal(document.count(), 6);
  assert.equal(document.get("Rect1").id, "Rect1");
  assert.equal(document.get("rect2").attributes().width, "0");
});

test("duplicate and empty explicit IDs fail before assigning missing IDs", () => {
  const codec = new SvgCodec();
  assert.throws(() => codec.decode('<svg><rect/><g id="same"><circle id="same"/></g></svg>'), /id already exists: same/);
  assert.throws(() => codec.decode('<svg><rect id=""/></svg>'), /invalid id:/);
  assert.throws(() => codec.decode('<svg><rect id="two words"/></svg>'), /invalid id:/);
});

test("SVG-prefixed element names are decoded through localName", () => {
  const codec = new SvgCodec();
  const { document } = codec.decode('<s:svg xmlns:s="http://www.w3.org/2000/svg" width="50px" height="60px"><s:rect id="r" width="2" height="3"/></s:svg>');
  assert.equal(document.width, 50);
  assert.equal(document.height, 60);
  assert.equal(document.get("r").tag, "rect");
});

test("translate and positive uniform scale normalize in SVG matrix order", () => {
  const codec = new SvgCodec();
  const { document } = codec.decode(`<svg width="400" height="200">
    <g id="outer" transform="translate(60,40)">
      <rect id="a" x="0" y="0" width="120" height="60"/>
      <g id="inner" transform="translate(200,0) scale(0.8)">
        <rect id="b" width="120" height="60"/>
        <text id="label" x="60" y="38" font-size="16">End</text>
      </g>
    </g>
  </svg>`);
  const a = document.get("a").attributes();
  const b = document.get("b").attributes();
  const label = document.get("label").attributes();
  assert.equal(a.x, "60");
  assert.equal(a.y, "40");
  assert.equal(b.x, "260");
  assert.equal(b.y, "40");
  assert.equal(b.width, "96");
  assert.equal(b.height, "48");
  assert.equal(label.x, "308");
  assert.equal(label["font-size"], "12.8");
  assert.doesNotMatch(codec.encode(document), /transform=/);
});

test("nested scales preserve inherited font and stroke values", () => {
  const { document } = new SvgCodec().decode(`<svg><g id="a" font-size="20" stroke-width="3" transform="scale(2)">
    <g id="b" transform="scale(3)"><text id="t" x="1" y="2">x</text></g>
  </g></svg>`);
  assert.equal(document.get("a").attributes()["font-size"], "40");
  assert.equal(document.get("b").attributes()["font-size"], "120");
  assert.equal(document.get("b").attributes()["stroke-width"], "18");
  assert.equal(document.get("t").attributes().x, "6");
});

test("unsupported transforms fail rather than disappearing during save", () => {
  const codec = new SvgCodec();
  for (const transform of ["rotate(30)", "scale(2,3)", "scale(0)", "scale(-1)", "translate(foo)", "translate(1) garbage", "matrix(1,0,0,1,0,0)", ""]) {
    assert.throws(() => codec.decode(`<svg><g id="g" transform="${transform}"/></svg>`), /unsupported transform:/);
  }
});

test("bad XML, DTD/entity declarations and foreign namespaces are rejected", () => {
  const codec = new SvgCodec();
  for (const source of [
    "", "not xml", "<svg><g></svg>", "<svg/><svg/>", "<svg><rect x=2/></svg>",
    '<!DOCTYPE svg [<!ENTITY x "test">]><svg/>',
    '<svg><text id="t">&undefined;</text></svg>',
  ]) assert.throws(() => codec.decode(source), /invalid SVG:/);
  assert.throws(() => codec.decode('<html/>'), /root must be <svg>/);
  assert.throws(() => codec.decode('<svg xmlns="urn:other"/>'), /invalid SVG namespace/);
});

test("unknown shapes and unsupported nested text fail without data loss", () => {
  const codec = new SvgCodec();
  assert.throws(() => codec.decode('<svg><path id="p" d="M 0 0"/></svg>'), /unknown shape type: path/);
  assert.throws(() => codec.decode('<svg><text id="t"><tspan id="s">x</tspan></text></svg>'), /unsupported child element/);
  assert.throws(() => codec.decode('<svg>unattached text</svg>'), /unexpected text/);
});

test("viewport validation accepts matching viewBox and rejects lossy conversion", () => {
  const codec = new SvgCodec();
  assert.equal(codec.decode('<svg viewBox="0 0 120 70"/>').document.width, 120);
  assert.equal(codec.decode('<svg/>').document.height, 600);
  assert.throws(() => codec.decode('<svg width="20" height="20" viewBox="0 0 10 10"/>'), /unsupported SVG viewBox/);
  assert.throws(() => codec.decode('<svg width="20%"/>'), /invalid SVG width/);
  assert.throws(() => codec.decode('<svg width="0"/>'), /invalid SVG width/);
  assert.throws(() => codec.decode('<svg style="fill:red"/>'), /unsupported SVG root attribute/);
});

test("NodeDocumentStore writes UTF-8 atomically and reads the result", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-storage-"));
  try {
    const file = join(directory, "中文 example.svg");
    const store = new NodeDocumentStore();
    const document = new SvgDocument(100, 80);
    document.add(new ShapeFactory().create("text", "title", ["5", "12", "你好 & <svg>"]));
    writeFileSync(file, "old contents", "utf8");
    store.write(file, document);
    assert.match(readFileSync(file, "utf8"), /你好 &amp; &lt;svg&gt;/);
    assert.equal(store.read(file).document.get("title").textContent, "你好 & <svg>");
    assert.deepEqual(readdirSync(directory), ["中文 example.svg"]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test("NodeDocumentStore errors are stable and a failed replacement leaves no temp file", () => {
  const directory = mkdtempSync(join(tmpdir(), "svg-editor-storage-"));
  try {
    const store = new NodeDocumentStore();
    const missing = join(directory, "missing.svg");
    assert.throws(() => store.read(missing), { message: `cannot read file: ${missing}` });
    const invalid = join(directory, "invalid.svg");
    writeFileSync(invalid, "<svg><g></svg>", "utf8");
    assert.throws(() => store.read(invalid), /invalid SVG: malformed XML/);
    const target = join(directory, "missing", "out.svg");
    assert.throws(() => store.write(target, new SvgDocument()), { message: `cannot write file: ${target}` });
    assert.throws(() => store.write(directory, new SvgDocument()), { message: `cannot write file: ${directory}` });
    assert.deepEqual(readdirSync(directory), ["invalid.svg"]);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
