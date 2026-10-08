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
globals_1.jest.mock('nanoid', function () { return ({
    customAlphabet: function () { return function () { return 'RELEASETEST'; }; },
}); });
var app_release_service_1 = require("../src/modules/app-release/app-release.service");
function makeService() {
    var prisma = {
        appRelease: {
            findUnique: globals_1.jest.fn().mockResolvedValue(null),
            findFirst: globals_1.jest.fn(),
            findMany: globals_1.jest.fn(),
            create: globals_1.jest.fn(),
            delete: globals_1.jest.fn(),
        },
        uploadedFile: { findFirst: globals_1.jest.fn().mockResolvedValue(null) },
    };
    var files = {
        uploadApk: globals_1.jest.fn(),
        remove: globals_1.jest.fn(),
    };
    return { service: new app_release_service_1.AppReleaseService(prisma, files), prisma: prisma, files: files };
}
(0, globals_1.describe)('AppReleaseService HarmonyOS 发布', function () {
    (0, globals_1.it)('无 APK 时使用 HTTPS AppGallery 地址创建鸿蒙版本', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, files, result;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma, files = _a.files;
                    prisma.appRelease.create.mockImplementation(function (_a) { return __awaiter(void 0, [_a], void 0, function (_b) {
                        var data = _b.data;
                        return __generator(this, function (_c) {
                            return [2 /*return*/, (__assign({ id: 'h1' }, data))];
                        });
                    }); });
                    return [4 /*yield*/, service.create(null, {
                            platform: 'merchant-harmony',
                            version: '1.0.0',
                            versionCode: 1000000,
                            changelog: '原生鸿蒙首版',
                            force: false,
                            storeUrl: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
                        }, 'admin1')];
                case 1:
                    result = _b.sent();
                    (0, globals_1.expect)(files.uploadApk).not.toHaveBeenCalled();
                    (0, globals_1.expect)(prisma.appRelease.create).toHaveBeenCalledWith({
                        data: {
                            platform: 'merchant-harmony',
                            version: '1.0.0',
                            versionCode: 1000000,
                            url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
                            size: 0,
                            changelog: '原生鸿蒙首版',
                            force: false,
                            createdById: 'admin1',
                        },
                    });
                    (0, globals_1.expect)(result).toMatchObject({ id: 'h1', platform: 'merchant-harmony' });
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('拒绝非 HTTPS 的鸿蒙更新目标', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma, files;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma, files = _a.files;
                    return [4 /*yield*/, (0, globals_1.expect)(service.create(null, {
                            platform: 'merchant-harmony',
                            version: '1.0.0',
                            versionCode: 1000000,
                            storeUrl: 'http://unsafe.example/app',
                        })).rejects.toMatchObject({
                            response: globals_1.expect.objectContaining({ message: '鸿蒙版本必须填写 HTTPS AppGallery 地址' }),
                        })];
                case 1:
                    _b.sent();
                    (0, globals_1.expect)(prisma.appRelease.create).not.toHaveBeenCalled();
                    (0, globals_1.expect)(files.uploadApk).not.toHaveBeenCalled();
                    return [2 /*return*/];
            }
        });
    }); });
    (0, globals_1.it)('最新版接口为鸿蒙端返回 storeUrl，空记录返回 null', function () { return __awaiter(void 0, void 0, void 0, function () {
        var _a, service, prisma;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    _a = makeService(), service = _a.service, prisma = _a.prisma;
                    prisma.appRelease.findFirst.mockResolvedValueOnce({
                        version: '1.0.1',
                        versionCode: 1000001,
                        url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
                        size: 0,
                        changelog: '修复',
                        force: true,
                        publishedAt: new Date('2026-08-30T00:00:00.000Z'),
                    });
                    return [4 /*yield*/, (0, globals_1.expect)(service.latest('merchant-harmony')).resolves.toEqual({
                            version: '1.0.1',
                            versionCode: 1000001,
                            url: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
                            storeUrl: 'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant',
                            size: 0,
                            changelog: '修复',
                            force: true,
                            publishedAt: '2026-08-30T00:00:00.000Z',
                        })];
                case 1:
                    _b.sent();
                    prisma.appRelease.findFirst.mockResolvedValueOnce(null);
                    return [4 /*yield*/, (0, globals_1.expect)(service.latest('merchant-harmony')).resolves.toBeNull()];
                case 2:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    }); });
});
