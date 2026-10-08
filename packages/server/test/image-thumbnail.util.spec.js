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
var sharp_1 = require("sharp");
var image_thumbnail_util_1 = require("../src/modules/files/image-thumbnail.util");
describe('image thumbnail paths', function () {
    var base = 'https://ewsn.top/oss';
    it('builds a stable v1 webp key', function () {
        expect((0, image_thumbnail_util_1.thumbnailKeyForObjectKey)('product/2026/08/a.png')).toBe('thumb/v1/product/2026/08/a.png.webp');
        expect((0, image_thumbnail_util_1.thumbnailUrlFor)("".concat(base, "/product/2026/08/a.png"), base)).toBe("".concat(base, "/thumb/v1/product/2026/08/a.png.webp"));
    });
    it('rejects traversal, foreign hosts and thumbnail recursion', function () {
        expect((0, image_thumbnail_util_1.thumbnailKeyForObjectKey)('../secret.png')).toBeNull();
        expect((0, image_thumbnail_util_1.thumbnailKeyForObjectKey)('thumb/v1/a.webp')).toBeNull();
        expect((0, image_thumbnail_util_1.objectKeyFromPublicUrl)('https://attacker.invalid/a.png', base)).toBeNull();
    });
    it('creates an exact 480px webp thumbnail', function () { return __awaiter(void 0, void 0, void 0, function () {
        var input, result, metadata;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, sharp_1.default)({
                        create: { width: 40, height: 80, channels: 3, background: '#ff5a36' },
                    })
                        .png()
                        .toBuffer()];
                case 1:
                    input = _a.sent();
                    return [4 /*yield*/, (0, image_thumbnail_util_1.createSquareThumbnail)(input)];
                case 2:
                    result = _a.sent();
                    return [4 /*yield*/, (0, sharp_1.default)(result).metadata()];
                case 3:
                    metadata = _a.sent();
                    expect(metadata.format).toBe('webp');
                    expect(metadata.width).toBe(480);
                    expect(metadata.height).toBe(480);
                    return [2 /*return*/];
            }
        });
    }); });
});
