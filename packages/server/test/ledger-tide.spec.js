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
var tide_service_1 = require("../src/modules/ledger/tide.service");
var station = { id: 'P2717', name: '青岛', country: '中国', adm1: '山东省', adm2: '青岛市', lat: '36.06', lon: '120.38', type: 'TSTA' };
var json = function (body, status) {
    if (status === void 0) { status = 200; }
    return new Response(JSON.stringify(body), { status: status, headers: { 'content-type': 'application/json' } });
};
describe('TideService', function () {
    var service = new tide_service_1.TideService();
    var originalFetch = global.fetch;
    var originalHost = process.env.QWEATHER_API_HOST;
    var originalKey = process.env.QWEATHER_API_KEY;
    beforeEach(function () {
        process.env.QWEATHER_API_HOST = 'test.qweatherapi.com';
        process.env.QWEATHER_API_KEY = 'test-key';
    });
    afterEach(function () { global.fetch = originalFetch; });
    afterAll(function () {
        if (originalHost === undefined)
            delete process.env.QWEATHER_API_HOST;
        else
            process.env.QWEATHER_API_HOST = originalHost;
        if (originalKey === undefined)
            delete process.env.QWEATHER_API_KEY;
        else
            process.env.QWEATHER_API_KEY = originalKey;
    });
    it('keeps only Chinese tide stations from live GeoAPI results', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    global.fetch = jest.fn().mockResolvedValue(json({ code: '200', poi: [station, __assign(__assign({}, station), { id: 'P9999', country: '日本' })] }));
                    _a = expect;
                    return [4 /*yield*/, service.search('青岛')];
                case 1:
                    _a.apply(void 0, [(_b.sent()).stations]).toEqual([{ id: 'P2717', name: '青岛', province: '山东省', city: '青岛市', latitude: 36.06, longitude: 120.38 }]);
                    expect(String(global.fetch.mock.calls[0][0])).toContain('/geo/v2/poi/lookup?');
                    return [2 /*return*/];
            }
        });
    }); });
    it('reports no nearby station for an inland location', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    global.fetch = jest.fn().mockResolvedValue(json({ error: { type: 'https://dev.qweather.com/docs/resource/error-code/#no-such-location' } }, 400));
                    _a = expect;
                    return [4 /*yield*/, service.nearby(39.9, 116.4)];
                case 1:
                    _a.apply(void 0, [_b.sent()]).toEqual({ stations: [] });
                    return [2 /*return*/];
            }
        });
    }); });
    it('returns forecast events, hourly points and source metadata', function () { return __awaiter(void 0, void 0, void 0, function () {
        var date, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch = jest.fn().mockImplementation(function (url) { return Promise.resolve(String(url).includes('/geo/') ? json({ code: '200', poi: [station] }) : json({ code: '200', updateTime: '2026-09-30T02:00+08:00',
                        tideTable: [{ fxTime: '2026-09-30T05:00+08:00', height: '3.5', type: 'H' }],
                        tideHourly: [{ fxTime: '2026-09-30T05:00+08:00', height: '3.5' }] })); });
                    date = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
                    return [4 /*yield*/, service.forecast('P2717', date)];
                case 1:
                    result = _a.sent();
                    expect(result.events).toEqual([{ time: '2026-09-30T05:00+08:00', height: 3.5, type: 'H' }]);
                    expect(result.hourly).toHaveLength(1);
                    expect(result.station.id).toBe('P2717');
                    expect(result.attribution).toContain('QWeather');
                    return [2 /*return*/];
            }
        });
    }); });
    it('rejects invalid dates before calling the provider', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch = jest.fn();
                    return [4 /*yield*/, expect(service.forecast('P2717', '20260230')).rejects.toThrow('只能查询今天起 10 天内的潮汐')];
                case 1:
                    _a.sent();
                    expect(global.fetch).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    it('accepts the current warning API envelope', function () { return __awaiter(void 0, void 0, void 0, function () {
        var result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    global.fetch = jest.fn().mockResolvedValue(json({ metadata: { attributions: ['官方预警来源说明'] }, alerts: [] }));
                    return [4 /*yield*/, service.alerts(36.06, 120.38)];
                case 1:
                    result = _a.sent();
                    expect(result.alerts).toEqual([]);
                    expect(result.attributions).toEqual(['官方预警来源说明']);
                    return [2 /*return*/];
            }
        });
    }); });
});
