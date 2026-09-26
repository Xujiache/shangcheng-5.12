const assert = require("node:assert/strict");
const { test } = require("node:test");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { Readable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const yazl = require("yazl");
const yauzl = require("yauzl");
const sharp = require("sharp");
const { convertEpubToText, convertEpubToMarkdown, convertEpubToHtml, convertEpubViaLibreOffice, convertTextToEpub, convertMobiToEpub, convertEbook, fitEpubPdfImages, parseMobiText } = require("../ebook");

async function zipText(filePath, name) {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(fs.readFileSync(filePath), { lazyEntries: true }, (error, zip) => {
      if (error) return reject(error);
      zip.on("error", reject);
      zip.on("end", () => reject(new Error(`Missing EPUB entry: ${name}`)));
      zip.on("entry", entry => {
        if (entry.fileName !== name) return zip.readEntry();
        zip.openReadStream(entry, (streamError, stream) => {
          if (streamError) return reject(streamError);
          const chunks = [];
          stream.on("data", chunk => chunks.push(chunk));
          stream.on("error", reject);
          stream.on("end", () => { zip.close(); resolve(Buffer.concat(chunks).toString("utf8")); });
        });
      });
      zip.readEntry();
    });
  });
}

async function makeEpub(filePath, options = {}) {
  const zip = new yazl.ZipFile();
  zip.addBuffer(Buffer.from("application/epub+zip"), "mimetype", { compress: false });
  const documents = {
    "META-INF/container.xml": "<container><rootfiles><rootfile full-path='OPS/content.opf'/></rootfiles></container>",
    "OPS/content.opf": `<package><manifest><item href='text/chapter%20one.xhtml' id='a'/><item id='b' href='text/two.xhtml'/></manifest><spine><itemref idref='a'/><itemref idref='b'/></spine></package>`,
    "OPS/text/chapter one.xhtml": `<html><head><title>One</title></head><body><h1>第一章</h1><p>甲 ${options.image ? "<img alt='图片' src='../images/pixel.png' />" : ""}${options.svg ? "<svg viewBox='0 0 1 1'><circle cx='0.5' cy='0.5' r='0.5'/></svg>" : ""}</p></body></html>`,
    "OPS/text/two.xhtml": "<html><body><h1>第二章</h1><p>乙</p></body></html>"
  };
  if (options.missingChapter) delete documents["OPS/text/two.xhtml"];
  if (options.image && !options.missingImage) documents["OPS/images/pixel.png"] = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6Z04AAAAASUVORK5CYII=", "base64");
  for (const [name, content] of Object.entries(documents)) zip.addReadStream(Readable.from([Buffer.from(content)]), name);
  const written = pipeline(zip.outputStream, fs.createWriteStream(filePath));
  zip.end();
  await written;
}

test("EPUB streaming ZIP descriptors, single-quoted XML and encoded chapter paths preserve every chapter in spine order", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-streaming-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "streaming.epub"), output = path.join(dir, "book.txt");
  await makeEpub(epub);
  // Data descriptor signature confirms this fixture cannot be read using sizes
  // from only the local headers, unlike addBuffer-only ZIP fixtures.
  assert.ok((await fsp.readFile(epub)).includes(Buffer.from([0x50, 0x4b, 0x07, 0x08])));
  await convertEpubToText(epub, output);
  const text = await fsp.readFile(output, "utf8");
  assert.match(text, /第一章[\s\S]*甲[\s\S]*第二章[\s\S]*乙/);
});

test("EPUB missing chapters fail before creating an incomplete output", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-missing-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), output = path.join(dir, "book.txt");
  await makeEpub(epub, { missingChapter: true });
  await assert.rejects(convertEpubToText(epub, output), { code: "EPUB_CHAPTER_MISSING" });
  assert.equal(fs.existsSync(output), false);
});

