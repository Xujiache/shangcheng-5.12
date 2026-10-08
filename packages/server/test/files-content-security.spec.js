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
// nanoid@5 为 ESM；服务端 Jest 运行在 CJS 测试配置中，因此提供等价的稳定桩。
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function () { return function () { return 'a'.repeat(16); }; },
}); });
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var files_service_1 = require("../src/modules/files/files.service");
(0, globals_1.describe)('FilesService 内容安全上传闸门', function () {
    (0, globals_1.it)('量窗助手轮播图上传使用 ledger 凭据', function () { return __awaiter(void 0, void 0, void 0, function () {
        var putObject, create, contentSecurity, service, file;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    putObject = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, undefined];
                    }); }); });
                    create = globals_1.jest.fn(function () { return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                        return [2 /*return*/, ({ id: 'uploaded-1' })];
                    }); }); });
                    contentSecurity = { assertImageSafe: globals_1.jest.fn(function () {
                            var _args = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                _args[_i] = arguments[_i];
                            }
                            return __awaiter(void 0, void 0, void 0, function () { return __generator(this, function (_a) {
                                return [2 /*return*/, undefined];
                            }); });
                        }) };
                    service = new files_service_1.FilesService({ uploadedFile: { create: create } }, contentSecurity);
                    service.client = { putObject: putObject };
                    file = {
                        buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
                        originalname: 'banner.png',
                        mimetype: 'image/png',
                        size: 8,
                    };
                    return [4 /*yield*/, service.upload(file, 'ledger-ad', 'admin-1')];
                case 1:
                    _a.sent();
                    return [4 /*yield*/, service.batchUpload([file], 'ledger-ad', 'admin-1')];
                case 2:
                    _a.sent();
                    (0, globals_1.expect)(contentSecurity.assertImageSafe).toHaveBeenCalledTimes(2);
                    (0, globals_1.expect)(contentSecurity.assertImageSafe).toHaveBeenCalledWith(file.buffer, globals_1.expect.objectContaining({ scope: 'ledger', scene: 2 }));
                    (0, globals_1.expect)(putObject).toHaveBeenCalledTimes(2);
                    (0, globals_1.expect)(create).toHaveBeenCalledTimes(2);
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('头像检测不通过时，不写入对象存储或 UploadedFile', function () { return __awaiter(void 0, void 0, void 0, function () {
        var putObject, create, contentSecurity, service;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    putObject = globals_1.jest.fn();
                    create = globals_1.jest.fn();
                    contentSecurity = {
                        assertImageSafe: globals_1.jest.fn(function () {
                            var _args = [];
                            for (var _i = 0; _i < arguments.length; _i++) {
                                _args[_i] = arguments[_i];
                            }
                            return __awaiter(void 0, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    throw new biz_exception_1.BizException(1000, '内容未通过安全检测，请修改后重试');
                                });
                            });
                        }),
                    };
                    service = new files_service_1.FilesService({ uploadedFile: { create: create } }, contentSecurity);
                    service.client = { putObject: putObject };
                    return [4 /*yield*/, (0, globals_1.expect)(service.upload({
                            buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
                            originalname: 'avatar.png',
                            mimetype: 'image/png',
                            size: 4,
                        }, 'avatar', 'user-1')).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _a.sent();
                    (0, globals_1.expect)(contentSecurity.assertImageSafe).toHaveBeenCalledWith(globals_1.expect.any(Buffer), globals_1.expect.objectContaining({ scope: 'mall', scene: 1, filename: 'avatar.png' }));
                    (0, globals_1.expect)(putObject).not.toHaveBeenCalled();
                    (0, globals_1.expect)(create).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
});
