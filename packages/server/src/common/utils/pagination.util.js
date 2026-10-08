"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parsePage = parsePage;
exports.buildPage = buildPage;
function parsePage(q) {
    var page = Math.max(1, Number(q.page) || 1);
    var pageSize = Math.min(100, Math.max(1, Number(q.pageSize) || 20));
    return { skip: (page - 1) * pageSize, take: pageSize, page: page, pageSize: pageSize };
}
function buildPage(list, total, page, pageSize) {
    return { list: list, total: total, page: page, pageSize: pageSize, hasMore: page * pageSize < total };
}
