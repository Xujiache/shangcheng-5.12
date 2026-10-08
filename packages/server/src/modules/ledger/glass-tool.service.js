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
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GlassToolService = void 0;
var common_1 = require("@nestjs/common");
var node_child_process_1 = require("node:child_process");
var node_path_1 = require("node:path");
var SCRIPT = (0, node_path_1.join)(__dirname, 'glass-engine.py');
var inRange = function (value, min, max) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
};
function normalize(input) {
    var isLayered = input.panes !== undefined || input.gaps !== undefined;
    var legacyFields = ['type', 'outerMm', 'innerMm', 'gapMm', 'gas', 'coating', 'emissivity', 'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm'];
    if (isLayered && legacyFields.some(function (field) { return input[field] !== undefined; }))
        throw new common_1.BadRequestException('逐层参数与旧版双层参数不能混用');
    if (!isLayered && !['none', 'surface2', 'surface3'].includes(input.coating || ''))
        throw new common_1.BadRequestException('请选择镀膜位置');
    if (!isLayered && input.coating !== 'none' && !inRange(input.emissivity, 0.01, 0.84))
        throw new common_1.BadRequestException('镀膜表面发射率须为 0.01–0.84');
    var panes = isLayered ? input.panes : [
        { thicknessMm: input.outerMm, frontEmissivity: 0.84, backEmissivity: input.coating === 'surface2' ? input.emissivity : 0.84 },
        { thicknessMm: input.innerMm, frontEmissivity: input.coating === 'surface3' ? input.emissivity : 0.84, backEmissivity: 0.84 },
    ];
    var gaps = isLayered ? input.gaps : [{
            type: input.type, thicknessMm: input.gapMm, gas: input.gas,
            vacuumPressurePa: input.vacuumPressurePa, pillarDiameterMm: input.pillarDiameterMm, pillarPitchMm: input.pillarPitchMm,
        }];
    if (!Array.isArray(panes) || panes.length < 2 || panes.length > 20 || !Array.isArray(gaps) || gaps.length !== panes.length - 1) {
        throw new common_1.BadRequestException('支持 2–20 片玻璃，腔体数必须比玻璃片数少 1');
    }
    var normalizedPanes = panes.map(function (pane, index) {
        if (!pane || !inRange(pane.thicknessMm, 2, 25))
            throw new common_1.BadRequestException("\u7B2C ".concat(index + 1, " \u7247\u73BB\u7483\u539A\u5EA6\u987B\u4E3A 2\u201325 mm"));
        var frontEmissivity = pane.frontEmissivity === undefined ? 0.84 : pane.frontEmissivity;
        var backEmissivity = pane.backEmissivity === undefined ? 0.84 : pane.backEmissivity;
        if (!inRange(frontEmissivity, 0.01, 0.84) || !inRange(backEmissivity, 0.01, 0.84))
            throw new common_1.BadRequestException("\u7B2C ".concat(index + 1, " \u7247\u8868\u9762\u53D1\u5C04\u7387\u987B\u4E3A 0.01\u20130.84"));
        return { thicknessMm: pane.thicknessMm, frontEmissivity: frontEmissivity, backEmissivity: backEmissivity };
    });
    var normalizedGaps = gaps.map(function (gap, index) {
        if (!gap || !['hollow', 'vacuum'].includes(gap.type || ''))
            throw new common_1.BadRequestException("\u8BF7\u9009\u62E9\u7B2C ".concat(index + 1, " \u8154\u7C7B\u578B"));
        if (gap.type === 'hollow') {
            if (!inRange(gap.thicknessMm, 4, 30) || !['air', 'argon'].includes(gap.gas || ''))
                throw new common_1.BadRequestException("\u7B2C ".concat(index + 1, " \u4E2D\u7A7A\u8154\u987B\u4E3A 4\u201330 mm\uFF0C\u5E76\u9009\u62E9\u586B\u5145\u6C14\u4F53"));
            return { type: 'hollow', thicknessMm: gap.thicknessMm, gas: gap.gas };
        }
        if (!inRange(gap.thicknessMm, 0.1, 1) || !inRange(gap.vacuumPressurePa, 0.001, 100) || !inRange(gap.pillarDiameterMm, 0.1, 1) || !inRange(gap.pillarPitchMm, 10, 50)) {
            throw new common_1.BadRequestException("\u7B2C ".concat(index + 1, " \u771F\u7A7A\u8154\u53C2\u6570\u4E0D\u5B8C\u6574\u6216\u8D85\u51FA\u8303\u56F4"));
        }
        if (gap.pillarDiameterMm >= gap.pillarPitchMm)
            throw new common_1.BadRequestException('支撑柱直径必须小于间距');
        return { type: 'vacuum', thicknessMm: gap.thicknessMm, vacuumPressurePa: gap.vacuumPressurePa, pillarDiameterMm: gap.pillarDiameterMm, pillarPitchMm: gap.pillarPitchMm };
    });
    var outsideH = input.outsideH === undefined ? 25 : input.outsideH;
    var insideH = input.insideH === undefined ? 7.7 : input.insideH;
    if (!inRange(outsideH, 5, 50) || !inRange(insideH, 2, 20))
        throw new common_1.BadRequestException('室外系数须为 5–50，室内系数须为 2–20 W/(m²·K)');
    return { panes: normalizedPanes, gaps: normalizedGaps, outsideH: outsideH, insideH: insideH };
}
var GlassToolService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var GlassToolService = _classThis = /** @class */ (function () {
        function GlassToolService_1() {
        }
        GlassToolService_1.prototype.estimate = function (input) {
            return __awaiter(this, void 0, void 0, function () {
                var normalized, hasVacuum, result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            normalized = normalize(input);
                            hasVacuum = normalized.gaps.some(function (gap) { return gap.type === 'vacuum'; });
                            return [4 /*yield*/, new Promise(function (resolve, reject) {
                                    var child = (0, node_child_process_1.spawn)(process.env.LEDGER_GLASS_PYTHON || 'python3', [SCRIPT], {
                                        stdio: ['pipe', 'pipe', 'pipe'],
                                        env: __assign(__assign({}, process.env), { PYTHONUNBUFFERED: '1' }),
                                    });
                                    var stdout = '';
                                    var stderr = '';
                                    var timer = setTimeout(function () { return child.kill('SIGKILL'); }, 15000);
                                    child.stdin.on('error', function () { });
                                    child.stdout.on('data', function (chunk) { stdout += chunk.toString(); if (stdout.length > 4096)
                                        child.kill('SIGKILL'); });
                                    child.stderr.on('data', function (chunk) { stderr += chunk.toString(); if (stderr.length > 4096)
                                        child.kill('SIGKILL'); });
                                    child.on('error', reject);
                                    child.on('close', function (code) {
                                        clearTimeout(timer);
                                        if (code !== 0)
                                            return reject(new Error(stderr || 'glass engine failed'));
                                        try {
                                            resolve(JSON.parse(stdout));
                                        }
                                        catch (_a) {
                                            reject(new Error('glass engine returned invalid output'));
                                        }
                                    });
                                    child.stdin.end(JSON.stringify(normalized));
                                }).catch(function () { throw new common_1.ServiceUnavailableException('玻璃计算引擎暂不可用，请稍后重试'); })];
                        case 1:
                            result = _a.sent();
                            if (!Number.isFinite(result.uValue) || result.uValue <= 0 || result.uValue > 20) {
                                throw new common_1.ServiceUnavailableException('玻璃计算引擎返回无效结果');
                            }
                            return [2 /*return*/, {
                                    uValue: result.uValue,
                                    unit: 'W/(m²·K)',
                                    region: 'center-of-glazing',
                                    model: hasVacuum ? 'pyWinCalc 3.6.2 · 真空支撑柱模型' : 'pyWinCalc 3.6.2 · ISO 15099',
                                    modelVersion: 'pywincalc-3.6.2',
                                    conditions: {
                                        outsideAirC: 0,
                                        insideAirC: 20,
                                        outsideH: normalized.outsideH,
                                        insideH: normalized.insideH,
                                        solarIrradiance: 0,
                                        tiltDegrees: 90,
                                        glassConductivity: 1,
                                        glassOpticalData: 'generic clear glass; U calculation uses thermal/IR data',
                                        pillarConductivity: hasVacuum ? 20 : undefined,
                                        pillarGrid: hasVacuum ? 'square' : undefined,
                                    },
                                    input: __assign(__assign({}, input), normalized),
                                }];
                    }
                });
            });
        };
        GlassToolService_1.prototype.weight = function (input) {
            if (!inRange(input.heightMm, 0.001, 100000) || !inRange(input.widthMm, 0.001, 100000))
                throw new common_1.BadRequestException('请填写有效的高度和宽度，单位 mm');
            if (!Array.isArray(input.thicknessesMm) || input.thicknessesMm.length < 1 || input.thicknessesMm.length > 20 || Array.from(input.thicknessesMm).some(function (value) { return !inRange(value, 0.1, 100); }))
                throw new common_1.BadRequestException('支持 1–20 层玻璃，每层厚度须为 0.1–100 mm');
            var clean = function (value) { return Number(value.toPrecision(15)); };
            var areaM2 = clean(input.heightMm * input.widthMm / 1000000);
            var totalThicknessMm = clean(input.thicknessesMm.reduce(function (sum, value) { return sum + value; }, 0));
            var densityCoefficient = 2.5;
            return {
                weightKg: clean(areaM2 * totalThicknessMm * densityCoefficient),
                areaM2: areaM2,
                totalThicknessMm: totalThicknessMm,
                weightPerM2: clean(totalThicknessMm * densityCoefficient),
                layerWeightsKg: input.thicknessesMm.map(function (value) { return clean(areaM2 * value * densityCoefficient); }),
                densityCoefficient: densityCoefficient,
                unit: 'kg',
                input: input,
            };
        };
        return GlassToolService_1;
    }());
    __setFunctionName(_classThis, "GlassToolService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        GlassToolService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return GlassToolService = _classThis;
}();
exports.GlassToolService = GlassToolService;
