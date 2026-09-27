// Keep the PDF render and extracted text together in one self-contained HTML file.
// Stream image bytes so a presentation does not accumulate all pages in memory.
async function convertPresentationToHtml(inputPath, outputPath, originalName) {
  const { Readable } = require("node:stream");
  const { pipeline } = require("node:stream/promises");
  const { convertWithLibreOffice } = require("./office-convert");
  const tempDir = await fsp.mkdtemp(path.join(os.tmpdir(), "flyingmouse-ppt-html-"));
  try {
    const pdfPath = path.join(tempDir, "slides.pdf");
    await convertWithLibreOffice(inputPath, pdfPath, originalName, "pdf");
    const pages = await extractPdfRowsByPage(pdfPath);
    const rendered = await renderPdfPages(pdfPath, "png", 300);
    try {
      if (rendered.files.length !== pages.length) {
        throw new Error("Presentation HTML page count differs from rendered PDF.");
      }
      async function* chunks() {
        yield `<!doctype html>\n<html lang="zh-CN">\n<head>\n<meta charset="utf-8">\n`;
        yield `<title>${escapeHtml(safeBaseName(originalName))}</title>\n`;
        yield `<style>body{font-family:Arial,"Microsoft YaHei",sans-serif;margin:0;background:#f4f4f4}` +
          `section{max-width:1200px;margin:24px auto;background:#fff}` +
          `img{display:block;width:100%;height:auto}` +
          `details{padding:12px 16px;line-height:1.6}</style>\n</head>\n<body>\n`;
        for (let index = 0; index < pages.length; index += 1) {
          const page = pages[index];
          yield `<section><img alt="${escapeHtml(page.name)}" src="data:image/png;base64,`;
          for await (const part of fs.createReadStream(rendered.files[index], { encoding: "base64" })) {
            yield part;
          }
          yield `"><details><summary>${escapeHtml(page.name)} · 文字内容</summary>\n`;
          for (const row of page.rows) yield `<p>${escapeHtml(row.join(" "))}</p>\n`;
          yield `</details></section>\n`;
        }
        yield `</body>\n</html>`;
      }
      reportConversionProgress({ stage: "converting" });
      await pipeline(Readable.from(chunks()), fs.createWriteStream(outputPath));
    } catch (error) {
      await fsp.rm(outputPath, { force: true }).catch(() => {});
      throw error;
    } finally {
      await fsp.rm(rendered.tempDir, { recursive: true, force: true }).catch(() => {});
    }
  } finally {
    await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});
  }
}
