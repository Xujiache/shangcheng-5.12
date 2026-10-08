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
var promises_1 = require("node:fs/promises");
var node_path_1 = require("node:path");
var node_crypto_1 = require("node:crypto");
var jwt_1 = require("@nestjs/jwt");
var client_1 = require("@prisma/client");
function parseArgs() {
    var input = process.argv.slice(2);
    var get = function (name) {
        var at = input.indexOf("--".concat(name));
        return at >= 0 ? input[at + 1] : undefined;
    };
    return {
        phone: get('phone'),
        platform: get('platform'),
        version: get('version'),
        versionCode: Number(get('version-code')),
        apk: get('apk'),
        changelog: get('changelog') || '',
        apiBase: get('api-base') || 'http://127.0.0.1:3001',
        confirmed: input.includes('--confirm-production'),
    };
}
function loadEnvFile(file) {
    return __awaiter(this, void 0, void 0, function () {
        var content, _i, _a, raw, line, split, key, value;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0: return [4 /*yield*/, (0, promises_1.readFile)(file, 'utf8')];
                case 1:
                    content = _b.sent();
                    for (_i = 0, _a = content.split(/\r?\n/); _i < _a.length; _i++) {
                        raw = _a[_i];
                        line = raw.trim();
                        if (!line || line.startsWith('#'))
                            continue;
                        split = line.indexOf('=');
                        if (split <= 0)
                            continue;
                        key = line.slice(0, split).trim();
                        value = line.slice(split + 1).trim();
                        if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                            value = value.slice(1, -1);
                        }
                        if (!(key in process.env))
                            process.env[key] = value;
                    }
                    return [2 /*return*/];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var option, secret, prisma, user, latest, token, apkPath, bytes, form, response, body, row;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    option = parseArgs();
                    if (!option.confirmed)
                        throw new Error('生产发布必须显式传入 --confirm-production');
                    if (!/^1[3-9]\d{9}$/.test(option.phone || ''))
                        throw new Error('必须提供有效 --phone');
                    if (option.platform !== 'merchant' && option.platform !== 'platform')
                        throw new Error('--platform 仅支持 merchant/platform');
                    if (!/^\d+\.\d+\.\d+$/.test(option.version || ''))
                        throw new Error('必须提供 x.y.z 格式 --version');
                    if (!Number.isInteger(option.versionCode) || option.versionCode <= 0)
                        throw new Error('--version-code 必须为正整数');
                    if (!option.apk)
                        throw new Error('必须提供 --apk');
                    return [4 /*yield*/, loadEnvFile((0, node_path_1.resolve)(process.cwd(), '.env'))];
                case 1:
                    _a.sent();
                    secret = process.env.JWT_SECRET || '';
                    if (secret.length < 16)
                        throw new Error('JWT_SECRET 不可用，拒绝发布');
                    prisma = new client_1.PrismaClient();
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, , 9, 11]);
                    return [4 /*yield*/, prisma.user.findUnique({
                            where: { phone: option.phone },
                            select: { id: true, role: true, status: true, merchantId: true },
                        })];
                case 3:
                    user = _a.sent();
                    if (!user || user.status !== 'active')
                        throw new Error('发布账号不存在或已停用');
                    if (!['admin', 'platform', 'super-admin'].includes(user.role))
                        throw new Error('发布账号没有平台发布权限');
                    return [4 /*yield*/, prisma.appRelease.findFirst({
                            where: { platform: option.platform },
                            orderBy: { versionCode: 'desc' },
                            select: { versionCode: true },
                        })];
                case 4:
                    latest = _a.sent();
                    if (latest && option.versionCode <= latest.versionCode)
                        throw new Error("versionCode \u5FC5\u987B\u5927\u4E8E\u7EBF\u4E0A ".concat(latest.versionCode));
                    return [4 /*yield*/, new jwt_1.JwtService({ secret: secret }).signAsync({ sub: user.id, role: user.role, merchantId: user.merchantId || undefined, jti: (0, node_crypto_1.randomUUID)() }, { expiresIn: 600 })];
                case 5:
                    token = _a.sent();
                    apkPath = (0, node_path_1.resolve)(option.apk);
                    return [4 /*yield*/, (0, promises_1.readFile)(apkPath)];
                case 6:
                    bytes = _a.sent();
                    form = new FormData();
                    form.append('file', new Blob([bytes], { type: 'application/vnd.android.package-archive' }), (0, node_path_1.basename)(apkPath));
                    form.append('platform', option.platform);
                    form.append('version', option.version || '');
                    form.append('versionCode', String(option.versionCode));
                    form.append('changelog', option.changelog);
                    form.append('force', 'false');
                    return [4 /*yield*/, fetch("".concat(option.apiBase.replace(/\/$/, ''), "/api/v1/p/app-releases"), {
                            method: 'POST',
                            headers: { Authorization: "Bearer ".concat(token) },
                            body: form,
                        })];
                case 7:
                    response = _a.sent();
                    return [4 /*yield*/, response.json()];
                case 8:
                    body = (_a.sent());
                    if (!response.ok || (body === null || body === void 0 ? void 0 : body.code) !== 0 || !(body === null || body === void 0 ? void 0 : body.data))
                        throw new Error((body === null || body === void 0 ? void 0 : body.message) || "\u53D1\u5E03\u5931\u8D25\uFF08HTTP ".concat(response.status, "\uFF09"));
                    row = body.data;
                    if (row.platform !== option.platform || row.versionCode !== option.versionCode || row.size !== bytes.length) {
                        throw new Error('服务端发布记录与本地 APK 不一致');
                    }
                    console.log(JSON.stringify({
                        id: row.id,
                        platform: row.platform,
                        version: row.version,
                        versionCode: row.versionCode,
                        url: row.url,
                        size: row.size,
                        force: row.force,
                    }));
                    return [3 /*break*/, 11];
                case 9: return [4 /*yield*/, prisma.$disconnect()];
                case 10:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 11: return [2 /*return*/];
            }
        });
    });
}
main().catch(function (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
});