test("EPUB HTML and Markdown keep raster image bytes; missing image resources are explicit errors", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-resource-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), html = path.join(dir, "book.html"), md = path.join(dir, "book.md");
  await makeEpub(epub, { image: true });
  await convertEpubToHtml(epub, html);
  await convertEpubToMarkdown(epub, md);
  assert.match(await fsp.readFile(html, "utf8"), /src="data:image\/png;base64,iVBOR/);
  assert.match(await fsp.readFile(md, "utf8"), /!\[图片\]\(data:image\/png;base64,iVBOR/);
  await makeEpub(epub, { image: true, missingImage: true });
  await assert.rejects(convertEpubToHtml(epub, path.join(dir, "missing.html")), { code: "EPUB_IMAGE_MISSING" });
});

test("EPUB PDF preparation fits a large cover without changing small images or their bytes", async () => {
  const cover = await sharp({ create: { width: 800, height: 1104, channels: 3, background: "#17684b" } }).png().toBuffer();
  const icon = await sharp({ create: { width: 20, height: 20, channels: 3, background: "#17684b" } }).png().toBuffer();
  const coverTag = `<img alt="封面" src="data:image/png;base64,${cover.toString("base64")}">`;
  const iconTag = `<img alt="图标" src="data:image/png;base64,${icon.toString("base64")}">`;
  const prepared = await fitEpubPdfImages(`${coverTag}${iconTag}`);
  assert.match(prepared, /alt="封面"[^>]* width="600" height="828">/);
  assert.ok(prepared.includes(`src="data:image/png;base64,${cover.toString("base64")}"`));
  assert.ok(prepared.includes(iconTag));
});

test("EPUB PDF passes through ODT so the first HTML block survives LibreOffice", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-pdf-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), pdf = path.join(dir, "book.pdf");
  await makeEpub(epub);
  const calls = [];
  t.mock.method(require("../office-convert"), "convertWithLibreOffice", async (input, output, name, target) => {
    calls.push({ input, name, target });
    if (target === "odt") assert.match(await fsp.readFile(input, "utf8"), /第一章/);
    if (target === "pdf") assert.equal(await fsp.readFile(input, "utf8"), "odt-stub");
    await fsp.writeFile(output, `${target}-stub`);
  });
  await convertEpubViaLibreOffice(epub, pdf, "pdf");
  assert.deepEqual(calls.map(({ target }) => target), ["odt", "pdf"]);
  assert.equal(calls[1].name, "book.odt");
  assert.equal(await fsp.readFile(pdf, "utf8"), "pdf-stub");
});

test("EPUB DOCX passes through ODT with both chapters and the raster image intact", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-docx-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), docx = path.join(dir, "book.docx");
  await makeEpub(epub, { image: true });
  const calls = [];
  t.mock.method(require("../office-convert"), "convertWithLibreOffice", async (input, output, name, target) => {
    calls.push({ input, name, target });
    if (target === "odt") {
      const html = await fsp.readFile(input, "utf8");
      assert.match(html, /第一章[\s\S]*第二章/);
      assert.match(html, /src="data:image\/png;base64,iVBOR/);
    }
    if (target === "docx") assert.equal(await fsp.readFile(input, "utf8"), "odt-stub");
    await fsp.writeFile(output, `${target}-stub`);
  });
  const result = await convertEpubViaLibreOffice(epub, docx, "docx");
  assert.deepEqual(calls.map(({ target }) => target), ["odt", "docx"]);
  assert.equal(calls[1].name, "book.odt");
  assert.equal(await fsp.readFile(docx, "utf8"), "docx-stub");
  assert.deepEqual(result.warnings, []);
});

test("EPUB DOCX rejects SVG chapters before creating a partial document", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-docx-svg-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), docx = path.join(dir, "book.docx");
  await makeEpub(epub, { svg: true });
  await assert.rejects(convertEpubViaLibreOffice(epub, docx, "docx"), { code: "EPUB_SVG_UNSUPPORTED" });
  assert.equal(fs.existsSync(docx), false);
});

