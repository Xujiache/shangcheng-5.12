"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.businessDate = businessDate;
exports.resolveAnalyticsRange = resolveAnalyticsRange;
exports.analyticsBuckets = analyticsBuckets;
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var DAY = 86400000;
var OFFSET = 8 * 3600000;
function businessDate(date) {
    return new Date(date.getTime() + OFFSET).toISOString().slice(0, 10);
}
function dateOnly(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '日期必须为 YYYY-MM-DD');
    }
    var result = new Date("".concat(value, "T00:00:00+08:00"));
    if (!Number.isFinite(result.getTime()) ||
        businessDate(result) !== value ||
        value < '0001-01-01') {
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '日期不合法');
    }
    return result;
}
function resolveAnalyticsRange(input, now) {
    var _a;
    if (now === void 0) { now = new Date(); }
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '无效的统计条件');
    }
    var q = input;
    var period = (_a = q.period) !== null && _a !== void 0 ? _a : 'week';
    if (!['today', 'week', 'month', 'year', 'custom'].includes(period)) {
        throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '无效的统计周期');
    }
    var today = businessDate(now);
    var midnight = dateOnly(today);
    var start = midnight;
    var endDate = today;
    if (period === 'custom') {
        start = dateOnly(q.startDate);
        var last = dateOnly(q.endDate);
        endDate = businessDate(last);
        var days_1 = (last.getTime() - start.getTime()) / DAY + 1;
        if (days_1 < 1 || days_1 > 366 || endDate > today) {
            throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请选择不超过 366 天且不晚于今天的日期范围');
        }
    }
    else {
        if (q.startDate !== undefined || q.endDate !== undefined || q.date !== undefined) {
            throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '快捷周期不能同时传入自定义日期');
        }
        if (period === 'week') {
            var weekday = new Date(midnight.getTime() + OFFSET).getUTCDay();
            start = new Date(midnight.getTime() - ((weekday + 6) % 7) * DAY);
        }
        else if (period === 'month')
            start = dateOnly("".concat(today.slice(0, 7), "-01"));
        else if (period === 'year')
            start = dateOnly("".concat(today.slice(0, 4), "-01-01"));
    }
    var end = new Date(dateOnly(endDate).getTime() + DAY);
    var days = (end.getTime() - start.getTime()) / DAY;
    var bucket = period === 'year'
        ? 'month'
        : period === 'today'
            ? 'hour'
            : period !== 'custom'
                ? 'day'
                : days === 1
                    ? 'hour'
                    : days <= 62
                        ? 'day'
                        : 'month';
    return {
        period: period,
        startDate: businessDate(start),
        endDate: endDate,
        start: start,
        end: end,
        asOf: new Date(Math.min(now.getTime(), end.getTime())),
        bucket: bucket,
    };
}
/** ISO instants are stable keys; display labels are localized only by the client. */
function analyticsBuckets(range) {
    var local = new Date(range.start.getTime() + OFFSET);
    if (range.bucket === 'month')
        local.setUTCDate(1);
    var result = [];
    var cursor = local.getTime() - OFFSET;
    var stop = Math.min(range.end.getTime(), range.asOf.getTime());
    while (cursor < stop) {
        result.push(new Date(cursor).toISOString());
        if (range.bucket === 'month') {
            local.setUTCMonth(local.getUTCMonth() + 1);
            cursor = local.getTime() - OFFSET;
        }
        else
            cursor += range.bucket === 'hour' ? 3600000 : DAY;
    }
    return result;
}
