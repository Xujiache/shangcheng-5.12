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
var analytics_range_1 = require("../src/modules/merchant/analytics-range");
var merchant_analytics_service_1 = require("../src/modules/merchant/merchant-analytics.service");
var now = new Date('2026-09-09T10:23:00.000Z');
describe('isolated paid analytics', function () {
    afterEach(function () { return jest.useRealTimers(); });
    it.each([
        ['today', '2026-09-09', 'hour'],
        ['week', '2026-09-07', 'day'],
        ['month', '2026-09-01', 'day'],
        ['year', '2026-01-01', 'month'],
    ])('uses Beijing natural %s boundaries', function (period, start, bucket) {
        var r = (0, analytics_range_1.resolveAnalyticsRange)({ period: period }, now);
        expect(r.startDate).toBe(start);
        expect(r.endDate).toBe('2026-09-09');
        expect(r.bucket).toBe(bucket);
        expect(r.start.getTime()).toBe(Date.parse("".concat(start, "T00:00:00+08:00")));
    });
    it('handles Sunday, Monday, year boundary and leap-day ranges', function () {
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'week' }, new Date('2026-09-06T15:59:59Z')).startDate).toBe('2026-08-31');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'week' }, new Date('2026-09-06T16:00:00Z')).startDate).toBe('2026-09-07');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'week' }, new Date('2026-09-06T17:00:00Z')).bucket).toBe('day');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'month' }, new Date('2026-08-31T17:00:00Z')).bucket).toBe('day');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'year' }, new Date('2025-12-31T16:00:00Z')).startDate).toBe('2026-01-01');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'custom', startDate: '2024-01-01', endDate: '2024-12-31' }, now).bucket).toBe('month');
        var single = (0, analytics_range_1.resolveAnalyticsRange)({ period: 'custom', startDate: '2024-02-29', endDate: '2024-02-29' }, now);
        expect((0, analytics_range_1.analyticsBuckets)(single)).toHaveLength(24);
        expect(single.start.toISOString()).toBe('2024-02-28T16:00:00.000Z');
        expect((0, analytics_range_1.resolveAnalyticsRange)({ period: 'custom', startDate: '2019-12-31', endDate: '2020-01-01' }, now).startDate).toBe('2019-12-31');
        expect(single.end.toISOString()).toBe('2024-02-29T16:00:00.000Z');
    });
    it.each([
        { period: 'bad' },
        { period: ['week'] },
        { period: 'week', date: '2026-01-01' },
        { period: 'custom', startDate: '2026-02-30', endDate: '2026-03-01' },
        { period: 'custom', startDate: '2026-09-10', endDate: '2026-09-10' },
        { period: 'custom', startDate: '2026-09-02', endDate: '2026-09-01' },
        { period: 'custom', startDate: '2024-01-01', endDate: '2025-01-01' },
    ])('rejects invalid or ambiguous dates: %p', function (q) {
        return expect(function () { return (0, analytics_range_1.resolveAnalyticsRange)(q, now); }).toThrow();
    });
    it('produces monthly rather than twelve daily year buckets', function () {
        var buckets = (0, analytics_range_1.analyticsBuckets)((0, analytics_range_1.resolveAnalyticsRange)({ period: 'year' }, now));
        expect(buckets).toHaveLength(9);
        expect(buckets[0]).toBe('2025-12-31T16:00:00.000Z');
        expect(buckets[8]).toBe('2026-08-31T16:00:00.000Z');
    });
    it('parameterizes ownership and both payment/refund ranges without creation-time filtering', function () {
        var query = (0, merchant_analytics_service_1.analyticsQuery)("owner'--", (0, analytics_range_1.resolveAnalyticsRange)({ period: 'week' }, now));
        expect(query.text).not.toContain("owner'--");
        expect(query.values.filter(function (v) { return v === "owner'--"; })).toHaveLength(2);
        expect(query.text).toContain('"paidAt" >=');
        expect(query.text).toContain('"completedAt" >=');
        expect(query.text).toContain("status = 'completed'");
        expect(query.text).not.toContain('"createdAt"');
        expect(query.text).not.toContain('refundAmount" FROM paid');
    });
    it('keeps cents, independent refunds and fills only elapsed trend buckets', function () { return __awaiter(void 0, void 0, void 0, function () {
        var $queryRaw, service, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    jest.useFakeTimers().setSystemTime(now);
                    $queryRaw = jest.fn().mockResolvedValue([
                        {
                            paidAmount: '10.35',
                            paidOrderCount: '2',
                            avgOrderValue: '5.18',
                            refundAmount: '99.99',
                            totalQuantity: '3',
                            trend: [{ bucketStart: '2026-09-06T16:00:00.000Z', amount: '10.35' }],
                            topProducts: [{ productId: 'p1', name: 'Product', quantity: '3' }],
                            categories: [{ categoryId: '', name: '未分类', quantity: '3' }],
                        },
                    ]);
                    service = new merchant_analytics_service_1.MerchantAnalyticsService({ $queryRaw: $queryRaw });
                    return [4 /*yield*/, service.overview('owner', { period: 'week' })];
                case 1:
                    result = _a.sent();
                    expect(result.paidAmount).toBe(10.35);
                    expect(result.avgOrderValue).toBe(5.18);
                    expect(result.refundAmount).toBe(99.99);
                    expect(result.trend).toHaveLength(3);
                    expect(result.trend.reduce(function (sum, p) { return sum + p.amount; }, 0)).toBe(result.paidAmount);
                    expect(result.categories[0].quantity).toBe(3);
                    expect($queryRaw).toHaveBeenCalledTimes(1);
                    return [2 /*return*/];
            }
        });
    }); });
});
