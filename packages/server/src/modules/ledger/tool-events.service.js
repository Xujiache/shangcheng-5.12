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
exports.ToolEventsService = exports.TOOL_KEYS = void 0;
exports.serverEventId = serverEventId;
var common_1 = require("@nestjs/common");
var node_crypto_1 = require("node:crypto");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
exports.TOOL_KEYS = [
    'triangle', 'arc', 'cut', 'work-log', 'format',
    'rmb', 'retire', 'level', 'glass', 'glass-weight', 'luban', 'tide', 'video-parser',
];
var UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
var STATUSES = ['open', 'success', 'failure'];
function invalid() {
    throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '工具事件参数不正确');
}
function strictObject(value, keys) {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        invalid();
    var record = value;
    if (Object.keys(record).some(function (key) { return !keys.includes(key); }))
        invalid();
    return record;
}
function dateInput(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,3})?(?:Z|[+-]\d\d:\d\d)$/.test(value))
        invalid();
    var date = new Date(value);
    if (!Number.isFinite(date.getTime()) || date.getTime() > Date.now() + 5 * 60000)
        invalid();
    return date;
}
function serverEventId(tool, sourceId, status) {
    var hex = (0, node_crypto_1.createHash)('sha256').update("".concat(tool, ":").concat(sourceId, ":").concat(status)).digest('hex');
    return "".concat(hex.slice(0, 8), "-").concat(hex.slice(8, 12), "-5").concat(hex.slice(13, 16), "-a").concat(hex.slice(17, 20), "-").concat(hex.slice(20, 32));
}
var ToolEventsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var ToolEventsService = _classThis = /** @class */ (function () {
        function ToolEventsService_1(prisma) {
            this.prisma = prisma;
        }
        ToolEventsService_1.prototype.submit = function (userId, body) {
            return __awaiter(this, void 0, void 0, function () {
                var request, events, created;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            request = strictObject(body, ['events']);
                            if (!Array.isArray(request.events) || !request.events.length || request.events.length > 100)
                                invalid();
                            events = request.events.map(function (raw) {
                                var event = strictObject(raw, ['id', 'tool', 'status', 'occurredAt']);
                                if (typeof event.id !== 'string' || !UUID.test(event.id))
                                    invalid();
                                if (!exports.TOOL_KEYS.includes(event.tool) || !STATUSES.includes(event.status))
                                    invalid();
                                if (['format', 'glass', 'glass-weight'].includes(event.tool) && event.status !== 'open')
                                    invalid();
                                return {
                                    id: event.id,
                                    userId: userId,
                                    tool: event.tool,
                                    status: event.status,
                                    occurredAt: dateInput(event.occurredAt),
                                };
                            });
                            if (new Set(events.map(function (event) { return event.id; })).size !== events.length)
                                invalid();
                            return [4 /*yield*/, this.prisma.ledgerToolEvent.createMany({ data: events, skipDuplicates: true })];
                        case 1:
                            created = _a.sent();
                            return [2 /*return*/, { accepted: events.length, inserted: created.count }];
                    }
                });
            });
        };
        ToolEventsService_1.prototype.recordServerEvent = function (userId_1, tool_1, status_1, sourceId_1) {
            return __awaiter(this, arguments, void 0, function (userId, tool, status, sourceId, occurredAt) {
                var id;
                if (occurredAt === void 0) { occurredAt = new Date(); }
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = serverEventId(tool, sourceId, status);
                            return [4 /*yield*/, this.prisma.ledgerToolEvent.createMany({
                                    data: [{ id: id, userId: userId, tool: tool, status: status, occurredAt: occurredAt }],
                                    skipDuplicates: true,
                                })];
                        case 1:
                            _a.sent();
                            return [2 /*return*/];
                    }
                });
            });
        };
        ToolEventsService_1.prototype.summary = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                var now, today, d7, d30, _a, rows, todayRows, weekRows, monthRows, tools, _i, rows_1, row, item, _b, _c, _d, key, result, _e, result_1, row;
                var _this = this;
                return __generator(this, function (_f) {
                    switch (_f.label) {
                        case 0: return [4 /*yield*/, this.requireUser(userId)];
                        case 1:
                            _f.sent();
                            now = new Date();
                            today = new Date(now.getTime() + 8 * 3600000);
                            today.setUTCHours(0, 0, 0, 0);
                            today.setTime(today.getTime() - 8 * 3600000);
                            d7 = new Date(now.getTime() - 7 * 86400000);
                            d30 = new Date(now.getTime() - 30 * 86400000);
                            return [4 /*yield*/, Promise.all(__spreadArray([
                                    this.prisma.ledgerToolEvent.groupBy({ by: ['tool', 'status'], where: { userId: userId }, _count: { _all: true } })
                                ], [today, d7, d30].map(function (date) { return _this.prisma.ledgerToolEvent.groupBy({
                                    by: ['tool'], where: { userId: userId, occurredAt: { gte: date } }, _count: { _all: true },
                                }); }), true))];
                        case 2:
                            _a = _f.sent(), rows = _a[0], todayRows = _a[1], weekRows = _a[2], monthRows = _a[3];
                            tools = Object.fromEntries(exports.TOOL_KEYS.map(function (tool) { return [tool, {
                                    today: 0, last7Days: 0, last30Days: 0, all: 0,
                                    byStatus: { open: 0, success: 0, failure: 0 },
                                }]; }));
                            for (_i = 0, rows_1 = rows; _i < rows_1.length; _i++) {
                                row = rows_1[_i];
                                item = tools[row.tool];
                                if (!item || !STATUSES.includes(row.status))
                                    continue;
                                item.all += row._count._all;
                                item.byStatus[row.status] += row._count._all;
                            }
                            for (_b = 0, _c = [['today', todayRows], ['last7Days', weekRows], ['last30Days', monthRows]]; _b < _c.length; _b++) {
                                _d = _c[_b], key = _d[0], result = _d[1];
                                for (_e = 0, result_1 = result; _e < result_1.length; _e++) {
                                    row = result_1[_e];
                                    if (tools[row.tool])
                                        tools[row.tool][key] = row._count._all;
                                }
                            }
                            return [2 /*return*/, { label: '已同步使用记录', timezone: 'Asia/Shanghai', tools: tools }];
                    }
                });
            });
        };
        ToolEventsService_1.prototype.timeline = function (userId, query) {
            return __awaiter(this, void 0, void 0, function () {
                var allowed, page, pageSize, from, to, where, _a, total, items;
                return __generator(this, function (_b) {
                    switch (_b.label) {
                        case 0: return [4 /*yield*/, this.requireUser(userId)];
                        case 1:
                            _b.sent();
                            allowed = ['tool', 'status', 'from', 'to', 'page', 'pageSize'];
                            if (Object.keys(query).some(function (key) { return !allowed.includes(key); }))
                                invalid();
                            if (query.tool && !exports.TOOL_KEYS.includes(query.tool))
                                invalid();
                            if (query.status && !STATUSES.includes(query.status))
                                invalid();
                            page = query.page === undefined ? 1 : Number(query.page);
                            pageSize = query.pageSize === undefined ? 20 : Number(query.pageSize);
                            if (!Number.isInteger(page) || page < 1 || !Number.isInteger(pageSize) || pageSize < 1 || pageSize > 100)
                                invalid();
                            from = query.from === undefined ? undefined : dateInput(query.from);
                            to = query.to === undefined ? undefined : dateInput(query.to);
                            if (from && to && from > to)
                                invalid();
                            where = __assign(__assign(__assign({ userId: userId }, (query.tool ? { tool: query.tool } : {})), (query.status ? { status: query.status } : {})), (from || to ? { occurredAt: __assign(__assign({}, (from ? { gte: from } : {})), (to ? { lte: to } : {})) } : {}));
                            return [4 /*yield*/, this.prisma.$transaction([
                                    this.prisma.ledgerToolEvent.count({ where: where }),
                                    this.prisma.ledgerToolEvent.findMany({ where: where, select: {
                                            id: true, tool: true, status: true, occurredAt: true, receivedAt: true,
                                        }, orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize }),
                                ])];
                        case 2:
                            _a = _b.sent(), total = _a[0], items = _a[1];
                            return [2 /*return*/, { label: '已同步使用记录', total: total, page: page, pageSize: pageSize, items: items }];
                    }
                });
            });
        };
        ToolEventsService_1.prototype.requireUser = function (userId) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerUser.findUnique({ where: { id: userId }, select: { id: true } })];
                        case 1:
                            if (!(_a.sent())) {
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '账号不存在');
                            }
                            return [2 /*return*/];
                    }
                });
            });
        };
        return ToolEventsService_1;
    }());
    __setFunctionName(_classThis, "ToolEventsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        ToolEventsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return ToolEventsService = _classThis;
}();
exports.ToolEventsService = ToolEventsService;
