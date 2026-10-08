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
var globals_1 = require("@jest/globals");
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'a'.repeat(16); }; } }); });
var sharp_1 = require("sharp");
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var ledger_service_1 = require("../src/modules/ledger/ledger.service");
function sampleJpeg() {
    return __awaiter(this, void 0, void 0, function () {
        return __generator(this, function (_a) {
            return [2 /*return*/, (0, sharp_1.default)({ create: { width: 32, height: 20, channels: 3, background: '#4aa88d' } })
                    .jpeg()
                    .toBuffer()];
        });
    });
}
function setup(update) {
    var _this = this;
    if (update === void 0) { update = globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
        return [2 /*return*/, undefined];
    }); }); }); }
    var user = { id: 'user-1', nickname: '店主', avatar: 'teal', membership: null };
    var prisma = {
        ledgerUser: {
            findUnique: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/, user];
            }); }); }),
            update: update,
        },
    };
    var files = {
        upload: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ id: 'avatar-record-1234567890' })];
        }); }); }),
        removeLedgerAvatar: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, ({ ok: true })];
        }); }); }),
    };
    var service = new ledger_service_1.LedgerService(prisma, { assertTextSafe: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
            return [2 /*return*/, undefined];
        }); }); }) }, files);
    return { service: service, prisma: prisma, files: files };
}
(0, globals_1.describe)('LedgerService avatar replacement', function () {
    (0, globals_1.it)('rejects MIME and magic mismatch before content or storage work', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, files;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = setup(), service = _a.service, files = _a.files;
                    return [4 /*yield*/, (0, globals_1.expect)(service.updateProfileWithAvatar('user-1', { buffer: Buffer.from('not-image'), mimetype: 'image/jpeg', size: 9 }, '店主')).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(files.upload).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('stores a normalized 512 square JPEG and returns the server profile', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, files, input, uploaded, metadata;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = setup(), service = _a.service, files = _a.files;
                    return [4 /*yield*/, sampleJpeg()];
                case 1:
                    input = _b.sent();
                    return [4 /*yield*/, service.updateProfileWithAvatar('user-1', { buffer: input, mimetype: 'image/jpeg', size: input.length }, '新店主')];
                case 2:
                    _b.sent();
                    uploaded = files.upload.mock.calls[0][0];
                    return [4 /*yield*/, (0, sharp_1.default)(uploaded.buffer).metadata()];
                case 3:
                    metadata = _b.sent();
                    (0, globals_1.expect)(uploaded.mimetype).toBe('image/jpeg');
                    (0, globals_1.expect)(metadata.width).toBe(512);
                    (0, globals_1.expect)(metadata.height).toBe(512);
                    (0, globals_1.expect)(files.upload).toHaveBeenCalledWith(globals_1.expect.objectContaining({ originalname: 'avatar.jpg', mimetype: 'image/jpeg' }), 'avatar', 'user-1', 'ledger');
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('rolls back the new object when the profile write fails', function () { return __awaiter(void 0, void 0, void 0, function () {
        var update, _a, service, files, input;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    update = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            throw new Error('db down');
                        });
                    }); });
                    _a = setup(update), service = _a.service, files = _a.files;
                    return [4 /*yield*/, sampleJpeg()];
                case 1:
                    input = _b.sent();
                    return [4 /*yield*/, (0, globals_1.expect)(service.updateProfileWithAvatar('user-1', { buffer: input, mimetype: 'image/jpeg', size: input.length })).rejects.toThrow('db down')];
                case 2:
                    _b.sent();
                    (0, globals_1.expect)(files.removeLedgerAvatar).toHaveBeenCalledWith('avatar-record-1234567890', 'user-1');
                    return [2 /*return*/];
            }
        });
    }); });
});
