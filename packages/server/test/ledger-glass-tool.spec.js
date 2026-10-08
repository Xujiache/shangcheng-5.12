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
Object.defineProperty(exports, "__esModule", { value: true });
var common_1 = require("@nestjs/common");
var class_transformer_1 = require("class-transformer");
var class_validator_1 = require("class-validator");
var glass_tool_service_1 = require("../src/modules/ledger/glass-tool.service");
var glass_estimate_dto_1 = require("../src/modules/ledger/dto/glass-estimate.dto");
var glass_weight_dto_1 = require("../src/modules/ledger/dto/glass-weight.dto");
var glass_tool_controller_1 = require("../src/modules/ledger/glass-tool.controller");
jest.mock('../src/modules/ledger/guards/ledger-jwt.guard', function () { return ({ LedgerJwtGuard: /** @class */ (function () {
        function LedgerJwtGuard() {
        }
        return LedgerJwtGuard;
    }()) }); });
var hollow = {
    type: 'hollow', outerMm: 6, innerMm: 6, gapMm: 12,
    gas: 'air', coating: 'none',
};
var layered = {
    panes: [{ thicknessMm: 4 }, { thicknessMm: 6 }, { thicknessMm: 8, frontEmissivity: 0.1 }],
    gaps: [{ type: 'hollow', thicknessMm: 12, gas: 'air' }, { type: 'hollow', thicknessMm: 16, gas: 'argon' }],
};
describe('GlassToolService', function () {
    var service = new glass_tool_service_1.GlassToolService();
    it('rejects incomplete vacuum model parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(service.estimate(__assign(__assign({}, hollow), { type: 'vacuum', gapMm: 0.2 })))
                        .rejects.toBeInstanceOf(common_1.BadRequestException)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('validates finite pane, gap, coating and vacuum parameters', function () { return __awaiter(void 0, void 0, void 0, function () {
        var invalid, fields;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    invalid = (0, class_transformer_1.plainToInstance)(glass_estimate_dto_1.GlassEstimateDto, __assign(__assign({}, hollow), { type: 'vacuum', outerMm: -1, innerMm: Infinity, gapMm: 0, coating: 'surface2', emissivity: 1, vacuumPressurePa: -1, pillarDiameterMm: 0, pillarPitchMm: 0 }));
                    return [4 /*yield*/, (0, class_validator_1.validate)(invalid)];
                case 1:
                    fields = (_a.sent()).map(function (error) { return error.property; });
                    expect(fields).toEqual(expect.arrayContaining([
                        'outerMm', 'innerMm', 'gapMm', 'emissivity',
                        'vacuumPressurePa', 'pillarDiameterMm', 'pillarPitchMm',
                    ]));
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects an unphysical pillar grid', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(service.estimate(__assign(__assign({}, hollow), { type: 'vacuum', gapMm: 0.2, vacuumPressurePa: 0.1, pillarDiameterMm: 25, pillarPitchMm: 25 }))).rejects.toBeInstanceOf(common_1.BadRequestException)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails closed when the pinned engine is unavailable', function () { return __awaiter(void 0, void 0, void 0, function () {
        var previous;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    previous = process.env.LEDGER_GLASS_PYTHON;
                    process.env.LEDGER_GLASS_PYTHON = '/no/such/python';
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 3, 4]);
                    return [4 /*yield*/, expect(service.estimate(hollow)).rejects.toBeInstanceOf(common_1.ServiceUnavailableException)];
                case 2:
                    _a.sent();
                    return [3 /*break*/, 4];
                case 3:
                    if (previous === undefined)
                        delete process.env.LEDGER_GLASS_PYTHON;
                    else
                        process.env.LEDGER_GLASS_PYTHON = previous;
                    return [7 /*endfinally*/];
                case 4: return [2 /*return*/];
            }
        });
    }); });
    it('accepts the legacy and multi-pane DTOs including distinct surface emissivities', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, _b, _c;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    _a = expect;
                    return [4 /*yield*/, (0, class_validator_1.validate)((0, class_transformer_1.plainToInstance)(glass_estimate_dto_1.GlassEstimateDto, hollow))];
                case 1:
                    _a.apply(void 0, [_d.sent()]).toEqual([]);
                    _b = expect;
                    return [4 /*yield*/, (0, class_validator_1.validate)((0, class_transformer_1.plainToInstance)(glass_estimate_dto_1.GlassEstimateDto, layered))];
                case 2:
                    _b.apply(void 0, [_d.sent()]).toEqual([]);
                    _c = expect;
                    return [4 /*yield*/, (0, class_validator_1.validate)((0, class_transformer_1.plainToInstance)(glass_estimate_dto_1.GlassEstimateDto, __assign(__assign({}, layered), { panes: [{ thicknessMm: 6, frontEmissivity: .05, backEmissivity: .15 }, { thicknessMm: 6 }, { thicknessMm: 6 }] })))];
                case 3:
                    _c.apply(void 0, [_d.sent()]).toEqual([]);
                    return [2 /*return*/];
            }
        });
    }); });
    it.each([
        { panes: [], gaps: [] },
        { panes: null, gaps: layered.gaps },
        { panes: layered.panes },
        { panes: [{ thicknessMm: 6 }, { thicknessMm: Infinity }], gaps: layered.gaps },
        { panes: [{ thicknessMm: 6, frontEmissivity: null }, { thicknessMm: 6 }], gaps: layered.gaps },
        __assign(__assign({}, layered), { gaps: [{ type: 'hollow', thicknessMm: 12 }] }),
        __assign(__assign({}, layered), { panes: Array(21).fill({ thicknessMm: 6 }) }),
        __assign(__assign({}, layered), { outsideH: null }),
    ])('rejects invalid nested parameters: %j', function (input) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = expect;
                    return [4 /*yield*/, (0, class_validator_1.validate)((0, class_transformer_1.plainToInstance)(glass_estimate_dto_1.GlassEstimateDto, input))];
                case 1:
                    _a.apply(void 0, [(_b.sent()).length]).toBeGreaterThan(0);
                    return [2 /*return*/];
            }
        });
    }); });
    it.each([
        __assign(__assign({}, layered), { gaps: [] }),
        __assign(__assign({}, layered), { panes: [{ thicknessMm: 6 }, null, { thicknessMm: 6 }] }),
        __assign(__assign({}, layered), { gaps: [{ type: 'hollow', thicknessMm: 3, gas: 'air' }, layered.gaps[1]] }),
        __assign(__assign({}, layered), { gaps: [{ type: 'vacuum', thicknessMm: .3 }, layered.gaps[1]] }),
        __assign(__assign({}, layered), { outerMm: 6 }),
    ])('rejects count mismatches, missing physical inputs and mixed API shapes: %j', function (input) { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, expect(service.estimate(input)).rejects.toBeInstanceOf(common_1.BadRequestException)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('reproduces the screenshot: 1600 × 3500 × 6 mm × 2 layers = 168 kg', function () {
        expect(service.weight({ heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] })).toMatchObject({
            weightKg: 168, areaM2: 5.6, totalThicknessMm: 12, weightPerM2: 30, densityCoefficient: 2.5, layerWeightsKg: [84, 84],
        });
    });
    it('sums unequal glass thicknesses and scales area once', function () {
        expect(service.weight({ heightMm: 1000, widthMm: 1000, thicknessesMm: [4, 6, 8] })).toMatchObject({ weightKg: 45, layerWeightsKg: [10, 15, 20] });
        expect(service.weight({ heightMm: 1600, widthMm: 3500, thicknessesMm: [19, 19] }).weightKg).toBe(532);
    });
    it('preserves small positive masses and the supported layer count', function () {
        expect(service.weight({ heightMm: 1, widthMm: 1, thicknessesMm: [.1] }).weightKg).toBeCloseTo(.00000025, 12);
        expect(service.weight({ heightMm: 1000, widthMm: 1000, thicknessesMm: Array(20).fill(6) }).weightKg).toBe(300);
    });
    it.each([
        { heightMm: 0, widthMm: 1000, thicknessesMm: [6] },
        { heightMm: Infinity, widthMm: 1000, thicknessesMm: [6] },
        { heightMm: 1000, widthMm: 1000, thicknessesMm: [] },
        { heightMm: 1000, widthMm: 1000, thicknessesMm: [null] },
        { heightMm: 1000, widthMm: 1000, thicknessesMm: [-6] },
        { heightMm: 1000, widthMm: 1000, thicknessesMm: [NaN] },
        { heightMm: 1000, widthMm: 1000, thicknessesMm: Array(21).fill(6) },
    ])('rejects invalid weight inputs in the DTO and service: %j', function (input) { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = expect;
                    return [4 /*yield*/, (0, class_validator_1.validate)((0, class_transformer_1.plainToInstance)(glass_weight_dto_1.GlassWeightDto, input))];
                case 1:
                    _a.apply(void 0, [(_b.sent()).length]).toBeGreaterThan(0);
                    expect(function () { return service.weight(input); }).toThrow(common_1.BadRequestException);
                    return [2 /*return*/];
            }
        });
    }); });
});
describe('GlassToolController accounting', function () {
    var user = { id: 'ledger-user-1' };
    it('records backend success only after calculation', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, events, controller;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = { estimate: jest.fn().mockResolvedValue({ uValue: 1.8 }) };
                    events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) };
                    controller = new glass_tool_controller_1.GlassToolController(service, events);
                    return [4 /*yield*/, expect(controller.estimate(user, hollow)).resolves.toEqual({ uValue: 1.8 })];
                case 1:
                    _a.sent();
                    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass', 'success', expect.any(String));
                    return [2 /*return*/];
            }
        });
    }); });
    it('records backend failure when the engine fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, events, controller;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = { estimate: jest.fn().mockRejectedValue(new Error('engine down')) };
                    events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) };
                    controller = new glass_tool_controller_1.GlassToolController(service, events);
                    return [4 /*yield*/, expect(controller.estimate(user, hollow)).rejects.toThrow('engine down')];
                case 1:
                    _a.sent();
                    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass', 'failure', expect.any(String));
                    return [2 /*return*/];
            }
        });
    }); });
    it('records glass weight independently without including dimensions or results', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, events, controller;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = new glass_tool_service_1.GlassToolService();
                    events = { recordServerEvent: jest.fn().mockResolvedValue(undefined) };
                    controller = new glass_tool_controller_1.GlassToolController(service, events);
                    return [4 /*yield*/, expect(controller.weight(user, { heightMm: 1600, widthMm: 3500, thicknessesMm: [6, 6] })).resolves.toMatchObject({ weightKg: 168 })];
                case 1:
                    _a.sent();
                    expect(events.recordServerEvent).toHaveBeenCalledWith(user.id, 'glass-weight', 'success', expect.any(String));
                    return [2 /*return*/];
            }
        });
    }); });
});
