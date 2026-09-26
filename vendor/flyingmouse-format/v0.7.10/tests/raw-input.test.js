// 相机 RAW 原片（cr2/nef/arw/dng 等）支持回归测试
// - 纯逻辑：categoryForExt / targetsForExt 对 RAW 扩展名的分类与目标
// - 静态断言：dcraw 调用参数（sRGB）、config rawInput、capability 暴露
// - 运行时（仅当 dcraw 引擎存在）：伪 RAW 文件应报解码失败而非静默成功
const assert = require("node:assert/strict");
const fsp = require("node:fs/promises");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { test } = require("node:test");
const sharp = require("sharp");

const { categoryForExt, targetsForExt } = require("../utils");
const { rawInput, DCRAW_PATH } = require("../config");
const { prepareImageInput } = require("../image");

const RAW_EXTS = ["cr2", "cr3", "crw", "nef", "arw", "dng", "raf", "rw2", "orf", "pef", "srw", "3fr", "erf", "fff", "iiq", "kdc", "mef", "mrw", "x3f"];

test("rawInput 白名单覆盖常见相机 RAW 扩展名", () => {
  for (const ext of RAW_EXTS) {
    assert.ok(rawInput.has(ext), `rawInput 应包含 ${ext}`);
  }
});

test("categoryForExt 把 RAW 扩展名归为 image", () => {
  for (const ext of RAW_EXTS) {
    assert.equal(categoryForExt(ext), "image", `${ext} 应为 image 类`);
  }
  assert.equal(categoryForExt("raw"), "unknown", ".raw 未在白名单，应保持 unknown");
  // normalizeExt 不归一大小写；server 调用链 extFromName 已先 toLowerCase，这里按小写断言
  assert.equal(categoryForExt("cr2"), "image", "cr2 小写应归 image");
});

test("targetsForExt 对 RAW 输入暴露图片类目标（与普通图片一致）", () => {
  const noEngines = { ffmpeg: false, ocr: false, poppler: false, libreoffice: false };
  const targets = targetsForExt("nef", noEngines);
  for (const expected of ["png", "jpg", "webp", "gif", "avif", "tiff", "pdf"]) {
    assert.ok(targets.includes(expected), `nef 应可转 ${expected}`);
  }
  assert.ok(!targets.includes("zip"), "zip 压缩目标已于 2026-09-04 移除");
  assert.ok(!targets.includes("mp4"), "无 ffmpeg 时不应暴露视频目标");
  const withEngines = targetsForExt("cr2", { ffmpeg: true, ocr: true, poppler: false, libreoffice: false });
  assert.ok(withEngines.includes("mp4") && withEngines.includes("txt"), "有 ffmpeg/ocr 时应暴露视频与 OCR 目标");
});

test("静态：image.js dcraw 调用用 sRGB（-o 1）并输出 TIFF（-T）", () => {
  const source = require("fs").readFileSync(path.join(__dirname, "..", "image.js"), "utf8");
  assert.ok(source.includes('["-T", "-o", "1"'), "dcraw 参数应为 -T -o 1（TIFF + sRGB）");
  assert.ok(source.includes('["-i", "-v"'), "RAW 解码前应读取 dcraw 输出尺寸");
  assert.ok(!source.includes('"-o", "6"'), "不得再使用 ACES 线性（-o 6）导致偏色");
  assert.ok(source.includes("RAW 解码引擎（dcraw）不可用"), "缺少 dcraw 时应报明确错误");
});

test("静态：config.js rawInput 与实验性标注存在", () => {
  const source = require("fs").readFileSync(path.join(__dirname, "..", "config.js"), "utf8");
  assert.ok(source.includes("rawInput"), "config 应导出 rawInput");
  assert.ok(source.includes('raw: [...rawInput]'), "RAW 应标记为实验性输入");
});

test("静态：server.js capability 按 DCRAW_PATH 暴露 RAW 输入", () => {
  const source = require("fs").readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.ok(source.includes("DCRAW_PATH ? rawInput"), "capability 应在有 dcraw 时暴露 raw 输入");
});

