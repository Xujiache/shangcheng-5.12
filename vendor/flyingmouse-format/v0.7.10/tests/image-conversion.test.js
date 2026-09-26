const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { test } = require("node:test");
const sharp = require("sharp");
const { PDFDocument, StandardFonts } = require("pdf-lib");

const { convertRasterImage } = require("../image-conversion");
const { convertImage } = require("../image");
const { encodeIco } = require("../ico-format");
const { validateNativePdfDocx } = require("../pdf");

async function removeScratch(scratch) {
  sharp.cache(false);
  await fsp.rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

async function createAnimatedGif(filePath) {
  const width = 4;
  const height = 3;
  const pages = 2;
  const raw = Buffer.alloc(width * height * pages * 4);
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    raw[pixel * 4] = 255;
    raw[pixel * 4 + 3] = 255;
  }
  for (let pixel = width * height; pixel < width * height * pages; pixel += 1) {
    raw[pixel * 4 + 2] = 255;
    raw[pixel * 4 + 3] = 255;
  }
  await sharp(raw, { raw: { width, height: height * pages, channels: 4, pageHeight: height } })
    .gif({ loop: 0, delay: [120, 240] })
    .toFile(filePath);
}

test("animated GIF to PNG uses the first composited frame instead of a vertical sprite", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-image-static-"));
  t.after(() => removeScratch(scratch));
  const input = path.join(scratch, "animated.gif");
  const output = path.join(scratch, "first-frame.png");
  await createAnimatedGif(input);

  const result = await convertRasterImage(input, output, "png", { maxPixels: 50_000_000 });
  const metadata = await sharp(output).metadata();
  const pixel = await sharp(output).ensureAlpha().raw().toBuffer();
  assert.equal(metadata.width, 4);
  assert.equal(metadata.height, 3);
  assert.deepEqual([...pixel.subarray(0, 4)], [255, 0, 0, 255]);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["ANIMATION_FLATTENED"]);
});

test("animated GIF to WebP preserves frame count and timing", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-image-webp-"));
  t.after(() => removeScratch(scratch));
  const input = path.join(scratch, "animated.gif");
  const output = path.join(scratch, "animated.webp");
  await createAnimatedGif(input);

  const result = await convertRasterImage(input, output, "webp", { maxPixels: 50_000_000 });
  const metadata = await sharp(output, { animated: true }).metadata();
  assert.equal(metadata.pages, 2);
  assert.deepEqual(metadata.delay, [120, 240]);
  assert.deepEqual(result.warnings, []);
});

test("transparent input uses an explicit white JPEG background", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-image-jpeg-"));
  t.after(() => removeScratch(scratch));
  const input = path.join(scratch, "transparent.png");
  const output = path.join(scratch, "opaque.jpg");
  await sharp({ create: { width: 8, height: 8, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } }).png().toFile(input);

  const result = await convertRasterImage(input, output, "jpg", { maxPixels: 50_000_000 });
  const { data, info } = await sharp(output).raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.channels, 3);
  assert.ok([...data.subarray(0, 3)].every((value) => value >= 250), `expected white, got ${[...data.subarray(0, 3)]}`);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["ALPHA_COMPOSITED_WHITE"]);
});

test("alpha-capable PNG output preserves transparency", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-image-alpha-"));
  t.after(() => removeScratch(scratch));
  const input = path.join(scratch, "transparent.png");
  const output = path.join(scratch, "transparent-output.png");
  await sharp({ create: { width: 3, height: 3, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0 } } }).png().toFile(input);
  await convertRasterImage(input, output, "png", { maxPixels: 50_000_000 });
  const pixel = await sharp(output).ensureAlpha().raw().toBuffer();
  assert.equal(pixel[3], 0);
});

test("alpha-capable TIFF output preserves transparency losslessly", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-image-tiff-alpha-"));
  t.after(() => removeScratch(scratch));
  const input = path.join(scratch, "transparent.png");
  const output = path.join(scratch, "transparent-output.tiff");
  await sharp({ create: { width: 3, height: 3, channels: 4, background: { r: 10, g: 20, b: 30, alpha: 0 } } }).png().toFile(input);
  await convertRasterImage(input, output, "tiff", { maxPixels: 50_000_000 });
  const metadata = await sharp(output).metadata();
  const pixel = await sharp(output).ensureAlpha().raw().toBuffer();
  assert.equal(metadata.hasAlpha, true);
  assert.equal(pixel[3], 0);
});

test("PDF-compatible AI to PDF preserves original vector pages and text bytes", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ai-pdf-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const output = path.join(scratch, "converted.pdf");
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  page.drawText("SEARCHABLE VECTOR TEXT 7319", { x: 30, y: 700, font: await document.embedFont(StandardFonts.Helvetica) });
  page.drawRectangle({ x: 30, y: 600, width: 80, height: 50 });
  const original = Buffer.from(await document.save());
  await fsp.writeFile(source, original);

  const result = await convertImage(source, output, "pdf", { inputName: "drawing.ai" });
  assert.deepEqual(result.warnings, []);
  assert.deepEqual(await fsp.readFile(output), original);
  assert.deepEqual((await PDFDocument.load(await fsp.readFile(output))).getPage(0).getSize(), { width: 612, height: 792 });
});

