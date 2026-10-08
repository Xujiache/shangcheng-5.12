"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateMetalQuoteItem = calculateMetalQuoteItem;
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var metal_config_1 = require("./metal.config");
var metal_spec_table_json_1 = require("./metal-spec-table.json");
var rows = metal_spec_table_json_1.default;
var keys = new Set(['lengthMm', 'widthMm', 'thicknessMm', 'quantity', 'model', 'lengthM',
    'outerLengthMm', 'outerWidthMm', 'diameterMm', 'heightMm', 'webThicknessMm',
    'flangeThicknessMm', 'lipMm', 'areaMm2']);
var fail = function (message) { throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, message); };
var rounded = function (value, digits) { return Math.round((value + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits); };
function number(raw, name, maximum) {
    if (maximum === void 0) { maximum = 1000000; }
    if (raw === undefined || raw === '' || raw === null)
        return 0;
    var value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > maximum)
        fail("".concat(name, "\u8D85\u51FA\u5141\u8BB8\u8303\u56F4"));
    return value;
}
function normalized(model) {
    return model.normalize('NFKC').toUpperCase().replace(/\s+/g, '')
        .replace(/[×X]/g, '*').replace(/^∠/, '').replace(/^L(?=\d+\*)/, '');
}
function calculateMetalQuoteItem(item, config) {
    var material = metal_config_1.METAL_MATERIALS.find(function (candidate) { return candidate.id === item.materialId; });
    if (!material || material.category !== item.category)
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '材质与类别不匹配');
    var spec = item.spec;
    if (!spec || typeof spec !== 'object' || Array.isArray(spec) || Object.keys(spec).length > 16)
        fail('规格无效');
    for (var _i = 0, _a = Object.entries(spec); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        if (!keys.has(key) || (typeof value !== 'number' && typeof value !== 'string') ||
            (typeof value === 'string' && value.length > 80))
            fail('规格字段无效');
    }
    var d = function (key, maximum) { return number(spec[key], key, maximum); };
    var density = number(item.density, '密度', 30);
    var rawFactor = number(item.quoteFactor, '报价系数', 100);
    if (density < 0.01 || rawFactor < 0.01)
        fail('密度或报价系数无效');
    var factor = rounded(rawFactor, 2);
    var fee = number(item.processingFeeFen, '加工费', 999999900);
    if (!Number.isInteger(fee))
        fail('加工费必须为整数分');
    var shape = material.category === 'section'
        ? material.id.includes('.al.') ? 'aluminum'
            : material.id.includes('.ss.') ? item.sectionShape || 'angle'
                : material.id.split('.').pop()
        : '';
    var quantity = material.category === 'plate' ? d('quantity', 100000) : d('lengthM', 100000);
    if (material.category === 'plate' && !Number.isInteger(quantity))
        fail('张数必须为整数');
    var unit = 0;
    if (material.category === 'plate')
        unit = d('lengthMm') * d('widthMm') * d('thicknessMm') * density / 1e6;
    else if (material.category === 'flatBar')
        unit = d('widthMm') * d('thicknessMm') * density / 1000;
    else if (material.category === 'roundBar')
        unit = Math.PI * Math.pow(d('diameterMm'), 2) / 4 * density / 1000;
    else if (material.category === 'roundTube') {
        var diameter = d('diameterMm'), wall = d('thicknessMm');
        if (wall * 2 > diameter)
            fail('壁厚不能超过外径的一半');
        unit = Math.PI * (diameter - wall) * wall * density / 1000;
    }
    else if (material.category === 'squareTube') {
        var length_1 = d('outerLengthMm'), width = d('outerWidthMm'), wall = d('thicknessMm');
        if (wall * 2 > Math.min(length_1, width))
            fail('壁厚不能超过最短边的一半');
        unit = (length_1 + width - 2 * wall) * 2 * wall * density / 1000;
    }
    else {
        var model = String(spec.model || '');
        var key_1 = normalized(model);
        var row = rows.find(function (candidate) { return candidate.shape === shape &&
            __spreadArray([candidate.model], candidate.aliases, true).some(function (alias) { return normalized(alias) === key_1; }); });
        if (row) {
            unit = row.kgPerM * density / (shape === 'aluminum' ? 2.7 : 7.85);
            var actual = d('thicknessMm');
            if (actual && row.thicknessMm && Math.abs(actual - row.thicknessMm) > 0.0001)
                unit *= actual / row.thicknessMm;
        }
        else if (item.estimateSection) {
            var t = d('thicknessMm'), width = d('widthMm');
            if (shape === 'aluminum')
                unit = d('areaMm2') * density / 1000;
            else if (shape === 'angle') {
                var side = width || number(model.split('*')[0], '边宽');
                unit = Math.max(0, t * (2 * side - t) * density / 1000);
            }
            else {
                var flange = d('flangeThicknessMm') || t, web = d('webThicknessMm') || t;
                var lip = shape === 'cpurlin' ? d('lipMm') : 0;
                unit = Math.max(0, (2 * width * flange + Math.max(0, d('heightMm') - 2 * flange) * web + 2 * lip * t) * density / 1000);
            }
        }
        else
            fail('型号未收录，请先选择已收录规格或估算');
    }
    var weight = unit * quantity;
    var amountFen = Math.round(weight / 1000 * config.prices[material.id] * factor * 100) + fee;
    if (!Number.isFinite(weight) || weight <= 0 || weight > 1e9 ||
        !Number.isSafeInteger(amountFen) || amountFen > 2147483647)
        fail('报价结果超出范围');
    return __assign(__assign({ materialId: material.id, category: material.category, spec: spec, density: density, tonPriceFen: config.prices[material.id] * 100, quoteFactor: factor, processingFeeFen: fee, weightKg: rounded(weight, 6), amountFen: amountFen }, (item.sectionShape ? { sectionShape: shape } : {})), (item.estimateSection ? { estimateSection: true } : {}));
}
