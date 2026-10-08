"use strict";
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
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
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LedgerAiService = void 0;
var common_1 = require("@nestjs/common");
var biz_exception_1 = require("../../common/exceptions/biz.exception");
var MAX_ADOPT_BYTES = 10 * 1024 * 1024; // 10MB 上限
// SSRF 防护：拒绝环回/内网/链路本地地址（含解析后的 IP）
function isPrivateAddr(addr, family) {
    var a = (addr || '').toLowerCase();
    if (family === 6) {
        return (a === '::1' ||
            a.startsWith('fe80') ||
            a.startsWith('fc') ||
            a.startsWith('fd') ||
            a.startsWith('::ffff:'));
    }
    var p = a.split('.').map(function (x) { return Number(x); });
    if (p.length !== 4 || p.some(function (x) { return Number.isNaN(x); }))
        return true;
    var b0 = p[0], b1 = p[1];
    if (b0 === 0 || b0 === 127 || b0 === 10)
        return true;
    if (b0 === 169 && b1 === 254)
        return true;
    if (b0 === 172 && b1 >= 16 && b1 <= 31)
        return true;
    if (b0 === 192 && b1 === 168)
        return true;
    return false;
}
/**
 * 后台 AI 生图（聚鑫科技 GPT Image 2，BASE_URL=api.lk888.ai）。
 * 仅后台调用：创建任务 → 轮询状态 → 拿 result_url；并支持把结果转存到自有对象存储（永久 URL，防外链失效）。
 * 密钥放 server .env：LK_IMAGE_API_KEY / LK_IMAGE_BASE_URL（不入 git）。
 */
