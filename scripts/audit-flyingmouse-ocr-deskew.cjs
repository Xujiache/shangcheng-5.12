#!/usr/bin/env node
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const os = require('node:os');

const runtime = path.resolve(process.argv[2] || path.join(__dirname, '../vendor/flyingmouse-format/upstream-a7b9b15'));
const { createRequire } = require('node:module');
const runtimeRequire = createRequire(path.join(runtime, 'ocr.js'));
const sharp = runtimeRequire('sharp');
const { prepareImageForOcr, createOcrWorker, recognizeImageResultWithWorker } = runtimeRequire('./ocr');
const fixtureDir = path.join(__dirname, '../docs/linux-windows-parity/fixtures/ocr');
const cases = [
  { file: 'false-deskew.png', sha256: '67d1c1113635641cc8f327bf0029320be13a85a56e5f602465e37983a3c9bfa1',
    expected: ['量窗助手', '12345'] },
  { file: 'invoice-skew5.png', sha256: 'fbd86c070b3fcc1a293a917808713669891ee6388c17213eabe5f292ee19e3c8',
    expected: ['采购明细单', '门窗订单', '安装费用', '合计', '474.00', '712.00', '1186.00'] }
];

function compact(text) { return String(text || '').replace(/\s/g, ''); }

async function inspect(worker, input, orientation = 0) {
  const prepared = await prepareImageForOcr(input);
  try {
    const image = orientation ? path.join(prepared.tempDir, 'upright.png') : prepared.outputPath;
    if (orientation) await sharp(prepared.outputPath).rotate(orientation).png().toFile(image);
    const candidates = [];
    for (const rotateAuto of [false, true]) {
      const { data } = await worker.recognize(image,
        { rotateAuto, tessedit_pageseg_mode: '6' }, { text: true, blocks: true });
      const lines = (data.blocks || []).flatMap(block => (block.paragraphs || [])
        .flatMap(paragraph => paragraph.lines || []));
      candidates.push({ rotateAuto, text: String(data.text || '').trim(), confidence: data.confidence,
        deskewDegrees: (data.rotateRadians || 0) * 180 / Math.PI,
        lines: lines.map(line => {
          const baseline = line.baseline || {};
          return { text: String(line.text || '').trim(), confidence: line.confidence,
            baselineDegrees: Number.isFinite(baseline.x0) && Number.isFinite(baseline.x1)
              ? Math.atan2(baseline.y1 - baseline.y0, baseline.x1 - baseline.x0) * 180 / Math.PI : null };
        }) });
    }
    return candidates;
  } finally {
    await fsp.rm(prepared.tempDir, { recursive: true, force: true });
  }
}

async function main() {
  const worker = await createOcrWorker();
  const results = [];
  const rotationDir = process.argv.includes('--rotations')
    ? await fsp.mkdtemp(path.join(os.tmpdir(), 'fm-ocr-rotations-')) : null;
  try {
    const inputs = [...cases];
    if (rotationDir) {
      const source = path.join(fixtureDir, cases[0].file);
      for (const rotation of [90, 180]) {
        const file = `false-deskew-rotated-${rotation}.png`;
        await sharp(source).rotate(rotation).png().toFile(path.join(rotationDir, file));
        inputs.push({ file, expected: cases[0].expected, rotation });
      }
    }
    for (const item of inputs) {
      const input = path.join(item.rotation ? rotationDir : fixtureDir, item.file);
      const sha256 = crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');
      if (item.sha256 && sha256 !== item.sha256) throw new Error(`${item.file}: SHA256 mismatch`);
      const candidates = await inspect(worker, input, item.rotation ? 360 - item.rotation : 0);
      let original;
      try {
        const result = await recognizeImageResultWithWorker(worker, input);
        original = { text: result.text, confidence: result.confidence,
          warnings: result.warnings.map(warning => warning.code) };
      } catch (error) {
        original = { error: error.code || error.message };
      }
      const missing = item.expected.filter(phrase => !compact(original.text).includes(compact(phrase)));
      results.push({ fixture: item.file, sha256, expected: item.expected, candidates, original, missing,
        passed: missing.length === 0 });
    }
  } finally {
    await worker.terminate();
    if (rotationDir) await fsp.rm(rotationDir, { recursive: true, force: true });
  }
  process.stdout.write(JSON.stringify({ runtime, results }, null, 2) + '\n');
  if (results.some(result => !result.passed)) process.exitCode = 1;
}

main().catch(error => { console.error(error); process.exitCode = 1; });
