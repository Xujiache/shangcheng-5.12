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
var refresh_token_blacklist_service_1 = require("../src/modules/auth/refresh-token-blacklist.service");
describe('atomic refresh receipts', function () {
    var originalRedis = process.env.REDIS_URL;
    var originalEnvironment = process.env.NODE_ENV;
    var instances = [];
    var make = function () {
        var service = new refresh_token_blacklist_service_1.RefreshTokenBlacklistService();
        instances.push(service);
        return service;
    };
    beforeEach(function () {
        delete process.env.REDIS_URL;
        process.env.NODE_ENV = 'test';
    });
    afterEach(function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, Promise.all(instances.splice(0).map(function (s) { return s.onModuleDestroy(); }))];
                case 1:
                    _a.sent();
                    if (originalRedis === undefined)
                        delete process.env.REDIS_URL;
                    else
                        process.env.REDIS_URL = originalRedis;
                    process.env.NODE_ENV = originalEnvironment;
                    jest.restoreAllMocks();
                    return [2 /*return*/];
            }
        });
    }); });
    it('uses Redis SET NX across instances and exposes only one winner', function () { return __awaiter(void 0, void 0, void 0, function () {
        var receipts, client, a, b, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    process.env.REDIS_URL = 'redis://127.0.0.1:16389/15';
                    receipts = new Set();
                    client = {
                        set: jest.fn(function (key, _value, _ex, _ttl, nx) { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                expect(nx).toBe('NX');
                                if (receipts.has(key))
                                    return [2 /*return*/, null];
                                receipts.add(key);
                                return [2 /*return*/, 'OK'];
                            });
                        }); }),
                    };
                    a = make(), b = make();
                    jest.spyOn(a, 'getRedis').mockResolvedValue(client);
                    jest.spyOn(b, 'getRedis').mockResolvedValue(client);
                    _a = expect;
                    return [4 /*yield*/, Promise.all([a.consume('same', 60), b.consume('same', 60)])];
                case 1:
                    _a.apply(void 0, [(_b.sent()).sort()]).toEqual([
                        false,
                        true,
                    ]);
                    expect(client.set).toHaveBeenCalledWith('rtbl:same', '1', 'EX', 60, 'NX');
                    return [2 /*return*/];
            }
        });
    }); });
    it('Redis failures reject rather than treating an unknown token as valid', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.REDIS_URL = 'redis://127.0.0.1:16389/15';
                    service = make();
                    jest.spyOn(service, 'getRedis').mockRejectedValue(new Error('connection failed'));
                    return [4 /*yield*/, expect(service.isRevoked('x')).rejects.toMatchObject({ status: 503 })];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, expect(service.consume('x', 60)).rejects.toMatchObject({ status: 503 })];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, expect(service.revoke('x', 60)).rejects.toMatchObject({ status: 503 })];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('never clears live receipts on capacity pressure; production cannot fall back to memory', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    service = make();
                    service.MAX_ENTRIES = 1;
                    return [4 /*yield*/, service.revoke('kept', 60)];
                case 1:
                    _b.sent();
                    return [4 /*yield*/, expect(service.revoke('new', 60)).rejects.toMatchObject({ status: 503 })];
                case 2:
                    _b.sent();
                    _a = expect;
                    return [4 /*yield*/, service.isRevoked('kept')];
                case 3:
                    _a.apply(void 0, [_b.sent()]).toBe(true);
                    process.env.NODE_ENV = 'production';
                    return [4 /*yield*/, expect(make().consume('no-shared-store', 60)).rejects.toMatchObject({ status: 503 })];
                case 4:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('clears successful connection promises so a later disconnect can reconnect', function () { return __awaiter(void 0, void 0, void 0, function () {
        var service, client;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    service = make();
                    client = {
                        status: 'end',
                        connect: jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                client.status = 'ready';
                                return [2 /*return*/];
                            });
                        }); }),
                        disconnect: jest.fn(),
                    };
                    service.redis = client;
                    return [4 /*yield*/, service.getRedis()];
                case 1:
                    _a.sent();
                    client.status = 'end';
                    return [4 /*yield*/, service.getRedis()];
                case 2:
                    _a.sent();
                    expect(client.connect).toHaveBeenCalledTimes(2);
                    return [2 /*return*/];
            }
        });
    }); });
});