var LedgerAiService = function () {
    var _classDecorators = [(0, common_1.Injectable)()];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var LedgerAiService = _classThis = /** @class */ (function () {
        function LedgerAiService_1(files) {
            this.files = files;
            this.logger = new common_1.Logger('LedgerAi');
            this.base = process.env.LK_IMAGE_BASE_URL || 'https://api.lk888.ai';
            this.key = process.env.LK_IMAGE_API_KEY || '';
        }
        /** 创建生图任务。兼容两种返回：同步 data[].url 或 异步 task_id（需再轮询 status）。 */
        LedgerAiService_1.prototype.generate = function (dto) {
            return __awaiter(this, void 0, void 0, function () {
                var prompt, res, url, taskId;
                var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
                return __generator(this, function (_l) {
                    switch (_l.label) {
                        case 0:
                            if (!this.key)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, 'AI 生图未配置（缺 LK_IMAGE_API_KEY）');
                            prompt = String(dto.prompt || '').trim();
                            if (!prompt)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '请填写提示词');
                            return [4 /*yield*/, this.call('POST', '/v1/media/generate', {
                                    model: 'gpt-image-2',
                                    prompt: prompt.slice(0, 2000),
                                    params: {
                                        size: dto.size || 'auto',
                                        quality: dto.quality || 'auto',
                                        n: 1,
                                        response_format: 'url',
                                    },
                                })];
                        case 1:
                            res = _l.sent();
                            url = (_c = (_b = (_a = res === null || res === void 0 ? void 0 : res.data) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.url) !== null && _c !== void 0 ? _c : (_d = res === null || res === void 0 ? void 0 : res.data) === null || _d === void 0 ? void 0 : _d.url;
                            if (url)
                                return [2 /*return*/, { done: true, url: url, taskId: null }
                                    // lk888 异步返回：task_id 嵌在 data.task_id（数字）。兼容多种位置/命名。
                                ];
                            taskId = (_k = (_j = (_h = (_f = (_e = res === null || res === void 0 ? void 0 : res.data) === null || _e === void 0 ? void 0 : _e.task_id) !== null && _f !== void 0 ? _f : (_g = res === null || res === void 0 ? void 0 : res.data) === null || _g === void 0 ? void 0 : _g.taskId) !== null && _h !== void 0 ? _h : res === null || res === void 0 ? void 0 : res.task_id) !== null && _j !== void 0 ? _j : res === null || res === void 0 ? void 0 : res.taskId) !== null && _k !== void 0 ? _k : res === null || res === void 0 ? void 0 : res.id;
                            if (taskId)
                                return [2 /*return*/, { done: false, url: null, taskId: String(taskId) }];
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, 'AI 生图返回异常，请重试');
                    }
                });
            });
        };
        /** 轮询任务状态：is_final=true 终态；state=success 时取 result_url。 */
        LedgerAiService_1.prototype.status = function (taskId) {
            return __awaiter(this, void 0, void 0, function () {
                var id, res, state;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            id = String(taskId || '').trim();
                            if (!id)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '缺少 taskId');
                            return [4 /*yield*/, this.call('GET', "/v1/media/status?task_id=".concat(encodeURIComponent(id)))];
                        case 1:
                            res = _a.sent();
                            state = String((res === null || res === void 0 ? void 0 : res.state) || 'running');
                            return [2 /*return*/, {
                                    done: !!(res === null || res === void 0 ? void 0 : res.is_final),
                                    state: state, // pending / running / success / failed
                                    progress: String((res === null || res === void 0 ? void 0 : res.progress) || ''),
                                    url: state === 'success' ? String((res === null || res === void 0 ? void 0 : res.result_url) || '') : '',
                                    error: String((res === null || res === void 0 ? void 0 : res.error) || ''),
                                }];
                    }
                });
            });
        };
        /** 把 AI 结果图下载并转存到自有对象存储，返回永久 URL（用于广告图，避免外链过期）。 */
        LedgerAiService_1.prototype.adopt = function (url, ownerId) {
            return __awaiter(this, void 0, void 0, function () {
                var src, controller, timer, r, buf, _a, _b, mimetype, ext, file, permanent, e_1;
                return __generator(this, function (_c) {
                    switch (_c.label) {
                        case 0:
                            src = String(url || '').trim();
                            if (!/^https?:\/\//.test(src))
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.INVALID_PARAMS, '无效的图片地址');
                            controller = new AbortController();
                            timer = setTimeout(function () { return controller.abort(); }, 20000);
                            _c.label = 1;
                        case 1:
                            _c.trys.push([1, 5, 6, 7]);
                            return [4 /*yield*/, fetch(src, { signal: controller.signal })];
                        case 2:
                            r = _c.sent();
                            if (!r.ok)
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '下载 AI 图失败');
                            _b = (_a = Buffer).from;
                            return [4 /*yield*/, r.arrayBuffer()];
                        case 3:
                            buf = _b.apply(_a, [_c.sent()]);
                            mimetype = r.headers.get('content-type') || 'image/png';
                            ext = mimetype.includes('jpeg') || mimetype.includes('jpg')
                                ? 'jpg'
                                : mimetype.includes('webp')
                                    ? 'webp'
                                    : 'png';
                            file = { buffer: buf, size: buf.length, mimetype: mimetype, originalname: "ai-cover.".concat(ext) };
                            return [4 /*yield*/, this.files.upload(file, 'ledger-ad', ownerId)];
                        case 4:
                            permanent = (_c.sent()).url;
                            return [2 /*return*/, { url: permanent }];
                        case 5:
                            e_1 = _c.sent();
                            if (e_1 instanceof biz_exception_1.BizException)
                                throw e_1;
                            this.logger.warn('adopt fail: ' + ((e_1 === null || e_1 === void 0 ? void 0 : e_1.message) || e_1));
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, '转存图片失败，请重试或直接使用原图');
                        case 6:
                            clearTimeout(timer);
                            return [7 /*endfinally*/];
                        case 7: return [2 /*return*/];
                    }
                });
            });
        };
        LedgerAiService_1.prototype.call = function (method, path, body) {
            return __awaiter(this, void 0, void 0, function () {
                var controller, timer, r, text, json, e_2;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            controller = new AbortController();
                            timer = setTimeout(function () { return controller.abort(); }, 20000);
                            _a.label = 1;
                        case 1:
                            _a.trys.push([1, 4, 5, 6]);
                            return [4 /*yield*/, fetch(this.base + path, {
                                    method: method,
                                    headers: {
                                        Authorization: 'Bearer ' + this.key,
                                        'Content-Type': 'application/json',
                                    },
                                    body: body ? JSON.stringify(body) : undefined,
                                    signal: controller.signal,
                                })];
                        case 2:
                            r = _a.sent();
                            return [4 /*yield*/, r.text()];
                        case 3:
                            text = _a.sent();
                            json = {};
                            try {
                                json = text ? JSON.parse(text) : {};
                            }
                            catch (e) {
                                /* 非 JSON 响应 */
                            }
                            if (!r.ok) {
                                this.logger.warn("AI ".concat(path, " ").concat(r.status, ": ").concat(text.slice(0, 200)));
                                throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, (json === null || json === void 0 ? void 0 : json.error) || (json === null || json === void 0 ? void 0 : json.message) || "AI \u670D\u52A1\u9519\u8BEF(".concat(r.status, ")"));
                            }
                            return [2 /*return*/, json];
                        case 4:
                            e_2 = _a.sent();
                            if (e_2 instanceof biz_exception_1.BizException)
                                throw e_2;
                            this.logger.warn("AI ".concat(path, " fail: ").concat((e_2 === null || e_2 === void 0 ? void 0 : e_2.message) || e_2));
                            throw new biz_exception_1.BizException(biz_exception_1.BizCode.BUSINESS_ERROR, 'AI 服务暂不可用，请稍后重试');
                        case 5:
                            clearTimeout(timer);
                            return [7 /*endfinally*/];
                        case 6: return [2 /*return*/];
                    }
                });
            });
        };
        return LedgerAiService_1;
    }());
    __setFunctionName(_classThis, "LedgerAiService");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        LedgerAiService = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return LedgerAiService = _classThis;
}();
exports.LedgerAiService = LedgerAiService;
