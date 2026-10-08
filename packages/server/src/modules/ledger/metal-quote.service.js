"use strict";
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
exports.MetalQuoteService = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var metal_config_1 = require("./metal.config");
var metal_calc_1 = require("./metal.calc");
var fail = function (message) { throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, message); };
var rounded = function (value, digits) { return Math.round((value + Number.EPSILON) * Math.pow(10, digits)) / Math.pow(10, digits); };
var MetalQuoteService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MetalQuoteService = _classThis = /** @class */ (function () {
        function MetalQuoteService_1(prisma) {
            this.prisma = prisma;
        }
        MetalQuoteService_1.prototype.create = function (userId, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var title, customer, row, config, items, totalWeightKg, totalAmountFen;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            if (Buffer.byteLength(JSON.stringify(dto), 'utf8') > 20 * 1024)
                                fail('报价单超过 20KB');
                            title = dto.title.trim();
                            if (!title)
                                fail('请填写报价单标题');
                            if (!dto.customerId) return [3 /*break*/, 2];
                            return [4 /*yield*/, this.prisma.ledgerCustomer.findFirst({ where: { id: dto.customerId, userId: userId }, select: { id: true } })];
                        case 1:
                            customer = _a.sent();
                            if (!customer)
                                fail('客户不存在');
                            _a.label = 2;
                        case 2: return [4 /*yield*/, this.prisma.ledgerConfig.findUnique({ where: { key: 'metal' } })];
                        case 3:
                            row = _a.sent();
                            config = (0, metal_config_1.normalizeMetalConfig)(row === null || row === void 0 ? void 0 : row.value);
                            items = dto.items.map(function (item) { return (0, metal_calc_1.calculateMetalQuoteItem)(item, config); });
                            totalWeightKg = rounded(items.reduce(function (sum, item) { return sum + item.weightKg; }, 0), 6);
                            totalAmountFen = items.reduce(function (sum, item) { return sum + item.amountFen; }, 0);
                            if (totalAmountFen > 2147483647)
                                fail('报价单金额超出范围');
                            if (Buffer.byteLength(JSON.stringify(items), 'utf8') > 20 * 1024)
                                fail('报价单结果超过 20KB，请分单保存');
                            return [2 /*return*/, this.prisma.ledgerMetalQuote.create({
                                    data: { userId: userId, title: title, customerId: dto.customerId, items: items, totalWeightKg: totalWeightKg, totalAmountFen: totalAmountFen },
                                })];
                    }
                });
            });
        };
        MetalQuoteService_1.prototype.list = function (userId_1) {
            return __awaiter(this, arguments, void 0, function (userId, skip, take) {
                if (skip === void 0) { skip = 0; }
                if (take === void 0) { take = 20; }
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.prisma.ledgerMetalQuote.findMany({
                            where: { userId: userId }, orderBy: { createdAt: 'desc' },
                            skip: skip,
                            take: take,
                        })];
                });
            });
        };
        MetalQuoteService_1.prototype.remove = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var result;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerMetalQuote.deleteMany({ where: { id: id, userId: userId } })];
                        case 1:
                            result = _a.sent();
                            if (!result.count)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '报价单不存在');
                            return [2 /*return*/, { deleted: true }];
                    }
                });
            });
        };
        MetalQuoteService_1.prototype.get = function (userId, id) {
            return __awaiter(this, void 0, void 0, function () {
                var quote;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.prisma.ledgerMetalQuote.findFirst({ where: { id: id, userId: userId } })];
                        case 1:
                            quote = _a.sent();
                            if (!quote)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.NOT_FOUND, '报价单不存在');
                            return [2 /*return*/, quote];
                    }
                });
            });
        };
        return MetalQuoteService_1;
    }());
    __setFunctionName(_classThis, "MetalQuoteService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MetalQuoteService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MetalQuoteService = _classThis;
}();
exports.MetalQuoteService = MetalQuoteService;
