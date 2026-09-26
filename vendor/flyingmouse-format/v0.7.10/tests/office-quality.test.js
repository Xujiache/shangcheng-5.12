const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const path = require("node:path");
const { test } = require("node:test");

const {
  OfficeQualityError,
  inspectEttForCsv,
  inspectXlsxForCsv,
  validatePresentationHtml,
  visibleBodyText,
  xlsmMacroLossWarning
} = require("../office-quality");

test("XLSM to XLSX warns about VBA loss without falsely claiming formulas are removed", () => {
  const warning = xlsmMacroLossWarning("xlsx");
  assert.equal(warning.code, "XLSM_MACROS_OMITTED");
  assert.match(warning.messages.zhCN, /不保留 VBA 宏/);
  assert.match(warning.messages.enUS, /omits VBA macros/);
  assert.doesNotMatch(warning.messages.zhCN, /不保留宏和公式表达式/);
  for (const target of ["pdf", "csv", "html"]) {
    assert.match(xlsmMacroLossWarning(target).messages.zhCN, /不保留宏和公式表达式/);
  }
  assert.equal(xlsmMacroLossWarning("ods"), null);
  assert.equal(xlsmMacroLossWarning("xls"), null);
});

test("presentation HTML accepts visible slide text inside a non-empty body", () => {
  const result = validatePresentationHtml(`<!doctype html><html><head><title>Deck</title></head>
    <body><section><h1>Quarterly results</h1><p>Revenue grew.</p></section></body></html>`);

  assert.equal(result.visibleText, "Quarterly results Revenue grew.");
});

test("presentation HTML rejects missing, empty, and non-visible bodies with a stable bilingual error", () => {
  for (const html of [
    "<html><head><title>Only a title</title></head></html>",
    "<html><body>  </body></html>",
    "<html><body><script>slideText = 'hidden';</script><style>.x{}</style><!-- note --></body></html>"
  ]) {
    assert.throws(
      () => validatePresentationHtml(html),
      (error) => error instanceof OfficeQualityError
        && error.code === "PRESENTATION_HTML_EMPTY"
        && /幻灯片/.test(error.messages.zhCN)
        && /slide text/i.test(error.messages.enUS)
    );
  }
});

test("XLSX to CSV follows LibreOffice CLI by exporting the first sheet, not activeTab", async () => {
  class Workbook {
    constructor() {
      this.views = [{ activeTab: 1 }];
      this.worksheets = [
        worksheet("Overview", [{ formula: "SUM(A1:A2)", result: 3 }, 3]),
        worksheet("Data", [1]),
        worksheet("Archive", ["old"])
      ];
      this.xlsx = { readFile: async (filePath) => { this.loadedPath = filePath; } };
    }
  }

  const result = await inspectXlsxForCsv("book.xlsx", { Workbook });

  assert.equal(result.exportedSheet, "Overview");
  assert.deepEqual(result.ignoredSheets, ["Data", "Archive"]);
  assert.equal(result.formulaCount, 1);
  assert.deepEqual(result.warnings.map((warning) => warning.code), [
    "XLSX_CSV_EXPORTED_SHEET",
    "XLSX_CSV_SHEETS_OMITTED",
    "XLSX_CSV_FORMULAS_AS_VALUES"
  ]);
  for (const warning of result.warnings) {
    assert.ok(warning.messages.zhCN);
    assert.ok(warning.messages.enUS);
  }
  assert.match(result.warnings[0].messages.zhCN, /第一张工作表/);
  assert.match(result.warnings[0].messages.enUS, /first worksheet/i);
  assert.deepEqual(result.warnings[1].details, {
    exportedSheet: "Overview",
    ignoredSheets: ["Data", "Archive"]
  });
});

test("XLSX to CSV falls back to the first sheet and emits no loss warning for a plain single-sheet book", async () => {
  class Workbook {
    constructor() {
      this.views = [];
      this.worksheets = [worksheet("Only", ["plain value"])];
      this.xlsx = { readFile: async () => {} };
    }
  }

  const result = await inspectXlsxForCsv("single.xlsx", { Workbook });

  assert.equal(result.exportedSheet, "Only");
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["XLSX_CSV_EXPORTED_SHEET"]);
});

