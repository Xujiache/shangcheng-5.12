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
var biz_exception_1 = require("../src/common/exceptions/biz.exception");
var content_security_service_1 = require("../src/modules/content-security/content-security.service");
var ENV_KEYS = [
    'NODE_ENV',
    'WX_MINIAPP_APPID',
    'WX_MINIAPP_SECRET',
    'LEDGER_WX_APPID',
    'LEDGER_WX_SECRET',
    'WX_CONTENT_SECURITY_TIMEOUT_MS',
];
var originalEnv = Object.fromEntries(ENV_KEYS.map(function (key) { return [key, process.env[key]]; }));
var originalFetch = global.fetch;
function response(payload, status) {
    if (status === void 0) { status = 200; }
    return {
        ok: status >= 200 && status < 300,
        status: status,
        json: jest.fn().mockResolvedValue(payload),
    };
}
function configureWechatCredentials() {
    process.env.NODE_ENV = 'production';
    process.env.WX_MINIAPP_APPID = 'mall-appid';
    process.env.WX_MINIAPP_SECRET = 'mall-secret';
}
afterEach(function () {
    for (var _i = 0, ENV_KEYS_1 = ENV_KEYS; _i < ENV_KEYS_1.length; _i++) {
        var key = ENV_KEYS_1[_i];
        var value = originalEnv[key];
        if (value === undefined)
            delete process.env[key];
        else
            process.env[key] = value;
    }
    global.fetch = originalFetch;
    jest.restoreAllMocks();
});
describe('ContentSecurityService', function () {
    it('在文本安全结果为 pass 后才完成请求', function () { return __awaiter(void 0, void 0, void 0, function () {
        var fetchMock;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    configureWechatCredentials();
                    fetchMock = jest
                        .fn()
                        .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
                        .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'pass', label: 100 } }));
                    global.fetch = fetchMock;
                    return [4 /*yield*/, new content_security_service_1.ContentSecurityService().assertTextSafe('正常昵称', { scope: 'mall', scene: 1 })];
                case 1:
                    _b.sent();
                    expect(fetchMock).toHaveBeenCalledTimes(2);
                    expect(String(fetchMock.mock.calls[1][0])).toContain('/wxa/msg_sec_check?access_token=mall-token');
                    expect(JSON.parse(String((_a = fetchMock.mock.calls[1][1]) === null || _a === void 0 ? void 0 : _a.body))).toMatchObject({
                        version: 2,
                        scene: 1,
                        content: '正常昵称',
                    });
                    return [2 /*return*/];
            }
        });
    }); });
    it('微信返回风险建议时拒绝写入路径', function () { return __awaiter(void 0, void 0, void 0, function () {
        var fetchMock;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    configureWechatCredentials();
                    fetchMock = jest
                        .fn()
                        .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
                        .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'risky', label: 100 } }));
                    global.fetch = fetchMock;
                    return [4 /*yield*/, expect(new content_security_service_1.ContentSecurityService().assertTextSafe('违规内容')).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('生产环境缺少凭据时 fail closed', function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    process.env.NODE_ENV = 'production';
                    delete process.env.WX_MINIAPP_APPID;
                    delete process.env.WX_MINIAPP_SECRET;
                    return [4 /*yield*/, expect(new content_security_service_1.ContentSecurityService().assertTextSafe('任何用户输入')).rejects.toBeInstanceOf(biz_exception_1.BizException)];
                case 1:
                    _a.sent();
                    return [2 /*return*/];
            }
        });
    }); });
    it('头像图片通过图片安全接口后才允许继续上传', function () { return __awaiter(void 0, void 0, void 0, function () {
        var fetchMock;
        var _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    configureWechatCredentials();
                    fetchMock = jest
                        .fn()
                        .mockResolvedValueOnce(response({ access_token: 'mall-token', expires_in: 7200 }))
                        .mockResolvedValueOnce(response({ errcode: 0, result: { suggest: 'pass', label: 100 } }));
                    global.fetch = fetchMock;
                    return [4 /*yield*/, new content_security_service_1.ContentSecurityService().assertImageSafe(Buffer.from([0x89, 0x50, 0x4e, 0x47]), {
                            scope: 'mall',
                            filename: 'avatar.png',
                            mimeType: 'image/png',
                        })];
                case 1:
                    _b.sent();
                    expect(String(fetchMock.mock.calls[1][0])).toContain('/wxa/img_sec_check?access_token=mall-token');
                    expect((_a = fetchMock.mock.calls[1][1]) === null || _a === void 0 ? void 0 : _a.body).toBeInstanceOf(FormData);
                    return [2 /*return*/];
            }
        });
    }); });
});