test("plain text EPUB generation escapes markup and round-trips its original text", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "epub-roundtrip-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const epub = path.join(dir, "book.epub"), txt = path.join(dir, "book.txt");
  await convertTextToEpub("a < b & c > d\n鼠鼠", "txt", "book.txt", epub);
  await convertEpubToText(epub, txt);
  assert.match(await fsp.readFile(txt, "utf8"), /a < b & c > d\n鼠鼠/);
});

function mobiFixture({ compression = 1, chunk = Buffer.from("<p>Hello</p>"), chunks = [chunk], textLength = chunk.length, codepage = 65001, version = 6, extraDataFlags = 0 } = {}) {
  const record0 = Buffer.alloc(extraDataFlags ? 244 : 40);
  record0.writeUInt16BE(compression, 0);
  record0.writeUInt32BE(textLength, 4);
  record0.writeUInt16BE(chunks.length, 8);
  record0.writeUInt16BE(4096, 10);
  record0.write("MOBI", 16);
  record0.writeUInt32BE(extraDataFlags ? 228 : 24, 20);
  record0.writeUInt32BE(codepage, 28);
  record0.writeUInt32BE(version, 36);
  if (extraDataFlags) record0.writeUInt16BE(extraDataFlags, 242);
  const header = Buffer.alloc(78 + 8 * (chunks.length + 1) + 2);
  header.writeUInt16BE(chunks.length + 1, 76);
  let offset = header.length;
  for (const [index, record] of [record0, ...chunks].entries()) {
    header.writeUInt32BE(offset, 78 + index * 8);
    offset += record.length;
  }
  return Buffer.concat([header, record0, ...chunks]);
}

test("MOBI uses the actual PDB record count and decodes both uncompressed UTF-8 and PalmDOC backreferences", () => {
  const chinese = Buffer.from("<p>鼠鼠</p>");
  assert.equal(parseMobiText(mobiFixture({ chunk: chinese })), "<p>鼠鼠</p>");
  // abc + distance=3,length=3 backreference + PalmDOC space/H pair.
  const compressed = Buffer.from([0x61, 0x62, 0x63, 0x80, 0x18, 0xc8]);
  assert.equal(parseMobiText(mobiFixture({ compression: 2, chunk: compressed, textLength: 8 })), "abcabc H");
  assert.equal(parseMobiText(mobiFixture({ chunk: Buffer.from([0x63, 0x61, 0x66, 0xe9]), codepage: 1252 })), "café");
});

test("MOBI unsupported compression, KF8, corrupt records and invalid UTF-8 cannot become successful garbage text", () => {
  assert.throws(() => parseMobiText(mobiFixture({ compression: 17480 })), { code: "MOBI_COMPRESSION_UNSUPPORTED" });
  assert.throws(() => parseMobiText(mobiFixture({ version: 8 })), { code: "MOBI_KF8_UNSUPPORTED" });
  assert.throws(() => parseMobiText(mobiFixture({ compression: 2, chunk: Buffer.from([0x80]), textLength: 10 })), { code: "MOBI_INVALID_RECORD" });
  assert.throws(() => parseMobiText(mobiFixture({ chunk: Buffer.from([0xff]), textLength: 1 })), { code: "MOBI_ENCODING_INVALID" });
  assert.throws(() => parseMobiText(mobiFixture({ textLength: 999 })), { code: "MOBI_TEXT_INCOMPLETE" });
});

