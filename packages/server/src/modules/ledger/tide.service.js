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
exports.TideService = void 0;
var common_1 = require("@nestjs/common");
/** QWeather GeoAPI is queried live; its station list must not be copied into a local index. */
var TideService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var TideService = _classThis = /** @class */ (function () {
        function TideService_1() {
        }
        Object.defineProperty(TideService_1.prototype, "config", {
            get: function () {
                var host = process.env.QWEATHER_API_HOST || '';
                var key = process.env.QWEATHER_API_KEY || '';
                if (!/^(?:[a-z0-9-]+\.)+qweatherapi\.com$/.test(host) || !key) {
                    throw new common_1.ServiceUnavailableException('潮汐数据源尚未配置');
                }
                return { host: host, key: key };
            },
            enumerable: false,
            configurable: true
        });
        TideService_1.prototype.get = function (path_1) {
            return __awaiter(this, arguments, void 0, function (path, params) {
                var _a, host, key, url, response, _b, body, valid;
                var _c, _d;
                if (params === void 0) { params = {}; }
                return __generator(this, function (_e) {
                    switch (_e.label) {
                        case 0:
                            _a = this.config, host = _a.host, key = _a.key;
                            url = new URL("https://".concat(host).concat(path));
                            Object.entries(params).forEach(function (_a) {
                                var name = _a[0], value = _a[1];
                                return url.searchParams.set(name, value);
                            });
                            _e.label = 1;
                        case 1:
                            _e.trys.push([1, 3, , 4]);
                            return [4 /*yield*/, fetch(url, {
                                    headers: { 'X-QW-Api-Key': key, 'Accept': 'application/json' },
                                    signal: AbortSignal.timeout(8000),
                                })];
                        case 2:
                            response = _e.sent();
                            return [3 /*break*/, 4];
                        case 3:
                            _b = _e.sent();
                            throw new common_1.BadGatewayException('潮汐数据源暂时无法连接');
                        case 4: return [4 /*yield*/, response.json().catch(function () { return null; })];
                        case 5:
                            body = _e.sent();
                            if (response.status === 400 && path.startsWith('/geo/v2/poi/') &&
                                ((_d = (_c = body === null || body === void 0 ? void 0 : body.error) === null || _c === void 0 ? void 0 : _c.type) === null || _d === void 0 ? void 0 : _d.endsWith('#no-such-location')))
                                return [2 /*return*/, { code: '200', poi: [] }];
                            if (!response.ok)
                                throw new common_1.BadGatewayException("\u6F6E\u6C50\u6570\u636E\u6E90\u8BF7\u6C42\u5931\u8D25 (".concat(response.status, ")"));
                            valid = path.startsWith('/weatheralert/')
                                ? (body === null || body === void 0 ? void 0 : body.metadata) && Array.isArray(body.alerts)
                                : (body === null || body === void 0 ? void 0 : body.code) === '200';
                            if (!valid)
                                throw new common_1.BadGatewayException("\u6F6E\u6C50\u6570\u636E\u6E90\u8FD4\u56DE\u5F02\u5E38 (".concat((body === null || body === void 0 ? void 0 : body.code) || 'invalid', ")"));
                            return [2 /*return*/, body];
                    }
                });
            });
        };
        TideService_1.prototype.stations = function (body) {
            return (Array.isArray(body.poi) ? body.poi : [])
                .filter(function (poi) { return /^(中国|中国香港|中国澳门|中国台湾|香港|澳门|台湾)$/.test(poi.country) && poi.type === 'TSTA'; })
                .map(function (poi) { return ({ id: poi.id, name: poi.name, province: poi.adm1, city: poi.adm2,
                latitude: Number(poi.lat), longitude: Number(poi.lon) }); })
                .filter(function (poi) { return Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude); });
        };
        TideService_1.prototype.search = function (query) {
            return __awaiter(this, void 0, void 0, function () {
                var term, _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (typeof query !== 'string')
                                throw new common_1.BadRequestException('港口或地区名称无效');
                            term = query.trim();
                            if (!term || term.length > 40)
                                throw new common_1.BadRequestException('请输入 1 至 40 字的港口或地区名称');
                            _b = {};
                            _a = this.stations;
                            return [4 /*yield*/, this.get('/geo/v2/poi/lookup', {
                                    location: term, type: 'TSTA', number: '20', lang: 'zh',
                                })];
                        case 1: return [2 /*return*/, (_b.stations = _a.apply(this, [_c.sent()]), _b)];
                    }
                });
            });
        };
        TideService_1.prototype.nearby = function (latitude, longitude) {
            return __awaiter(this, void 0, void 0, function () {
                var _a;
                var _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
                                latitude < 3 || latitude > 54 || longitude < 73 || longitude > 135) {
                                throw new common_1.BadRequestException('位置不在中国范围内');
                            }
                            _b = {};
                            _a = this.stations;
                            return [4 /*yield*/, this.get('/geo/v2/poi/range', {
                                    location: "".concat(longitude.toFixed(2), ",").concat(latitude.toFixed(2)),
                                    type: 'TSTA', radius: '50', number: '20', lang: 'zh',
                                })];
                        case 1: return [2 /*return*/, (_b.stations = _a.apply(this, [_c.sent()]), _b)];
                    }
                });
            });
        };
        TideService_1.prototype.forecast = function (stationId, date) {
            return __awaiter(this, void 0, void 0, function () {
                var day, today, start, stationResult, station, body, parse, lunarParts, month, lunarDay, lunarName;
                var _a, _b;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            if (typeof stationId !== 'string' || typeof date !== 'string')
                                throw new common_1.BadRequestException('潮位站或日期无效');
                            if (!/^P[A-Za-z0-9]{3,20}$/.test(stationId))
                                throw new common_1.BadRequestException('潮位站编号无效');
                            if (!/^\d{8}$/.test(date))
                                throw new common_1.BadRequestException('日期格式无效');
                            day = new Date("".concat(date.slice(0, 4), "-").concat(date.slice(4, 6), "-").concat(date.slice(6, 8), "T00:00:00+08:00"));
                            today = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '');
                            start = new Date("".concat(today.slice(0, 4), "-").concat(today.slice(4, 6), "-").concat(today.slice(6, 8), "T00:00:00+08:00"));
                            if (!Number.isFinite(day.getTime()) || new Date(day.getTime() + 8 * 3600000).toISOString().slice(0, 10).replace(/-/g, '') !== date ||
                                day < start || day.getTime() >= start.getTime() + 10 * 86400000) {
                                throw new common_1.BadRequestException('只能查询今天起 10 天内的潮汐');
                            }
                            return [4 /*yield*/, this.search(stationId)];
                        case 1:
                            stationResult = _c.sent();
                            station = stationResult.stations.find(function (item) { return item.id === stationId; });
                            if (!station)
                                throw new common_1.BadRequestException('未找到中国潮位站');
                            return [4 /*yield*/, this.get('/v7/ocean/tide', { location: stationId, date: date })];
                        case 2:
                            body = _c.sent();
                            parse = function (point) { return (__assign({ time: point.fxTime, height: Number(point.height) }, (point.type ? { type: point.type } : {}))); };
                            lunarParts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
                                month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai',
                            }).formatToParts(day);
                            month = ((_a = lunarParts.find(function (part) { return part.type === 'month'; })) === null || _a === void 0 ? void 0 : _a.value) || '';
                            lunarDay = Number((_b = lunarParts.find(function (part) { return part.type === 'day'; })) === null || _b === void 0 ? void 0 : _b.value);
                            lunarName = lunarDay <= 10 ? "\u521D".concat('一二三四五六七八九十'[lunarDay - 1])
                                : lunarDay < 20 ? "\u5341".concat('一二三四五六七八九'[lunarDay - 11])
                                    : lunarDay === 20 ? '二十' : lunarDay < 30 ? "\u5EFF".concat('一二三四五六七八九'[lunarDay - 21]) : '三十';
                            return [2 /*return*/, {
                                    station: station,
                                    date: date,
                                    lunar: month && lunarDay ? "".concat(month).concat(lunarName) : '', updatedAt: body.updateTime,
                                    events: (body.tideTable || []).map(parse).filter(function (point) { return Number.isFinite(point.height); }),
                                    hourly: (body.tideHourly || []).map(parse).filter(function (point) { return Number.isFinite(point.height); }),
                                    attribution: '潮汐数据：和风天气 QWeather',
                                    sourceUrl: body.fxLink || 'https://www.qweather.com',
                                }];
                    }
                });
            });
        };
        TideService_1.prototype.alerts = function (latitude, longitude) {
            return __awaiter(this, void 0, void 0, function () {
                var body;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
                                latitude < 3 || latitude > 54 || longitude < 73 || longitude > 135) {
                                throw new common_1.BadRequestException('位置不在中国范围内');
                            }
                            return [4 /*yield*/, this.get("/weatheralert/v1/current/".concat(latitude, "/").concat(longitude), { lang: 'zh' })];
                        case 1:
                            body = _a.sent();
                            return [2 /*return*/, { alerts: (Array.isArray(body.alerts) ? body.alerts : []).map(function (alert) { return ({
                                        id: alert.id, title: alert.headline, severity: alert.severity,
                                        source: alert.senderName, issuedAt: alert.issuedTime, expiresAt: alert.expireTime,
                                        description: alert.description,
                                    }); }), attributions: Array.isArray(body.metadata.attributions) ? body.metadata.attributions : [] }];
                    }
                });
            });
        };
        return TideService_1;
    }());
    __setFunctionName(_classThis, "TideService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        TideService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return TideService = _classThis;
}();
exports.TideService = TideService;