test("ETT to CSV previews all sheets and formulas before reporting first-sheet loss", async () => {
  let previewPath;
  class Workbook {
    constructor() {
      this.worksheets = [
        worksheet("交易", [{ formula: "SUM(A1:A2)", result: 3 }]),
        worksheet("资金", [7])
      ];
      this.xlsx = { readFile: async (filePath) => { assert.equal(filePath, previewPath); } };
    }
  }
  const result = await inspectEttForCsv("sample.ett", "sample.ett", {
    Workbook,
    convertWithLibreOffice: async (input, output, originalName, target) => {
      assert.deepEqual([input, originalName, target], ["sample.ett", "sample.ett", "xlsx"]);
      previewPath = output;
      await fsp.writeFile(output, "preview");
    }
  });
  assert.equal(result.exportedSheet, "交易");
  assert.deepEqual(result.ignoredSheets, ["资金"]);
  assert.equal(result.formulaCount, 1);
  assert.deepEqual(result.warnings.map((item) => item.code), [
    "ETT_CSV_EXPORTED_SHEET", "ETT_CSV_SHEETS_OMITTED", "ETT_CSV_FORMULAS_AS_VALUES"
  ]);
  assert.equal(fs.existsSync(path.dirname(previewPath)), false);
});

test("ETT to CSV retains a visible caution if workbook preview fails", async () => {
  const result = await inspectEttForCsv("sample.ett", "sample.ett", {
    convertWithLibreOffice: async () => { throw new Error("preview unavailable"); }
  });
  assert.deepEqual(result.warnings.map((item) => item.code), ["ETT_CSV_PREVIEW_UNAVAILABLE"]);
  assert.match(result.warnings[0].messages.zhCN, /工作表和公式/);
  assert.match(result.warnings[0].messages.enUS, /sheets and formulas/);
});

test("server wires Office quality results into the existing warning and bilingual error contracts", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "server.js"), "utf8");
  assert.match(source, /require\(["']\.\/office-quality["']\)/);
  assert.match(source, /inspectXlsxForCsv\(file\.path\)/);
  assert.match(source, /inspectEttForCsv\(file\.path, originalName\)/);
  assert.match(source, /xlsmMacroLossWarning\(requestedTarget\)/);
  assert.match(source, /conversionResult\s*=\s*await inspectXlsxForCsv/);
  // 演示文稿 HTML 已改走 LO->PDF->文本提取（不再依赖 LO 的 html 导出过滤器）
  assert.match(source, /convertPresentationToHtml\(file\.path, outputPath, originalName\)/);
  assert.doesNotMatch(source, /validatePresentationHtml\(await fsp\.readFile/);
  assert.match(source, /payload\.messages\s*=\s*error\.messages/);
});

test("XLSX to CSV degrades gracefully when exceljs cannot parse the workbook structure", async () => {
  class Workbook {
    constructor() {
      this.xlsx = {
        readFile: async () => {
          throw new TypeError("Cannot read properties of undefined (reading 'sheets')");
        }
      };
    }
  }

  const result = await inspectXlsxForCsv("prefixed.xlsx", { Workbook });

  assert.equal(result.previewUnavailable, true);
  assert.equal(result.exportedSheet, null);
  assert.deepEqual(result.ignoredSheets, []);
  assert.equal(result.formulaCount, 0);
  assert.deepEqual(result.warnings.map((warning) => warning.code), ["XLSX_CSV_PREVIEW_UNAVAILABLE"]);
  assert.match(result.warnings[0].messages.zhCN, /无法预览工作表信息/);
  assert.match(result.warnings[0].messages.enUS, /Worksheet preview unavailable/i);
});

test("Win7 staging copies the Office quality runtime module", () => {
  const source = fs.readFileSync(path.join(__dirname, "..", "win7-build-profile.js"), "utf8");
  assert.match(source, /["']office-quality\.js["']/);
});

test("numeric HTML entities outside the Unicode range never crash text extraction", () => {
  assert.equal(
    visibleBodyText("<body><p>x &#99999999; y &#x110000; z</p></body>"),
    "x &#99999999; y &#x110000; z"
  );
  assert.equal(
    visibleBodyText("<body><p>ok &#65; &#x41; end</p></body>"),
    "ok A A end"
  );
});

function worksheet(name, values) {
  return {
    name,
    eachRow(callback) {
      callback({
        eachCell(cellCallback) {
          values.forEach((value) => cellCallback({ value }));
        }
      });
    }
  };
}
