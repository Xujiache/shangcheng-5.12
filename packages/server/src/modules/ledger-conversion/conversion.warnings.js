"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CONVERSION_WARNINGS_OPTION_KEY = void 0;
exports.collectConversionWarnings = collectConversionWarnings;
exports.publicConversionWarnings = publicConversionWarnings;
exports.CONVERSION_WARNINGS_OPTION_KEY = '__conversionWarnings';
var MAX_WARNINGS = 12;
var MAX_MESSAGE_LENGTH = 180;
function cleanWarning(value, password) {
    if (typeof value !== 'string')
        return '';
    var message = value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim();
    if (typeof password === 'string' && password)
        message = message.split(password).join('***');
    return message.slice(0, MAX_MESSAGE_LENGTH);
}
function collectConversionWarnings(outputs, options) {
    var _a;
    var warnings = [];
    for (var _i = 0, outputs_1 = outputs; _i < outputs_1.length; _i++) {
        var output = outputs_1[_i];
        if (!Array.isArray(output.warnings))
            continue;
        for (var _b = 0, _c = output.warnings; _b < _c.length; _b++) {
            var warning = _c[_b];
            if (!warning || typeof warning !== 'object')
                continue;
            var item = warning;
            if (typeof item.code !== 'string' || !/^[A-Z][A-Z0-9_]{1,63}$/.test(item.code))
                continue;
            var message = cleanWarning((_a = item.messages) === null || _a === void 0 ? void 0 : _a.zhCN, options.password);
            if (message && !warnings.includes(message))
                warnings.push(message);
            if (warnings.length >= MAX_WARNINGS)
                return warnings;
        }
    }
    return warnings;
}
function publicConversionWarnings(options) {
    if (!options || typeof options !== 'object' || Array.isArray(options))
        return [];
    var stored = options;
    if (!Array.isArray(stored[exports.CONVERSION_WARNINGS_OPTION_KEY]))
        return [];
    return stored[exports.CONVERSION_WARNINGS_OPTION_KEY]
        .slice(0, MAX_WARNINGS)
        .map(function (item) { return cleanWarning(item, stored.password); })
        .filter(Boolean);
}
