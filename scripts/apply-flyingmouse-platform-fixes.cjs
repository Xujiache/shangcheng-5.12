#!/usr/bin/env node
// Apply reviewed engine fixes to a runtime copy; leave the pinned source untouched.
const { createHash, randomUUID } = require('node:crypto')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const source = path.join(root, 'vendor/flyingmouse-format/upstream-a7b9b15')
const expectedImageSha256 = '94593339599ff432abfb75b21578e019c4f05327cd1164af6e724c7f47474fcf'
const expectedOfficeSha256 = 'e823d8fbd291a1fbfee32a90f9645cb6ee5e71e3f30c10e8875893fcad54e742'
const expectedOfdSha256 = '3401538b1746c19e06771b88bbd713494618544541a52a7f2ae1149513d2e601'
const expectedPdfTableSha256 = 'bc03c4af4b123d34abed95d276bea21e2829de9e6b48d66b05f484bccff8f1f1'
const expectedPdfSha256 = '7e5c912a02d692c1a268f488b12cc0dfcef00f443d79f9b5200edabc4a8d12a2'
const expectedPdfStructureSha256 = 'b434e049863de42c487dd0411bf924a6c522923bb1dd75ac10810a74e9434f97'
const expectedResourcePolicySha256 = 'dde3ee42b661c3d21ae3a5fc8d7b0c2d775561467ac2378c7c78d0feb56139da'
const expectedOcrSha256 = '1ddc8b79a9ec6db76677d5905c1d8e0a6a99ef1afe6a553ec7f1319e73302636'
const expectedOfdDependencySha256 = '254a22b7ebe342318d03b6c5efb61a6779fa8368318c74c5e04d5f831360847d'
const before = 'args.push("-loop", "1", "-i", inputPath, "-t", "3");'
const after = 'args.push("-stream_loop", "-1", "-i", inputPath, "-t", "3");'
const rawBefore = [
  '    const tiffCandidates = [',
  '      path.join(tempDir, `${stem}.tiff`),',
  '      path.join(tempDir, `${stem}.tif`)',
  '    ];',
].join('\n')
const rawAfter = [
  '    const tiffCandidates = [',
  '      path.join(tempDir, `${stem}.tiff`),',
  '      path.join(tempDir, `${stem}.tif`),',
  '      path.join(tempDir, `${path.basename(tempInput)}.tiff`),',
  '      path.join(tempDir, `${path.basename(tempInput)}.tif`)',
  '    ];',
].join('\n')
const rawRunBefore = '    await run(DCRAW_PATH, ["-T", "-o", "1", tempInput], { timeout: 1000 * 60 * 5 });'
const rawRunAfter = [
  '    try {',
  '      await run(DCRAW_PATH, ["-T", "-o", "1", tempInput], { timeout: 1000 * 60 * 5 });',
  '    } catch (cause) {',
  '      await fsp.rm(tempDir, { recursive: true, force: true }).catch(() => {});',
  '      throw new Error("RAW 图片解码失败：无法从该文件提取像素数据。", { cause });',
  '    }',
].join('\n')
const officeBefore = '      libreOfficeFilterFor(target),'
const officeAfter = '      normalizeExt(originalExt) === "html" && targetExt === "docx"\n' +
  '        ? "docx:Office Open XML Text" : libreOfficeFilterFor(target),'
const ofdBefore = '    await convert(inputPath, outputPath);'
const ofdAfter = '    await convert(inputPath, outputPath, {\n' +
  '      fontDir: process.env.FLYINGMOUSE_OFD_FONT_DIR, silent: true\n' +
  '    });'
const ocrBefore = '  if (metadata.width && metadata.width < 2480) {\n' +
  '    pipeline.resize({ width: 2480, withoutEnlargement: false });\n' +
  '  }'
const ocrAfter = '  if (metadata.width && metadata.width < 2480) {\n' +
  '    const safeWidth = Math.floor(Math.sqrt(LIMITS.maxImagePixels * metadata.width / metadata.height));\n' +
  '    if (safeWidth > metadata.width)\n' +
  '      pipeline.resize({ width: Math.min(2480, safeWidth), withoutEnlargement: false });\n' +
  '  }'
