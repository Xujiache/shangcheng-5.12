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
require("reflect-metadata");
var client_1 = require("@prisma/client");
var workbook_service_1 = require("../src/modules/ledger/workbook/workbook.service");
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var apply, all, arg, userId, db, svc, checked, created, cursor, users, _i, users_1, u;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    if (!process.env.DATABASE_URL)
                        throw Error('DATABASE_URL is required; no implicit production environment is loaded');
                    apply = process.argv.includes('--apply');
                    all = process.argv.includes('--all');
                    arg = process.argv.find(function (x) { return x.startsWith('--user='); });
                    userId = arg === null || arg === void 0 ? void 0 : arg.slice(7);
                    if (apply && !all && !userId)
                        throw Error('Apply requires --all or --user=<ledger-user-id>');
                    db = new client_1.PrismaClient();
                    svc = new workbook_service_1.WorkbookService(db);
                    checked = 0, created = 0;
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, , 10, 12]);
                    cursor = void 0;
                    _a.label = 2;
                case 2: return [4 /*yield*/, db.ledgerUser.findMany(__assign(__assign({ where: userId ? { id: userId } : {}, orderBy: { id: 'asc' }, take: 100 }, (cursor ? { cursor: { id: cursor }, skip: 1 } : {})), { select: {
                            id: true,
                            workbook: { select: { userId: true } },
                            _count: { select: { workLogs: true } },
                        } }))];
                case 3:
                    users = _a.sent();
                    if (!users.length)
                        return [3 /*break*/, 9];
                    _i = 0, users_1 = users;
                    _a.label = 4;
                case 4:
                    if (!(_i < users_1.length)) return [3 /*break*/, 7];
                    u = users_1[_i];
                    checked++;
                    if (!!u.workbook) return [3 /*break*/, 6];
                    created++;
                    if (!apply) return [3 /*break*/, 6];
                    return [4 /*yield*/, svc.snapshot(u.id)];
                case 5:
                    _a.sent();
                    _a.label = 6;
                case 6:
                    _i++;
                    return [3 /*break*/, 4];
                case 7:
                    cursor = users[users.length - 1].id;
                    if (userId)
                        return [3 /*break*/, 9];
                    _a.label = 8;
                case 8: return [3 /*break*/, 2];
                case 9:
                    console.log(JSON.stringify({
                        mode: apply ? 'apply' : 'dry-run',
                        checked: checked,
                        accountsRequiringBackfill: created,
                    }));
                    return [3 /*break*/, 12];
                case 10: return [4 /*yield*/, db.$disconnect()];
                case 11:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 12: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (e) {
    console.error(e.message);
    process.exitCode = 1;
});
