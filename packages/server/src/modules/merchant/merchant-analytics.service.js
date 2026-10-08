"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
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
exports.MerchantAnalyticsService = void 0;
exports.analyticsQuery = analyticsQuery;
var common_1 = require("@nestjs/common");
var client_1 = require("@prisma/client");
var analytics_range_1 = require("./analytics-range");
/** One statement gives all sections the same database snapshot, without hydrating orders. */
function analyticsQuery(merchantId, range) {
    var start = range.start.toISOString();
    var cutoff = range.asOf.toISOString();
    return client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["\n    WITH paid AS (\n      SELECT id, \"payAmount\", \"paidAt\" FROM \"Order\"\n      WHERE \"merchantId\" = ", "\n        AND \"paidAt\" >= (", "::timestamptz AT TIME ZONE 'UTC')\n        AND \"paidAt\" < (", "::timestamptz AT TIME ZONE 'UTC')\n    ), units AS (\n      SELECT i.\"productId\", i.\"productName\", i.quantity, p.\"paidAt\", i.id,\n        COALESCE(c.id, '') AS \"categoryId\", COALESCE(c.name, '\u672A\u5206\u7C7B') AS category\n      FROM \"OrderItem\" i JOIN paid p ON p.id = i.\"orderId\"\n      LEFT JOIN \"Product\" product ON product.id = i.\"productId\"\n      LEFT JOIN \"Category\" c ON c.id = product.\"categoryId\"\n    ), trend AS (\n      SELECT date_trunc(", ", \"paidAt\" + interval '8 hours') - interval '8 hours' AS bucket,\n        SUM(\"payAmount\") AS amount FROM paid GROUP BY bucket\n    ), top_products AS (\n      SELECT \"productId\", (array_agg(\"productName\" ORDER BY \"paidAt\" DESC, id DESC))[1] AS name,\n        SUM(quantity) AS quantity FROM units GROUP BY \"productId\"\n      ORDER BY quantity DESC, \"productId\" ASC\n    ), categories AS (\n      SELECT \"categoryId\", category AS name, SUM(quantity) AS quantity FROM units\n      GROUP BY \"categoryId\", category ORDER BY quantity DESC, \"categoryId\" ASC\n    )\n    SELECT\n      COALESCE(SUM(\"payAmount\"), 0)::text AS \"paidAmount\",\n      COUNT(*)::text AS \"paidOrderCount\",\n      COALESCE(ROUND(AVG(\"payAmount\"), 2), 0)::text AS \"avgOrderValue\",\n      (SELECT COALESCE(SUM(\"refundAmount\"), 0)::text FROM \"Refund\"\n        WHERE \"merchantId\" = ", " AND status = 'completed'\n          AND \"completedAt\" >= (", "::timestamptz AT TIME ZONE 'UTC')\n          AND \"completedAt\" < (", "::timestamptz AT TIME ZONE 'UTC')) AS \"refundAmount\",\n      (SELECT COALESCE(SUM(quantity), 0)::text FROM units) AS \"totalQuantity\",\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('bucketStart',\n        to_char(bucket, 'YYYY-MM-DD\"T\"HH24:MI:SS\".000Z\"'), 'amount', amount::text) ORDER BY bucket), '[]'::jsonb) FROM trend) AS trend,\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', \"productId\", 'name', name,\n        'quantity', quantity::text) ORDER BY quantity DESC, \"productId\"), '[]'::jsonb) FROM top_products) AS \"topProducts\",\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('categoryId', \"categoryId\", 'name', name,\n        'quantity', quantity::text) ORDER BY quantity DESC, \"categoryId\"), '[]'::jsonb) FROM categories) AS categories\n    FROM paid\n  "], ["\n    WITH paid AS (\n      SELECT id, \"payAmount\", \"paidAt\" FROM \"Order\"\n      WHERE \"merchantId\" = ", "\n        AND \"paidAt\" >= (", "::timestamptz AT TIME ZONE 'UTC')\n        AND \"paidAt\" < (", "::timestamptz AT TIME ZONE 'UTC')\n    ), units AS (\n      SELECT i.\"productId\", i.\"productName\", i.quantity, p.\"paidAt\", i.id,\n        COALESCE(c.id, '') AS \"categoryId\", COALESCE(c.name, '\u672A\u5206\u7C7B') AS category\n      FROM \"OrderItem\" i JOIN paid p ON p.id = i.\"orderId\"\n      LEFT JOIN \"Product\" product ON product.id = i.\"productId\"\n      LEFT JOIN \"Category\" c ON c.id = product.\"categoryId\"\n    ), trend AS (\n      SELECT date_trunc(", ", \"paidAt\" + interval '8 hours') - interval '8 hours' AS bucket,\n        SUM(\"payAmount\") AS amount FROM paid GROUP BY bucket\n    ), top_products AS (\n      SELECT \"productId\", (array_agg(\"productName\" ORDER BY \"paidAt\" DESC, id DESC))[1] AS name,\n        SUM(quantity) AS quantity FROM units GROUP BY \"productId\"\n      ORDER BY quantity DESC, \"productId\" ASC\n    ), categories AS (\n      SELECT \"categoryId\", category AS name, SUM(quantity) AS quantity FROM units\n      GROUP BY \"categoryId\", category ORDER BY quantity DESC, \"categoryId\" ASC\n    )\n    SELECT\n      COALESCE(SUM(\"payAmount\"), 0)::text AS \"paidAmount\",\n      COUNT(*)::text AS \"paidOrderCount\",\n      COALESCE(ROUND(AVG(\"payAmount\"), 2), 0)::text AS \"avgOrderValue\",\n      (SELECT COALESCE(SUM(\"refundAmount\"), 0)::text FROM \"Refund\"\n        WHERE \"merchantId\" = ", " AND status = 'completed'\n          AND \"completedAt\" >= (", "::timestamptz AT TIME ZONE 'UTC')\n          AND \"completedAt\" < (", "::timestamptz AT TIME ZONE 'UTC')) AS \"refundAmount\",\n      (SELECT COALESCE(SUM(quantity), 0)::text FROM units) AS \"totalQuantity\",\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('bucketStart',\n        to_char(bucket, 'YYYY-MM-DD\"T\"HH24:MI:SS\".000Z\"'), 'amount', amount::text) ORDER BY bucket), '[]'::jsonb) FROM trend) AS trend,\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('productId', \"productId\", 'name', name,\n        'quantity', quantity::text) ORDER BY quantity DESC, \"productId\"), '[]'::jsonb) FROM top_products) AS \"topProducts\",\n      (SELECT COALESCE(jsonb_agg(jsonb_build_object('categoryId', \"categoryId\", 'name', name,\n        'quantity', quantity::text) ORDER BY quantity DESC, \"categoryId\"), '[]'::jsonb) FROM categories) AS categories\n    FROM paid\n  "])), merchantId, start, cutoff, range.bucket, merchantId, start, cutoff);
}
function money(value) {
    var amount = new client_1.Prisma.Decimal(value).toDecimalPlaces(2);
    if (!amount.isFinite() || amount.isNegative() || amount.mul(100).gt(Number.MAX_SAFE_INTEGER)) {
        throw new Error('Invalid analytics amount');
    }
    return amount.toNumber();
}
function quantity(value) {
    var result = Number(value);
    if (!Number.isSafeInteger(result) || result < 0)
        throw new Error('Invalid analytics quantity');
    return result;
}
var MerchantAnalyticsService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var MerchantAnalyticsService = _classThis = /** @class */ (function () {
        function MerchantAnalyticsService_1(prisma) {
            this.prisma = prisma;
        }
        MerchantAnalyticsService_1.prototype.overview = function (merchantId, query) {
            return __awaiter(this, void 0, void 0, function () {
                var range, raw, points;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            range = (0, analytics_range_1.resolveAnalyticsRange)(query);
                            return [4 /*yield*/, this.prisma.$queryRaw(analyticsQuery(merchantId, range))];
                        case 1:
                            raw = (_a.sent())[0];
                            if (!raw)
                                throw new Error('Analytics result missing');
                            points = new Map(raw.trend.map(function (point) { return [point.bucketStart, money(point.amount)]; }));
                            return [2 /*return*/, {
                                    version: 1,
                                    period: range.period,
                                    startDate: range.startDate,
                                    endDate: range.endDate,
                                    timeZone: 'Asia/Shanghai',
                                    asOf: range.asOf.toISOString(),
                                    granularity: range.bucket,
                                    paidAmount: money(raw.paidAmount),
                                    paidOrderCount: quantity(raw.paidOrderCount),
                                    avgOrderValue: money(raw.avgOrderValue),
                                    refundAmount: money(raw.refundAmount),
                                    totalQuantity: quantity(raw.totalQuantity),
                                    trend: (0, analytics_range_1.analyticsBuckets)(range).map(function (bucketStart) {
                                        var _a;
                                        return ({
                                            bucketStart: bucketStart,
                                            amount: (_a = points.get(bucketStart)) !== null && _a !== void 0 ? _a : 0,
                                        });
                                    }),
                                    topProducts: raw.topProducts.map(function (row) { return (__assign(__assign({}, row), { quantity: quantity(row.quantity) })); }),
                                    categories: raw.categories.map(function (row) { return (__assign(__assign({}, row), { quantity: quantity(row.quantity) })); }),
                                }];
                    }
                });
            });
        };
        return MerchantAnalyticsService_1;
    }());
    __setFunctionName(_classThis, "MerchantAnalyticsService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MerchantAnalyticsService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MerchantAnalyticsService = _classThis;
}();
exports.MerchantAnalyticsService = MerchantAnalyticsService;
var templateObject_1;
