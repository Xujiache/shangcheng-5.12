"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.METAL_MATERIALS = void 0;
exports.normalizeMetalConfig = normalizeMetalConfig;
var metal_materials_json_1 = require("./metal-materials.json");
exports.METAL_MATERIALS = metal_materials_json_1.default;
var ids = new Set(metal_materials_json_1.default.map(function (item) { return item.id; }));
function entries(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw))
        return [];
    return Object.entries(raw).slice(0, 200).filter(function (_a) {
        var id = _a[0];
        return ids.has(id);
    });
}
function numberIn(raw, fallback, min, max, digits) {
    if (digits === void 0) { digits = 0; }
    if (raw === null || raw === undefined || raw === '')
        return fallback;
    var value = Number(raw);
    if (!Number.isFinite(value))
        return fallback;
    var factor = Math.pow(10, digits);
    return Math.round(Math.min(max, Math.max(min, value)) * factor) / factor;
}
function normalizeMetalConfig(raw) {
    var value = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    var rawPrices = new Map(entries(value.prices));
    var rawDensities = new Map(entries(value.densities));
    var rawModes = new Map(entries(value.priceMode));
    var prices = {};
    var densities = {};
    var priceMode = {};
    for (var _i = 0, materials_1 = metal_materials_json_1.default; _i < materials_1.length; _i++) {
        var material = materials_1[_i];
        prices[material.id] = numberIn(rawPrices.get(material.id), material.seedTonPriceYuan, 0, 10000000);
        densities[material.id] = numberIn(rawDensities.get(material.id), material.density, 0.01, 30, 3);
        var mode = rawModes.get(material.id);
        priceMode[material.id] = mode === 'live' || mode === 'estimate' ? mode : material.priceMode;
    }
    var defaults = value.defaults && typeof value.defaults === 'object' && !Array.isArray(value.defaults)
        ? value.defaults : {};
    var timestamp = typeof value.updatedAt === 'string' && !Number.isNaN(Date.parse(value.updatedAt))
        ? new Date(value.updatedAt).toISOString() : '';
    return {
        updatedAt: timestamp,
        prices: prices,
        densities: densities,
        priceMode: priceMode,
        defaults: {
            quoteFactor: numberIn(defaults.quoteFactor, 1, 0.01, 100, 2),
            processingFeeFen: numberIn(defaults.processingFeeFen, 0, 0, 999999900),
        },
    };
}