test("运行时：伪 RAW 文件经 prepareImageInput 应报解码失败（有 dcraw 才跑）", { skip: !DCRAW_PATH }, async () => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "raw-input-test-"));
  try {
    const fakeRaw = path.join(scratch, "fake.cr2");
    await fsp.writeFile(fakeRaw, Buffer.from("not a real RAW file, just garbage bytes for decode failure", "utf8"));
    await assert.rejects(
      prepareImageInput(fakeRaw),
      (error) => error.errorCode === "IMAGE_METADATA_INVALID",
      "伪 RAW 文件应明确失败"
    );
  } finally {
    await fsp.rm(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  }
});

test("RAW 预检拒绝无效和超 20MP 元数据，解码失败也清理临时目录", async (t) => {
  const scratch = await fsp.mkdtemp(path.join(os.tmpdir(), "raw-preflight-test-"));
  t.after(() => fsp.rm(scratch, { recursive: true, force: true }));
  const source = path.join(scratch, "fake.cr2");
  const temp = path.join(scratch, "temp");
  const marker = path.join(scratch, "decode-called");
  await fsp.writeFile(source, "fake RAW");
  await fsp.mkdir(temp);
  for (const [probe, expectedCode, decodeCalled] of [
    ["Camera: Unknown\n", "IMAGE_METADATA_INVALID", false],
    ["Output size: 5000 x 5000\n", "IMAGE_PIXELS_EXCEEDED", false],
    ["Output size: 3474 x 2314\n", null, true]
  ]) {
    await fsp.rm(marker, { force: true });
    const engineDir = path.join(__dirname, "..");
    const script = `const utils = require(${JSON.stringify(path.join(engineDir, "utils.js"))});
utils.run = async (_command, args) => {
  if (args[0] === '-i') return { stdout: ${JSON.stringify(probe)}, stderr: '' };
  require('fs').writeFileSync(${JSON.stringify(marker)}, 'called');
  throw new Error('decode failed');
};
require(${JSON.stringify(path.join(engineDir, "image.js"))}).prepareImageInput(${JSON.stringify(source)})
  .then(() => process.exit(2), e => { console.log(JSON.stringify({ errorCode: e.errorCode || null, limit: e.details?.limitMegapixels })); });`;
    const result = spawnSync(process.execPath, ["-e", script], {
      env: { ...process.env, FLYINGMOUSE_DCRAW_PATH: process.execPath, TMPDIR: temp },
      encoding: "utf8", timeout: 10_000
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const observed = JSON.parse(result.stdout.trim().split(/\r?\n/).filter((line) => line.startsWith("{")).at(-1));
    assert.equal(observed.errorCode, expectedCode);
    if (expectedCode === "IMAGE_PIXELS_EXCEEDED") assert.equal(observed.limit, 20);
    assert.equal(await fsp.stat(marker).then(() => true, () => false), decodeCalled);
    assert.deepEqual((await fsp.readdir(temp)).filter((name) => name.startsWith("flyingmouse-raw-input-")), [],
      "失败后的 RAW 临时目录必须删除");
  }
});

test("真实 CR2/DNG 在解码前通过尺寸预检", { skip: !DCRAW_PATH || !process.env.FLYINGMOUSE_RAW_FIXTURE_DIR }, async () => {
  for (const [name, width, height] of [
    ["Canon-EOS-350D.CR2", 3474, 2314],
    ["Pentax-K-x.DNG", 4309, 2868]
  ]) {
    const prepared = await prepareImageInput(path.join(process.env.FLYINGMOUSE_RAW_FIXTURE_DIR, name));
    try {
      const metadata = await sharp(prepared.inputPath).metadata();
      assert.equal(metadata.width, width);
      assert.equal(metadata.height, height);
    } finally {
      await fsp.rm(prepared.tempDir, { recursive: true, force: true });
    }
  }
});
