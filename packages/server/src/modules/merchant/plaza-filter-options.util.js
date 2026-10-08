"use strict";
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
exports.internalTestMerchantIds = internalTestMerchantIds;
exports.excludedPlazaMerchantIds = excludedPlazaMerchantIds;
exports.filterOptionValues = filterOptionValues;
function internalTestMerchantIds(value) {
    var candidate = value;
    var raw = Array.isArray(value)
        ? value
        : Array.isArray(candidate === null || candidate === void 0 ? void 0 : candidate.merchantIds)
            ? candidate.merchantIds
            : Array.isArray(candidate === null || candidate === void 0 ? void 0 : candidate.ids)
                ? candidate.ids
                : [];
    return raw.filter(function (id) { return typeof id === 'string' && id.length > 0; });
}
function excludedPlazaMerchantIds(currentMerchantId, internalIds) {
    return Array.from(new Set(__spreadArray([currentMerchantId], internalIds, true).filter(Boolean)));
}
function filterOptionValues(values) {
    return Array.from(new Set(values.filter(Boolean)))
        .sort(function (a, b) { return a.localeCompare(b, 'zh-CN'); })
        .map(function (value) { return ({ value: value, label: value }); });
}