test("PDF-compatible AI to TXT and DOCX extracts the native text layer", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ai-text-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const txtOutput = path.join(scratch, "converted.txt");
  const docxOutput = path.join(scratch, "converted.docx");
  const document = await PDFDocument.create();
  const page = document.addPage([612, 792]);
  page.drawText("SEARCHABLE VECTOR TEXT 7319", { x: 30, y: 700, font: await document.embedFont(StandardFonts.Helvetica) });
  page.drawRectangle({ x: 30, y: 600, width: 80, height: 50 });
  await fsp.writeFile(source, await document.save());

  const txtResult = await convertImage(source, txtOutput, "txt", { inputName: "drawing.ai" });
  const docxResult = await convertImage(source, docxOutput, "docx", { inputName: "drawing.ai", docenginePath: null });
  assert.match(await fsp.readFile(txtOutput, "utf8"), /SEARCHABLE VECTOR TEXT 7319/);
  assert.match((await validateNativePdfDocx(docxOutput)).editableText, /SEARCHABLE VECTOR TEXT 7319/);
  assert.ok(txtResult.warnings.some((warning) => warning.code === "AI_PDF_TEXT_EXTRACTION"));
  assert.ok(docxResult.warnings.some((warning) => warning.code === "AI_PDF_TEXT_EXTRACTION"));
  assert.ok(docxResult.warnings.some((warning) => warning.code === "PDF_DOCX_LAYOUT_FALLBACK"));
});

test("PDF-compatible AI to Markdown uses the PDF text path instead of raster OCR", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ai-markdown-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const output = path.join(scratch, "converted.md");
  const document = await PDFDocument.create();
  document.addPage([612, 792]);
  await fsp.writeFile(source, await document.save());

  const result = await convertImage(source, output, "md", {
    inputName: "drawing.ai",
    pdfTextPages: [{ pageNumber: 1, rows: [["SEARCHABLE VECTOR TEXT 7319"]], imageCoverage: 0 }],
    ocrAvailable: () => { throw new Error("raster OCR must not run"); }
  });
  assert.match(await fsp.readFile(output, "utf8"), /SEARCHABLE VECTOR TEXT 7319/);
  assert.ok(result.warnings.some((warning) => warning.code === "PDF_MARKDOWN_REFLOW"));
  assert.ok(result.warnings.some((warning) => warning.code === "AI_PDF_TEXT_EXTRACTION"));
});

test("ICO without recognized text refuses editable Markdown and DOCX outputs", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ico-no-text-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const png = await sharp({ create: { width: 64, height: 64, channels: 3, background: "white" } }).png().toBuffer();
  await fsp.writeFile(source, encodeIco([{ size: 64, data: png }]));
  t.mock.method(require("../ocr"), "recognizeImageResult", async () => ({ text: "", warnings: [] }));
  for (const target of ["md", "docx"]) {
    const output = path.join(scratch, `blank.${target}`);
    await assert.rejects(convertImage(source, output, target, { inputName: "blank.ico" }),
      (error) => error.code === "OCR_NO_TEXT");
    await assert.rejects(fsp.stat(output), /ENOENT/);
  }
});

test("legacy EPS AI and malformed PDF-compatible AI are rejected explicitly", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ai-invalid-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const output = path.join(scratch, "converted.pdf");
  await fsp.writeFile(source, "%!PS-Adobe-3.0 EPSF-3.0\n%%Creator: Adobe Illustrator 8.0\n");
  await assert.rejects(convertImage(source, output, "pdf", { inputName: "legacy.ai" }),
    (error) => error.code === "AI_PDF_COMPATIBILITY_REQUIRED" && Boolean(error.messages?.zhCN));
  await assert.rejects(convertImage(source, path.join(scratch, "legacy.png"), "png", { inputName: "legacy.ai" }),
    (error) => error.code === "AI_PDF_COMPATIBILITY_REQUIRED");
  await assert.rejects(convertImage(source, path.join(scratch, "legacy.txt"), "txt", { inputName: "legacy.ai" }),
    (error) => error.code === "AI_PDF_COMPATIBILITY_REQUIRED");
  await assert.rejects(convertImage(source, path.join(scratch, "legacy.md"), "md", { inputName: "legacy.ai" }),
    (error) => error.code === "AI_PDF_COMPATIBILITY_REQUIRED");
  await fsp.writeFile(source, "%PDF-1.7\nnot a valid PDF");
  await assert.rejects(convertImage(source, output, "pdf", { inputName: "broken.ai" }),
    (error) => error.code === "AI_PDF_INVALID" && Boolean(error.messages?.zhCN));
  await assert.rejects(convertImage(source, path.join(scratch, "broken.docx"), "docx", { inputName: "broken.ai" }),
    (error) => error.code === "AI_PDF_INVALID");
  await assert.rejects(fsp.stat(output), /ENOENT/);
  await assert.rejects(fsp.stat(path.join(scratch, "broken.docx")), /ENOENT/);
});

test("ordinary PNG to PDF still uses the image path", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-png-pdf-"));
  t.after(() => removeScratch(scratch));
  const source = path.join(scratch, "uploaded-file");
  const output = path.join(scratch, "converted.pdf");
  await sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } }).png().toFile(source);
  await convertImage(source, output, "pdf", { inputName: "ordinary.png" });
  assert.equal((await PDFDocument.load(await fsp.readFile(output))).getPageCount(), 1);
});