test("MOBI 6 strips indexing data and UTF-8 overlaps without dropping chapter content", () => {
  const first = Buffer.concat([Buffer.from("<p>CHAPTER I. Alice and caf"), Buffer.from([0xc3, 0xa9, 2, 0x86, 0x80, 3, 0x84])]);
  const second = Buffer.concat([Buffer.from("é</p><p>CHAPTER II. The End</p>"), Buffer.from([0, 0x86, 0x80, 3, 0x84])]);
  const expected = "<p>CHAPTER I. Alice and café</p><p>CHAPTER II. The End</p>";
  assert.equal(parseMobiText(mobiFixture({ chunks: [first, second], textLength: Buffer.byteLength(expected), extraDataFlags: 3 })), expected);
  const compressed = Buffer.from([0x61, 0x62, 0x63, 0x80, 0x18, 0xc8, 0, 0x86, 0x80, 3, 0x84]);
  assert.equal(parseMobiText(mobiFixture({ compression: 2, chunk: compressed, textLength: 8, extraDataFlags: 3 })), "abcabc H");
  const chapters = Buffer.from("<html><body><mbp:pagebreak/><p>CHAPTER I. First chapter</p><mbp:pagebreak/><p>CHAPTER II. Final chapter</p><mbp:pagebreak></mbp:pagebreak></body></html>");
  assert.equal(parseMobiText(mobiFixture({ chunk: chapters })), "<p>CHAPTER I. First chapter</p><p>CHAPTER II. Final chapter</p>");
});

test("MOBI malformed trailing entries, mismatched overlaps and unverified flags fail closed", () => {
  assert.throws(() => parseMobiText(mobiFixture({ chunk: Buffer.from("<p>Hello</p>\0"), extraDataFlags: 2 })), { code: "MOBI_INVALID_RECORD" });
  assert.throws(() => parseMobiText(mobiFixture({ chunk: Buffer.concat([Buffer.from("<p>Hello</p>"), Buffer.from([0xff])]), extraDataFlags: 2 })), { code: "MOBI_INVALID_RECORD" });
  const first = Buffer.concat([Buffer.from("<p>A"), Buffer.from([0xc3, 0xa9, 2])]);
  const second = Buffer.concat([Buffer.from("B</p>"), Buffer.from([0])]);
  assert.throws(() => parseMobiText(mobiFixture({ chunks: [first, second], extraDataFlags: 1 })), { code: "MOBI_INVALID_RECORD" });
  assert.throws(() => parseMobiText(mobiFixture({ extraDataFlags: 4 })), { code: "MOBI_EXTRA_DATA_UNSUPPORTED" });
});

test("MOBI conversion reports text-only fidelity to callers", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "mobi-warning-test-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const input = path.join(dir, "sample.mobi"), output = path.join(dir, "sample.txt");
  await fsp.writeFile(input, mobiFixture({ chunk: Buffer.from("<p>Hello, Alice.</p>") }));
  const result = await convertEbook(input, output, "mobi", "txt", "sample.mobi");
  assert.match(await fsp.readFile(output, "utf8"), /Hello, Alice/);
  assert.deepEqual(result.warnings.map(item => item.code), ["MOBI_TEXT_ONLY"]);
});

test("MOBI pagebreak chapter headings become linked EPUB TOC entries without losing text", async (t) => {
  const dir = await fsp.mkdtemp(path.join(os.tmpdir(), "mobi-epub-chapters-"));
  t.after(() => fsp.rm(dir, { recursive: true, force: true }));
  const mobi = path.join(dir, "book.mobi"), epub = path.join(dir, "book.epub"), txt = path.join(dir, "book.txt");
  const html = Buffer.from("<html><body><p>Introduction</p><mbp:pagebreak/><p>CHAPTER I.<br/>First</p><p>Hello</p><mbp:pagebreak/><p>CHAPTER II.<br/>Second</p><p>World</p></body></html>");
  await fsp.writeFile(mobi, mobiFixture({ chunk: html }));
  await convertMobiToEpub(mobi, epub, "book.mobi");
  const toc = await zipText(epub, "OEBPS/toc.ncx");
  assert.match(toc, /CHAPTER I\. First[\s\S]*chapter-2\.xhtml[\s\S]*CHAPTER II\. Second[\s\S]*chapter-3\.xhtml/);
  await convertEpubToText(epub, txt);
  assert.match(await fsp.readFile(txt, "utf8"), /Introduction[\s\S]*CHAPTER I\.[\s\S]*Hello[\s\S]*CHAPTER II\.[\s\S]*World/);
});
