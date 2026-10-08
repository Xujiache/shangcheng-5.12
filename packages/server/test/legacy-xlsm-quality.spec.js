"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var node_fs_1 = require("node:fs");
var node_path_1 = require("node:path");
var node_zlib_1 = require("node:zlib");
var fixture = (0, node_path_1.join)(__dirname, 'fixtures/xlsm-macro-loss');
function zipEntry(zip, name) {
    var end = zip.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'));
    if (end < 0)
        throw new Error('ZIP end record missing');
    var offset = zip.readUInt32LE(end + 16);
    var count = zip.readUInt16LE(end + 10);
    for (var index = 0; index < count; index++) {
        if (zip.readUInt32LE(offset) !== 0x02014b50)
            throw new Error('ZIP central directory invalid');
        var method = zip.readUInt16LE(offset + 10);
        var size = zip.readUInt32LE(offset + 20);
        var nameLength = zip.readUInt16LE(offset + 28);
        var extraLength = zip.readUInt16LE(offset + 30);
        var commentLength = zip.readUInt16LE(offset + 32);
        var entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength);
        if (entryName === name) {
            var local = zip.readUInt32LE(offset + 42);
            var start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
            var data = zip.subarray(start, start + size);
            if (method === 0)
                return data;
            if (method === 8)
                return (0, node_zlib_1.inflateRawSync)(data);
            throw new Error("Unsupported ZIP method ".concat(method));
        }
        offset += 46 + nameLength + extraLength + commentLength;
    }
    return null;
}
test('real XLSM to XLSX fixture retains sheets, Chinese cells and formulas while removing VBA', function () {
    var _a, _b, _c, _d, _e;
    var source = (0, node_fs_1.readFileSync)((0, node_path_1.join)(fixture, 'source.xlsm'));
    var output = (0, node_fs_1.readFileSync)((0, node_path_1.join)(fixture, 'export.xlsx'));
    expect((_a = zipEntry(source, 'xl/vbaProject.bin')) === null || _a === void 0 ? void 0 : _a.length).toBeGreaterThan(10000);
    expect(zipEntry(output, 'xl/vbaProject.bin')).toBeNull();
    for (var _i = 0, _f = [source, output]; _i < _f.length; _i++) {
        var zip = _f[_i];
        var workbook = (_b = zipEntry(zip, 'xl/workbook.xml')) === null || _b === void 0 ? void 0 : _b.toString('utf8');
        var cells = (_c = zipEntry(zip, 'xl/worksheets/sheet1.xml')) === null || _c === void 0 ? void 0 : _c.toString('utf8');
        expect(workbook).toMatch(/name="Sheet1"/);
        expect(workbook).toMatch(/name="Sheet2"/);
        expect(cells).toMatch(/<f(?:\s[^>]*)?>B2\*2<\/f>/);
        expect(cells).toMatch(/<f(?:\s[^>]*)?>SUM\(B2:B3\)<\/f>/);
        for (var _g = 0, _h = ['5682', '11364', '7319', '13001']; _g < _h.length; _g++) {
            var value = _h[_g];
            expect(cells).toContain("<v>".concat(value, "</v>"));
        }
    }
    expect((_d = zipEntry(source, 'xl/worksheets/sheet1.xml')) === null || _d === void 0 ? void 0 : _d.toString('utf8')).toContain('中文内容完整保留');
    expect((_e = zipEntry(output, 'xl/sharedStrings.xml')) === null || _e === void 0 ? void 0 : _e.toString('utf8')).toContain('中文内容完整保留');
});