const ofdDependencyBefore = 'const normalized = filePath.replace(/\\\\/g, "/");'
const ofdDependencyAfter = 'const normalized = filePath.replace(/\\\\/g, "/").replace(/^\\/+/, "");'
const ofdColorBefore = 'const parts = color.value.trim().split(/\\s+/).map(Number);'
const ofdColorAfter = 'const parts = color.value.trim().split(/\\s+/)' +
  '.map((value) => value.startsWith("#") ? parseInt(value.slice(1), 16) : Number(value));'
const ofdFontSubsetBefore = 'cjkFont = await pdfDoc.embedFont(cjkBytes, { subset: true });'
const ofdFontSubsetAfter = 'cjkFont = await pdfDoc.embedFont(cjkBytes, { subset: false });'
const ofdPathStartBefore = '      case "C":\n      case "S":\n' +
  '        commands.push({ type: "C" });\n        i += 1;\n        break;'
const ofdPathStartAfter = '      case "S":\n' +
  '        commands.push({ type: "M", x: Number(tokens[i + 1]), y: Number(tokens[i + 2]) });\n' +
  '        i += 3;\n        break;\n      case "C":\n' +
  '        commands.push({ type: "C" });\n        i += 1;\n        break;'
const pdfTableReplacements = [
  [
    '  const ratio = clamp(Number(options.minLengthRatio) || 0.35, 0.05, 1);',
    '  // Full-page 200 DPI renders need shorter rules for tables occupying only part of a page.\n' +
    '  // Smaller rasters retain the original thresholds.\n' +
    '  const fullPage = width >= 700 && height >= 1000;\n' +
    '  const ratio = clamp(Number(options.minLengthRatio) || (fullPage ? 0.10 : 0.35), 0.05, 1);',
  ],
  [
    '  const verticalRatio = clamp(Number(options.verticalMinLengthRatio) || 0.20, 0.05, 1);',
    '  const verticalRatio = clamp(Number(options.verticalMinLengthRatio) || (fullPage ? 0.02 : 0.20), 0.01, 1);',
  ],
  [
    '  const verticalMinLength = Math.max(Math.ceil(height * verticalRatio), Number(options.minVerticalLength) || 0);',
    '  const verticalMinLength = Math.max(Math.ceil(height * verticalRatio), Number(options.minVerticalLength) || (fullPage ? 40 : 0));',
  ],
  [
    '  // 取 0.20：既收下真实的 32% 表格竖线，又滤掉 10.5% 的字形竖笔，两侧留足裕量。',
    '  // 小图保持 0.20；高分辨率整页改用 0.02，同时至少要求 40px 连续竖线。',
  ],
  [
    '  // 会把字形竖笔（最长 ~40px）误当竖线；真实 A4 扫描页 0.05 ≈ 117px 安全。',
    '  // 会把字形竖笔误当竖线；高分辨率整页另外设置 40px 下限。',
  ],
]
const pdfCoverageBefore = '      return expected.length > 1 && !actual.includes(expected);'
const pdfCoverageAfter = `      if (expected.length <= 1 || actual.includes(expected)) return false;
      // PDF text extraction can omit superscripts that the layout engine retains.
      // Allow only one inserted glyph inside the same source cell; a missing
      // source glyph still fails the coverage check.
      for (let start = 0; start < actual.length; start++) {
        if (actual[start] !== expected[0]) continue;
        let sourceIndex = 1;
        let inserted = 0;
        for (let index = start + 1; index < actual.length && sourceIndex < expected.length; index++) {
          if (actual[index] === expected[sourceIndex]) sourceIndex++;
          else if (++inserted > 1) break;
        }
        if (sourceIndex === expected.length) return false;
      }
      return true;`
