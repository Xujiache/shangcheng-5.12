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
var globals_1 = require("@jest/globals");
var stream_1 = require("stream");
globals_1.jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'testfileid123456'; }; } }); });
var files_service_1 = require("../src/modules/files/files.service");
(0, globals_1.describe)('ledger feedback media security', function () {
    var env0 = __assign({}, process.env);
    (0, globals_1.afterEach)(function () {
        process.env = __assign({}, env0);
    });
    function service() {
        var _this = this;
        var prisma = {
            uploadedFile: {
                create: globals_1.jest.fn(function (args) { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                    return [2 /*return*/, (__assign({ id: 'file123' }, args.data))];
                }); }); }),
                findFirst: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () {
                    return __generator(this, function (_a) {
                        return [2 /*return*/, ({
                                id: 'file123',
                                key: 'feedback/test.png',
                                mimeType: 'image/png',
                                size: 8,
                            })];
                    });
                }); }),
            },
        };
        var contentSecurity = { assertImageSafe: globals_1.jest.fn(function () { return __awaiter(_this, void 0, void 0, function () { return __generator(this, function (_a) {
                return [2 /*return*/];
            }); }); }) };
        return { files: new files_service_1.FilesService(prisma, contentSecurity), prisma: prisma, contentSecurity: contentSecurity };
    }
    (0, globals_1.it)('拒绝 MIME 与魔数不一致的 ledger 图片', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, files, contentSecurity;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = service(), files = _a.files, contentSecurity = _a.contentSecurity;
                    return [4 /*yield*/, (0, globals_1.expect)(files.upload({
                            buffer: Buffer.from('not-an-image'),
                            size: 12,
                            mimetype: 'image/png',
                            originalname: 'x.png',
                        }, 'avatar', 'u1', 'ledger')).rejects.toBeTruthy()];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(contentSecurity.assertImageSafe).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('私有图链接过期即拒绝，签名有效且对象存在才读取', function () { return __awaiter(void 0, void 0, void 0, function () {
        var files, url, exp, sig, opened;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.LEDGER_MEDIA_SIGN_SECRET = 'x'.repeat(40);
                    process.env.LEDGER_MEDIA_BASE_URL = 'https://example.test/api/v1/l/feedback-media/view';
                    process.env.S3_PRIVATE_BUCKET = 'ledger-private-test';
                    files = service().files;
                    files.client = { getObject: globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                            return [2 /*return*/, stream_1.Readable.from([Buffer.from('PNG')])];
                        }); }); }) };
                    url = new URL(files.feedbackViewUrl('file123'));
                    exp = url.searchParams.get('exp');
                    sig = url.searchParams.get('sig');
                    return [4 /*yield*/, files.openPrivateFeedback('file123', exp, sig)];
                case 1:
                    opened = _a.sent();
                    (0, globals_1.expect)(opened.mimeType).toBe('image/png');
                    return [4 /*yield*/, (0, globals_1.expect)(files.openPrivateFeedback('file123', String(Number(exp) - 900), sig)).rejects.toBeTruthy()];
                case 2:
                    _a.sent();
                    return [4 /*yield*/, (0, globals_1.expect)(files.openPrivateFeedback('file123', exp, '0'.repeat(64))).rejects.toBeTruthy()];
                case 3:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('反馈引用按上传者隔离，不能提交他人私有图', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, files, prisma;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    process.env.LEDGER_MEDIA_SIGN_SECRET = 'x'.repeat(40);
                    _a = service(), files = _a.files, prisma = _a.prisma;
                    prisma.uploadedFile.findFirst.mockResolvedValueOnce(null);
                    return [4 /*yield*/, (0, globals_1.expect)(files.normalizeFeedbackImages('other-user', ['feedback-private:file123'])).rejects.toBeTruthy()];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.uploadedFile.findFirst).toHaveBeenCalledWith({
                        where: { id: 'file123', ownerId: 'other-user', bizType: 'ledger-feedback-private' },
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('通用文件删除端点不能误删私有反馈图记录', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, files, prisma, removeObject;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = service(), files = _a.files, prisma = _a.prisma;
                    removeObject = globals_1.jest.fn();
                    files.client = { removeObject: removeObject };
                    prisma.uploadedFile.findUnique = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            return [2 /*return*/, ({
                                    key: 'feedback/test.png',
                                    ownerId: 'u1',
                                    bizType: 'ledger-feedback-private',
                                })];
                        });
                    }); });
                    prisma.uploadedFile.delete = globals_1.jest.fn();
                    return [4 /*yield*/, (0, globals_1.expect)(files.remove('feedback/test.png', { userId: 'u1', role: 'user' })).rejects.toBeTruthy()];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(removeObject).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.uploadedFile.delete).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
