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
var client_1 = require("@prisma/client");
var ledger_constants_1 = require("../src/modules/ledger/ledger.constants");
var prisma = new client_1.PrismaClient();
var apply = process.argv.includes('--apply');
var verify = process.argv.includes('--verify');
var sizeArg = process.argv.find(function (arg) { return arg.startsWith('--batch-size='); });
var batchSize = Math.min(500, Math.max(1, Number(sizeArg === null || sizeArg === void 0 ? void 0 : sizeArg.split('=')[1]) || 200));
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var cursor, scanned, changed, mismatches, rows, _i, rows_1, row, revenueAmount, costAmount, profitAmount, matches, result;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    scanned = 0;
                    changed = 0;
                    mismatches = 0;
                    _a.label = 1;
                case 1: return [4 /*yield*/, prisma.ledgerOrder.findMany({
                        where: verify
                            ? cursor
                                ? { id: { gt: cursor } }
                                : {}
                            : __assign(__assign({}, (cursor ? { id: { gt: cursor } } : {})), { OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }] }),
                        orderBy: { id: 'asc' },
                        take: batchSize,
                        select: {
                            id: true,
                            total: true,
                            costProfile: true,
                            costGlass: true,
                            costHardware: true,
                            costLabor: true,
                            costScreen: true,
                            extras: true,
                            customCosts: true,
                            revenueAmount: true,
                            costAmount: true,
                            profitAmount: true,
                        },
                    })];
                case 2:
                    rows = _a.sent();
                    if (!rows.length)
                        return [3 /*break*/, 8];
                    _i = 0, rows_1 = rows;
                    _a.label = 3;
                case 3:
                    if (!(_i < rows_1.length)) return [3 /*break*/, 6];
                    row = rows_1[_i];
                    revenueAmount = (0, ledger_constants_1.revenueOf)(row);
                    costAmount = (0, ledger_constants_1.totalCost)(row);
                    profitAmount = revenueAmount - costAmount;
                    matches = row.revenueAmount === BigInt(revenueAmount) &&
                        row.costAmount === BigInt(costAmount) &&
                        row.profitAmount === BigInt(profitAmount);
                    if (!!matches) return [3 /*break*/, 5];
                    mismatches++;
                    if (mismatches <= 10)
                        console.error("mismatch id=".concat(row.id));
                    if (!(apply && !verify)) return [3 /*break*/, 5];
                    return [4 /*yield*/, prisma.ledgerOrder.updateMany({
                            where: {
                                id: row.id,
                                OR: [{ revenueAmount: null }, { costAmount: null }, { profitAmount: null }],
                            },
                            data: {
                                revenueAmount: BigInt(revenueAmount),
                                costAmount: BigInt(costAmount),
                                profitAmount: BigInt(profitAmount),
                            },
                        })];
                case 4:
                    result = _a.sent();
                    changed += result.count;
                    _a.label = 5;
                case 5:
                    _i++;
                    return [3 /*break*/, 3];
                case 6:
                    scanned += rows.length;
                    cursor = rows[rows.length - 1].id;
                    console.log("scanned=".concat(scanned, " changed=").concat(changed, " mismatches=").concat(mismatches));
                    _a.label = 7;
                case 7:
                    if (true) return [3 /*break*/, 1];
                    _a.label = 8;
                case 8:
                    if (verify && mismatches)
                        process.exitCode = 1;
                    if (!apply && !verify)
                        console.log('dry-run only; pass --apply to backfill, then --verify to audit all rows');
                    return [2 /*return*/];
            }
        });
    });
}
main()
    .catch(function (error) {
    console.error(error);
    process.exitCode = 1;
})
    .finally(function () { return prisma.$disconnect(); });