const pdfClassifierBefore = 'const { classifyPdf } = require("./pdf-classifier");'
const pdfClassifierAfter = 'const { classifyPdf, classifyPageMetrics } = require("./pdf-classifier");'
const pdfOcrNeedBefore = `function pdfPageNeedsOcr(page) {
  return !page.ocr && page.blank !== true && (
    !page.rows?.some((row) => row.some((cell) => String(cell).trim()))
    || page.imageCoverage > 0
  );
}`
const pdfLayoutOcrNeedAfter = `${pdfOcrNeedBefore}

function pdfPageNeedsLayoutOcr(page) {
  const cells = (page.rows || []).flat();
  const characters = Array.from(cells.join("")).filter((character) => !/\\s/u.test(character));
  const printable = characters.filter((character) => !/\\p{C}/u.test(character)).length;
  return !page.ocr && page.blank !== true && (
    !cells.some((cell) => String(cell).trim())
    || classifyPageMetrics({
      characterCount: characters.length,
      printableRatio: characters.length ? printable / characters.length : 0,
      imageCoverage: page.imageCoverage
    }) === "scanned"
  );
}`
const pdfLayoutCheckBefore = 'if (missing.length || source.some(pdfPageNeedsOcr)) {'
const pdfLayoutCheckAfter = 'if (missing.length || source.some(pdfPageNeedsLayoutOcr)) {'
const memoryBoundHelper = `function linuxMemoryBound(host, read, allowZero = false) {
  if (process.platform !== "linux" || typeof read !== "function") return host;
  try {
    const limited = read();
    if (Number.isFinite(limited) && (allowZero ? limited >= 0 : limited > 0))
      return Math.min(host, limited);
  } catch { /* Missing process limit falls back to host memory. */ }
  return host;
}

`
const structureMemoryBefore = '  const getFreeMemory = dependencies.getFreeMemory || (() => os.freemem());'
const structureMemoryAfter = '  const getFreeMemory = dependencies.getFreeMemory || (() =>\n' +
  '    linuxMemoryBound(os.freemem(), process.availableMemory, true));'
const resourceMemoryBefore = 'function calculateResourceLimits({ totalMemory = os.totalmem(), freeMemory = os.freemem() } = {}) {'
const resourceMemoryAfter = 'function calculateResourceLimits({\n' +
  '  totalMemory = linuxMemoryBound(os.totalmem(), process.constrainedMemory),\n' +
  '  freeMemory = linuxMemoryBound(os.freemem(), process.availableMemory, true)\n' +
  '} = {}) {'

function hash(bytes) { return createHash('sha256').update(bytes).digest('hex') }

