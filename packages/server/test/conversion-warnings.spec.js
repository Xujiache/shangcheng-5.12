"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var conversion_warnings_1 = require("../src/modules/ledger-conversion/conversion.warnings");
describe('conversion warnings', function () {
    test('keeps distinct Chinese OCR and experimental warnings without details or passwords', function () {
        var outputs = [
            { warnings: [
                    { code: 'OCR_REVIEW_RECOMMENDED', messages: { zhCN: '请核对金额 secret\n和编号。' }, details: { password: 'secret' } },
                    { code: 'EXPERIMENTAL_INPUT', messages: { zhCN: '此输入仍属实验性，请复核转换结果。' } },
                ] },
            { warnings: [
                    { code: 'OCR_REVIEW_RECOMMENDED', messages: { zhCN: '请核对金额 secret\n和编号。' } },
                    { code: 'INVALID', messages: { enUS: 'Only English' } },
                    'unstructured warning',
                ] },
        ];
        var warnings = (0, conversion_warnings_1.collectConversionWarnings)(outputs, { password: 'secret' });
        expect(warnings).toEqual(['请核对金额 *** 和编号。', '此输入仍属实验性，请复核转换结果。']);
        expect(JSON.stringify(warnings)).not.toContain('secret');
    });
    test('bounds stored warning count and size, and tolerates older jobs', function () {
        var _a;
        var outputs = [{ warnings: Array.from({ length: 15 }, function (_, index) { return ({
                    code: 'EXPERIMENTAL_INPUT',
                    messages: { zhCN: "\u7B2C".concat(index, "\u6761").concat('很'.repeat(250)) },
                }); }) }];
        var warnings = (0, conversion_warnings_1.collectConversionWarnings)(outputs, {});
        expect(warnings).toHaveLength(12);
        expect(warnings.every(function (warning) { return warning.length <= 180; })).toBe(true);
        expect((0, conversion_warnings_1.publicConversionWarnings)({})).toEqual([]);
        expect((0, conversion_warnings_1.publicConversionWarnings)(null)).toEqual([]);
        expect((0, conversion_warnings_1.publicConversionWarnings)((_a = {}, _a[conversion_warnings_1.CONVERSION_WARNINGS_OPTION_KEY] = ['密码 secret'], _a.password = 'secret', _a))).toEqual(['密码 ***']);
    });
});
