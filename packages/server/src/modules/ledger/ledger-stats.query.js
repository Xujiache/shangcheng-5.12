"use strict";
var __makeTemplateObject = (this && this.__makeTemplateObject) || function (cooked, raw) {
    if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
    return cooked;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ledgerStatsQuery = ledgerStatsQuery;
var client_1 = require("@prisma/client");
/** 日期列为 UTC timestamp(3)；显式转换边界，避免数据库 session 时区改变分桶。 */
function ledgerStatsQuery(userId, ranges) {
    if (!ranges.length)
        throw new Error('Ledger stats ranges must not be empty');
    var buckets = ranges.map(function (range, index) { return client_1.Prisma.sql(templateObject_1 || (templateObject_1 = __makeTemplateObject(["(\n    ", ",\n    (", "::timestamptz AT TIME ZONE 'UTC'),\n    (", "::timestamptz AT TIME ZONE 'UTC')\n  )"], ["(\n    ", ",\n    (", "::timestamptz AT TIME ZONE 'UTC'),\n    (", "::timestamptz AT TIME ZONE 'UTC')\n  )"])), index, range.from.toISOString(), range.until.toISOString()); });
    return client_1.Prisma.sql(templateObject_2 || (templateObject_2 = __makeTemplateObject(["\n    SELECT b.index,\n      COUNT(o.id)::text AS count,\n      COALESCE(SUM(o.total), 0)::text AS revenue,\n      COALESCE(SUM(o.\"costAmount\"), 0)::text AS cost,\n      COALESCE(SUM(o.\"profitAmount\"), 0)::text AS profit\n    FROM (VALUES ", ") AS b(index, start_at, end_at)\n    LEFT JOIN \"LedgerOrder\" o ON o.\"userId\" = ", "\n      AND o.date >= b.start_at AND o.date < b.end_at\n    GROUP BY b.index ORDER BY b.index\n  "], ["\n    SELECT b.index,\n      COUNT(o.id)::text AS count,\n      COALESCE(SUM(o.total), 0)::text AS revenue,\n      COALESCE(SUM(o.\"costAmount\"), 0)::text AS cost,\n      COALESCE(SUM(o.\"profitAmount\"), 0)::text AS profit\n    FROM (VALUES ", ") AS b(index, start_at, end_at)\n    LEFT JOIN \"LedgerOrder\" o ON o.\"userId\" = ", "\n      AND o.date >= b.start_at AND o.date < b.end_at\n    GROUP BY b.index ORDER BY b.index\n  "])), client_1.Prisma.join(buckets), userId);
}
var templateObject_1, templateObject_2;