function apply(directory) {
  if (path.resolve(directory) === source)
    throw new Error('Refusing to modify the pinned original source')
  const imagePath = path.join(directory, 'image.js')
  const bytes = fs.readFileSync(imagePath)
  const officePath = path.join(directory, 'office-convert.js')
  const officeBytes = fs.readFileSync(officePath)
  const ofdPath = path.join(directory, 'ofd-convert.js')
  const ofdBytes = fs.readFileSync(ofdPath)
  const pdfTablePath = path.join(directory, 'pdf-table-runtime.js')
  const pdfTableBytes = fs.readFileSync(pdfTablePath)
  const pdfPath = path.join(directory, 'pdf.js')
  const pdfBytes = fs.readFileSync(pdfPath)
  const structurePath = path.join(directory, 'pdf-structure-engine.js')
  const structureBytes = fs.readFileSync(structurePath)
  const resourcePath = path.join(directory, 'resource-policy.js')
  const resourceBytes = fs.readFileSync(resourcePath)
  const ocrPath = path.join(directory, 'ocr.js')
  const ocrBytes = fs.readFileSync(ocrPath)
  const ofdDependencyPath = path.join(directory, 'node_modules/@miconvert/ofd-to-pdf/dist/index.js')
  const ofdDependencyBytes = fs.readFileSync(ofdDependencyPath)
  if (hash(bytes) !== expectedImageSha256 || hash(officeBytes) !== expectedOfficeSha256 ||
    hash(ofdBytes) !== expectedOfdSha256 || hash(pdfTableBytes) !== expectedPdfTableSha256 ||
    hash(pdfBytes) !== expectedPdfSha256 ||
    hash(structureBytes) !== expectedPdfStructureSha256 ||
    hash(resourceBytes) !== expectedResourcePolicySha256 ||
    hash(ocrBytes) !== expectedOcrSha256 ||
    hash(ofdDependencyBytes) !== expectedOfdDependencySha256)
    throw new Error('Runtime source does not match pinned a7b9b15 files')
  const code = bytes.toString('utf8')
  const officeCode = officeBytes.toString('utf8')
  const ofdCode = ofdBytes.toString('utf8')
  let pdfTablePatched = pdfTableBytes.toString('utf8')
  const pdfCode = pdfBytes.toString('utf8')
  const structureCode = structureBytes.toString('utf8')
  const resourceCode = resourceBytes.toString('utf8')
  const ocrCode = ocrBytes.toString('utf8')
  const ofdDependencyCode = ofdDependencyBytes.toString('utf8')
  if (code.split(before).length !== 2 || code.split(rawBefore).length !== 2 ||
    code.split(rawRunBefore).length !== 2 || pdfCode.split(pdfCoverageBefore).length !== 2 ||
    pdfCode.split(pdfClassifierBefore).length !== 2 || pdfCode.split(pdfOcrNeedBefore).length !== 2 ||
    pdfCode.split(pdfLayoutCheckBefore).length !== 2 ||
    structureCode.split(structureMemoryBefore).length !== 2 ||
    structureCode.split('const DEFAULT_TIMEOUT_MS').length !== 2 ||
    resourceCode.split(resourceMemoryBefore).length !== 2 ||
    resourceCode.split('const MiB').length !== 2 ||
    officeCode.split(officeBefore).length !== 2 || ofdCode.split(ofdBefore).length !== 2 ||
    ocrCode.split(ocrBefore).length !== 2 ||
    ofdDependencyCode.split(ofdDependencyBefore).length !== 3 ||
    ofdDependencyCode.split(ofdColorBefore).length !== 3 ||
    ofdDependencyCode.split(ofdFontSubsetBefore).length !== 2 ||
    ofdDependencyCode.split(ofdPathStartBefore).length !== 2 ||
    ofdDependencyCode.split('y: currentY - fontSize,').length !== 3 ||
    ofdDependencyCode.split('y: startY - fontSize,').length !== 4)
    throw new Error('Expected original conversion calls exactly once')
  const patched = code.replace(before, after).replace(rawBefore, rawAfter)
    .replace(rawRunBefore, rawRunAfter)
  const officePatched = officeCode.replace(officeBefore, officeAfter)
  const ofdPatched = ofdCode.replace(ofdBefore, ofdAfter)
  const ocrPatched = ocrCode.replace(ocrBefore, ocrAfter)
  const ofdDependencyPatched = ofdDependencyCode.split(ofdDependencyBefore)
    .join(ofdDependencyAfter).split(ofdColorBefore).join(ofdColorAfter)
    .replace(ofdFontSubsetBefore, ofdFontSubsetAfter)
    .replace(ofdPathStartBefore, ofdPathStartAfter)
    .replaceAll('y: currentY - fontSize,', 'y: currentY,')
    .replaceAll('y: startY - fontSize,', 'y: startY,')
  for (const [before, after] of pdfTableReplacements) {
    if (pdfTablePatched.split(before).length !== 2)
      throw new Error('Expected original PDF table threshold exactly once')
    pdfTablePatched = pdfTablePatched.replace(before, after)
  }
  const presentationStartMarker = '// 演示文稿 -> HTML：LibreOffice'
  const presentationEndMarker = 'async function convertZipImagesToPdf'
  const presentationStart = pdfCode.indexOf(presentationStartMarker)
  const presentationEnd = pdfCode.indexOf(presentationEndMarker, presentationStart)
  if (presentationStart < 0 || presentationEnd < 0 ||
    pdfCode.lastIndexOf(presentationStartMarker) !== presentationStart ||
    pdfCode.lastIndexOf(presentationEndMarker) !== presentationEnd)
    throw new Error('Expected original presentation HTML implementation exactly once')
  const presentationPatch = fs.readFileSync(path.join(__dirname,
    'flyingmouse-patches/presentation-html.js.inc'), 'utf8')
  const zipImageBatch = fs.readFileSync(path.join(__dirname,
    'flyingmouse-patches/zip-image-batch.js.inc'), 'utf8').trimEnd()
  const zipImageCall = '    await convertImagesToPdf(images, outputPath);'
  if (pdfCode.split(zipImageCall).length !== 2)
    throw new Error('Expected original ZIP image conversion exactly once')
  const pdfPatched = (pdfCode.slice(0, presentationStart) + presentationPatch +
    pdfCode.slice(presentationEnd))
    .replace('const { convertImagesToPdf } = require("./image");',
      'const { convertImagesToPdf, inspectImageMetadata } = require("./image");')
    .replace('const { assertPdfPages } = require("./resource-policy");',
      'const { LIMITS, assertImageMetadata, assertPdfPages } = require("./resource-policy");')
    .replace(zipImageCall, zipImageBatch)
    .replace(pdfClassifierBefore, pdfClassifierAfter)
    .replace(pdfOcrNeedBefore, pdfLayoutOcrNeedAfter)
    .replace(pdfLayoutCheckBefore, pdfLayoutCheckAfter)
    .replace(pdfCoverageBefore, pdfCoverageAfter)
  const structurePatched = structureCode.replace('const DEFAULT_TIMEOUT_MS',
    memoryBoundHelper + 'const DEFAULT_TIMEOUT_MS').replace(structureMemoryBefore, structureMemoryAfter)
  const resourcePatched = resourceCode.replace('const MiB',
    memoryBoundHelper + 'const MiB').replace(resourceMemoryBefore, resourceMemoryAfter)
  fs.writeFileSync(imagePath, patched)
  fs.writeFileSync(officePath, officePatched)
  fs.writeFileSync(ofdPath, ofdPatched)
  fs.writeFileSync(pdfTablePath, pdfTablePatched)
  fs.writeFileSync(pdfPath, pdfPatched)
  fs.writeFileSync(structurePath, structurePatched)
  fs.writeFileSync(resourcePath, resourcePatched)
  fs.writeFileSync(ocrPath, ocrPatched)
  fs.writeFileSync(ofdDependencyPath, ofdDependencyPatched)
  fs.writeFileSync(path.join(directory, '.platform-fixes.json'), JSON.stringify({
    sourceRevision: 'a7b9b15d32db80cecedae00e89289088656fb1ae',
    fixRevision: 17,
    imageSourceSha256: expectedImageSha256,
    imageRuntimeSha256: hash(Buffer.from(patched)),
    officeSourceSha256: expectedOfficeSha256,
    officeRuntimeSha256: hash(Buffer.from(officePatched)),
    ofdSourceSha256: expectedOfdSha256,
    ofdRuntimeSha256: hash(Buffer.from(ofdPatched)),
    pdfTableSourceSha256: expectedPdfTableSha256,
    pdfTableRuntimeSha256: hash(Buffer.from(pdfTablePatched)),
    pdfSourceSha256: expectedPdfSha256,
    pdfRuntimeSha256: hash(Buffer.from(pdfPatched)),
    pdfStructureSourceSha256: expectedPdfStructureSha256,
    pdfStructureRuntimeSha256: hash(Buffer.from(structurePatched)),
    resourcePolicySourceSha256: expectedResourcePolicySha256,
    resourcePolicyRuntimeSha256: hash(Buffer.from(resourcePatched)),
    ocrSourceSha256: expectedOcrSha256,
    ocrRuntimeSha256: hash(Buffer.from(ocrPatched)),
    ofdDependencySourceSha256: expectedOfdDependencySha256,
    ofdDependencyRuntimeSha256: hash(Buffer.from(ofdDependencyPatched)),
    fixes: [
      'Use FFmpeg stream_loop for still-image video, including AVIF',
      'Accept LibRaw TIFF output named after the complete input file',
      'Normalize failed RAW decoder errors and clean their temporary files',
      'Select an explicit LibreOffice DOCX export filter for EPUB HTML',
      'Keep PDF.js dependencies physically inside the isolated runtime root',
      'Supply a CJK font directory and suppress a third-party OFD stdout banner',
      'Detect small ruled tables on full-page PDF renders without changing small-raster thresholds',
      'Stream rendered slides into self-contained presentation HTML while retaining selectable text',
      'Keep OCR enlargement within the original pixel budget without shrinking source images',
      'Resolve absolute OFD archive paths in the third-party reader',
      'Decode OFD hexadecimal color components before rendering text and shapes',
      'Embed a complete CJK TrueType font to avoid missing glyphs in PDF font subsetting',
      'Treat OFD text Y as a baseline and S path commands as subpath starts',
      'Convert ZIP images in memory-budgeted batches before merging every PDF page',
      'Keep PDF-to-Word layout output when it preserves a source cell plus one superscript glyph',
      'Bound Linux PDF structure and resource budgets by process container memory',
      'Use original PDF page classification only for DOCX layout acceptance; retain text OCR routing',
    ],
  }, null, 2) + '\n')
}

