"use strict";
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
var health_service_1 = require("../src/health.service");
var health_controller_1 = require("../src/health.controller");
describe('health contracts', function () {
    var original = { redis: process.env.REDIS_URL, mode: process.env.NODE_ENV };
    afterEach(function () {
        for (var _i = 0, _a = Object.entries({
            REDIS_URL: original.redis,
            NODE_ENV: original.mode,
        }); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], value = _b[1];
            if (value === undefined)
                delete process.env[key];
            else
                process.env[key] = value;
        }
        jest.useRealTimers();
    });
    it('preserves legacy health fields and keeps live independent of readiness', function () {
        var c = new health_controller_1.HealthController({ ready: jest.fn() });
        expect(c.check()).toMatchObject({ status: 'ok', service: '@jiujiu/server' });
        expect(c.live()).toEqual({ status: 'ok' });
    });
    it('returns 503 without exposing dependency errors', function () { return __awaiter(void 0, void 0, void 0, function () {
        var c;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    c = new health_controller_1.HealthController({ ready: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, false];
                        }); }); } });
                    return [4 /*yield*/, expect(c.ready()).rejects.toMatchObject({ status: 503, message: 'Service not ready' })];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('fails production readiness when Redis is unconfigured', function () { return __awaiter(void 0, void 0, void 0, function () {
        var s, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    delete process.env.REDIS_URL;
                    process.env.NODE_ENV = 'production';
                    s = new health_service_1.HealthService({ $queryRaw: function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, [1]];
                        }); }); } });
                    _a = expect;
                    return [4 /*yield*/, s.ready()];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('accepts healthy development DB and rejects failed DB', function () { return __awaiter(void 0, void 0, void 0, function () {
        var query, s, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    delete process.env.REDIS_URL;
                    process.env.NODE_ENV = 'test';
                    query = jest.fn().mockResolvedValue([1]);
                    s = new health_service_1.HealthService({ $queryRaw: query });
                    _a = expect;
                    return [4 /*yield*/, s.ready()];
                case 1:
                    _a.apply(void 0, [_c.sent()]).toBe(true);
                    query.mockRejectedValue(new Error('private connection information'));
                    _b = expect;
                    return [4 /*yield*/, s.ready()];
                case 2:
                    _b.apply(void 0, [_c.sent()]).toBe(false);
                    return [2 /*return*/];
            }
        });
    }); });
    it('times out and shares a stalled DB probe instead of opening more queries', function () { return __awaiter(void 0, void 0, void 0, function () {
        var query, s, a, b, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    jest.useFakeTimers();
                    query = jest.fn(function () { return new Promise(function () { return undefined; }); });
                    s = new health_service_1.HealthService({ $queryRaw: query });
                    a = s.ready(), b = s.ready();
                    return [4 /*yield*/, jest.advanceTimersByTimeAsync(2500)];
                case 1:
                    _c.sent();
                    _a = expect;
                    return [4 /*yield*/, a];
                case 2:
                    _a.apply(void 0, [_c.sent()]).toBe(false);
                    _b = expect;
                    return [4 /*yield*/, b];
                case 3:
                    _b.apply(void 0, [_c.sent()]).toBe(false);
                    expect(query).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