function verifyRuntime(directory) {
  const manifest = require(path.join(root, 'docs/flyingmouse-migration/source-a7b9b15-manifest.json'))
  const fixes = JSON.parse(fs.readFileSync(path.join(directory, '.platform-fixes.json'), 'utf8'))
  if (fixes.sourceRevision !== manifest.sourceRevision || fixes.fixRevision !== 17 ||
    fixes.imageSourceSha256 !== expectedImageSha256 ||
    fixes.officeSourceSha256 !== expectedOfficeSha256 ||
    fixes.ofdSourceSha256 !== expectedOfdSha256 ||
    fixes.pdfTableSourceSha256 !== expectedPdfTableSha256 ||
    fixes.pdfSourceSha256 !== expectedPdfSha256 ||
    fixes.pdfStructureSourceSha256 !== expectedPdfStructureSha256 ||
    fixes.resourcePolicySourceSha256 !== expectedResourcePolicySha256 ||
    fixes.ocrSourceSha256 !== expectedOcrSha256 ||
    fixes.ofdDependencySourceSha256 !== expectedOfdDependencySha256 ||
    fs.realpathSync(path.join(directory, 'node_modules/pdfjs-dist/package.json')) !==
      path.join(directory, 'node_modules/pdfjs-dist/package.json'))
    throw new Error('Runtime copy metadata or dependencies are invalid')
  for (const item of manifest.files) {
    const actual = hash(fs.readFileSync(path.join(directory, item.path)))
    const expected = item.path === 'image.js' ? fixes.imageRuntimeSha256
      : item.path === 'office-convert.js' ? fixes.officeRuntimeSha256
        : item.path === 'ofd-convert.js' ? fixes.ofdRuntimeSha256
          : item.path === 'pdf-table-runtime.js' ? fixes.pdfTableRuntimeSha256
            : item.path === 'pdf.js' ? fixes.pdfRuntimeSha256
              : item.path === 'pdf-structure-engine.js' ? fixes.pdfStructureRuntimeSha256
                : item.path === 'resource-policy.js' ? fixes.resourcePolicyRuntimeSha256
              : item.path === 'ocr.js' ? fixes.ocrRuntimeSha256 : item.sha256
    if (actual !== expected) throw new Error(`Runtime source mismatch: ${item.path}`)
  }
  if (hash(fs.readFileSync(path.join(directory, 'node_modules/@miconvert/ofd-to-pdf/dist/index.js')))
    !== fixes.ofdDependencyRuntimeSha256)
    throw new Error('Runtime OFD dependency mismatch')
}

if (process.argv[2] === '--in-place') {
  apply(path.resolve(process.argv[3]))
} else if (process.argv[2] === '--copy') {
  execFileSync(process.execPath, [path.join(__dirname, 'verify-flyingmouse-source.cjs')], { stdio: 'inherit' })
  const destination = path.resolve(process.argv[3])
  if (fs.existsSync(destination)) {
    verifyRuntime(destination)
  } else {
    const temporary = `${destination}-${randomUUID()}`
    fs.mkdirSync(path.dirname(destination), { recursive: true })
    try {
      fs.cpSync(source, temporary, {
        recursive: true,
        filter: (item) => !['node_modules', 'output'].some((name) =>
          item === path.join(source, name)),
      })
      fs.cpSync(path.join(source, 'node_modules'), path.join(temporary, 'node_modules'), { recursive: true })
      apply(temporary)
      verifyRuntime(temporary)
      fs.renameSync(temporary, destination)
    } catch (error) {
      fs.rmSync(temporary, { recursive: true, force: true })
      throw error
    }
  }
  console.log(destination)
} else {
  throw new Error('Usage: apply-flyingmouse-platform-fixes.cjs --copy <runtime-dir> | --in-place <source-dir>')
}
