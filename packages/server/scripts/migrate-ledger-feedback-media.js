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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
Object.defineProperty(exports, "__esModule", { value: true });
var client_1 = require("@prisma/client");
var minio_1 = require("minio");
var node_crypto_1 = require("node:crypto");
var prisma = new client_1.PrismaClient();
var apply = process.argv.includes('--apply');
var verify = process.argv.includes('--verify');
if (apply && !process.argv.includes('--backup-confirmed'))
    throw new Error('--apply requires --backup-confirmed');
var publicBucket = process.env.S3_BUCKET || 'jiujiu-mall';
var privateBucket = process.env.S3_PRIVATE_BUCKET || '';
var publicPrefix = (process.env.S3_PUBLIC_URL || '').replace(/\/$/, '') + '/feedback/';
if (!process.env.S3_PUBLIC_URL || !privateBucket || privateBucket === publicBucket)
    throw new Error('S3_PUBLIC_URL and distinct S3_PRIVATE_BUCKET are required');
var endpoint = new URL(process.env.S3_ENDPOINT || 'http://localhost:9000');
var client = new minio_1.Client({
    endPoint: endpoint.hostname,
    port: Number(endpoint.port) || (endpoint.protocol === 'https:' ? 443 : 80),
    useSSL: endpoint.protocol === 'https:',
    accessKey: process.env.S3_ACCESS_KEY || '',
    secretKey: process.env.S3_SECRET_KEY || '',
});
function hashObject(bucket, key) {
    return __awaiter(this, void 0, void 0, function () {
        var hash, stream, _a, stream_1, stream_1_1, chunk, e_1_1;
        var _b, e_1, _c, _d;
        return __generator(this, function (_e) {
            switch (_e.label) {
                case 0:
                    hash = (0, node_crypto_1.createHash)('sha256');
                    return [4 /*yield*/, client.getObject(bucket, key)];
                case 1:
                    stream = _e.sent();
                    _e.label = 2;
                case 2:
                    _e.trys.push([2, 7, 8, 13]);
                    _a = true, stream_1 = __asyncValues(stream);
                    _e.label = 3;
                case 3: return [4 /*yield*/, stream_1.next()];
                case 4:
                    if (!(stream_1_1 = _e.sent(), _b = stream_1_1.done, !_b)) return [3 /*break*/, 6];
                    _d = stream_1_1.value;
                    _a = false;
                    chunk = _d;
                    hash.update(chunk);
                    _e.label = 5;
                case 5:
                    _a = true;
                    return [3 /*break*/, 3];
                case 6: return [3 /*break*/, 13];
                case 7:
                    e_1_1 = _e.sent();
                    e_1 = { error: e_1_1 };
                    return [3 /*break*/, 13];
                case 8:
                    _e.trys.push([8, , 11, 12]);
                    if (!(!_a && !_b && (_c = stream_1.return))) return [3 /*break*/, 10];
                    return [4 /*yield*/, _c.call(stream_1)];
                case 9:
                    _e.sent();
                    _e.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    if (e_1) throw e_1.error;
                    return [7 /*endfinally*/];
                case 12: return [7 /*endfinally*/];
                case 13: return [2 /*return*/, hash.digest('hex')];
            }
        });
    });
}
function sameObject(sourceKey, privateKey, size) {
    return __awaiter(this, void 0, void 0, function () {
        var copied, _a, _b;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, client.statObject(privateBucket, privateKey)];
                case 1:
                    copied = _c.sent();
                    _a = copied.size === size;
                    if (!_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, hashObject(publicBucket, sourceKey)];
                case 2:
                    _b = (_c.sent());
                    return [4 /*yield*/, hashObject(privateBucket, privateKey)];
                case 3:
                    _a = _b === (_c.sent());
                    _c.label = 4;
                case 4: return [2 /*return*/, (_a)];
            }
        });
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var _a, _b, cursor, scanned, legacy, migrated, errors, feedbacks, _i, feedbacks_1, feedback, images, next, changed, _c, images_1, imageValue, image, id, file, valid, legacyId, original, _d, _e, key, oldFile, newKey, privateFile, source;
        var _f;
        return __generator(this, function (_g) {
            switch (_g.label) {
                case 0:
                    _a = apply;
                    if (!_a) return [3 /*break*/, 2];
                    return [4 /*yield*/, client.bucketExists(privateBucket)];
                case 1:
                    _a = !(_g.sent());
                    _g.label = 2;
                case 2:
                    if (!_a) return [3 /*break*/, 4];
                    return [4 /*yield*/, client.makeBucket(privateBucket)];
                case 3:
                    _g.sent();
                    _g.label = 4;
                case 4:
                    _b = verify;
                    if (!_b) return [3 /*break*/, 6];
                    return [4 /*yield*/, client.bucketExists(privateBucket)];
                case 5:
                    _b = !(_g.sent());
                    _g.label = 6;
                case 6:
                    if (_b)
                        throw new Error('private bucket missing');
                    scanned = 0;
                    legacy = 0;
                    migrated = 0;
                    errors = 0;
                    _g.label = 7;
                case 7: return [4 /*yield*/, prisma.ledgerFeedback.findMany(__assign(__assign({ orderBy: { id: 'asc' }, take: 200 }, (cursor ? { cursor: { id: cursor }, skip: 1 } : {})), { select: { id: true, userId: true, images: true } }))];
                case 8:
                    feedbacks = _g.sent();
                    if (!feedbacks.length)
                        return [3 /*break*/, 36];
                    _i = 0, feedbacks_1 = feedbacks;
                    _g.label = 9;
                case 9:
                    if (!(_i < feedbacks_1.length)) return [3 /*break*/, 34];
                    feedback = feedbacks_1[_i];
                    images = Array.isArray(feedback.images) ? feedback.images : [];
                    next = [];
                    changed = false;
                    _c = 0, images_1 = images;
                    _g.label = 10;
                case 10:
                    if (!(_c < images_1.length)) return [3 /*break*/, 30];
                    imageValue = images_1[_c];
                    image = String(imageValue || '');
                    if (!image.startsWith('feedback-private:')) return [3 /*break*/, 20];
                    id = image.slice('feedback-private:'.length);
                    return [4 /*yield*/, prisma.uploadedFile.findFirst({
                            where: { id: id, ownerId: feedback.userId, bizType: 'ledger-feedback-private' },
                        })];
                case 11:
                    file = _g.sent();
                    valid = !!file;
                    if (!(verify && file)) return [3 /*break*/, 19];
                    _g.label = 12;
                case 12:
                    _g.trys.push([12, 18, , 19]);
                    return [4 /*yield*/, client.statObject(privateBucket, file.key)];
                case 13:
                    valid = (_g.sent()).size === file.size;
                    legacyId = (_f = file.key.match(/^ledger-feedback-private\/legacy\/([^/]+)\//)) === null || _f === void 0 ? void 0 : _f[1];
                    if (!(valid && legacyId)) return [3 /*break*/, 17];
                    return [4 /*yield*/, prisma.uploadedFile.findFirst({
                            where: { id: legacyId, ownerId: feedback.userId, bizType: 'feedback' },
                        })];
                case 14:
                    original = _g.sent();
                    _d = !!original;
                    if (!_d) return [3 /*break*/, 16];
                    return [4 /*yield*/, sameObject(original.key, file.key, original.size)];
                case 15:
                    _d = (_g.sent());
                    _g.label = 16;
                case 16:
                    valid = _d;
                    _g.label = 17;
                case 17: return [3 /*break*/, 19];
                case 18:
                    _e = _g.sent();
                    valid = false;
                    return [3 /*break*/, 19];
                case 19:
                    if (!valid) {
                        errors++;
                        console.error("invalid private media feedback=".concat(feedback.id, " file=").concat(id));
                    }
                    next.push(image);
                    return [3 /*break*/, 29];
                case 20:
                    if (!image.startsWith(publicPrefix)) {
                        errors++;
                        console.error("unsupported media origin feedback=".concat(feedback.id));
                        next.push(image);
                        return [3 /*break*/, 29];
                    }
                    legacy++;
                    key = void 0;
                    try {
                        key = decodeURIComponent(image.slice((process.env.S3_PUBLIC_URL || '').replace(/\/$/, '').length + 1));
                    }
                    catch (_h) {
                        errors++;
                        console.error("invalid source encoding feedback=".concat(feedback.id));
                        next.push(image);
                        return [3 /*break*/, 29];
                    }
                    if (!/^feedback\/[a-zA-Z0-9/_-]+\.(jpg|jpeg|png|gif|webp)$/.test(key)) {
                        errors++;
                        console.error("unsafe key feedback=".concat(feedback.id));
                        next.push(image);
                        return [3 /*break*/, 29];
                    }
                    return [4 /*yield*/, prisma.uploadedFile.findFirst({
                            where: { key: key, ownerId: feedback.userId, bizType: 'feedback' },
                        })];
                case 21:
                    oldFile = _g.sent();
                    if (!oldFile) {
                        errors++;
                        console.error("unowned source feedback=".concat(feedback.id));
                        next.push(image);
                        return [3 /*break*/, 29];
                    }
                    if (!apply) {
                        next.push(image);
                        return [3 /*break*/, 29];
                    }
                    newKey = "ledger-feedback-private/legacy/".concat(oldFile.id, "/").concat(key.split('/').pop());
                    return [4 /*yield*/, prisma.uploadedFile.findUnique({ where: { key: newKey } })];
                case 22:
                    privateFile = _g.sent();
                    if (!!privateFile) return [3 /*break*/, 27];
                    return [4 /*yield*/, client.getObject(publicBucket, key)];
                case 23:
                    source = _g.sent();
                    return [4 /*yield*/, client.putObject(privateBucket, newKey, source, oldFile.size, {
                            'Content-Type': oldFile.mimeType,
                        })];
                case 24:
                    _g.sent();
                    return [4 /*yield*/, sameObject(key, newKey, oldFile.size)];
                case 25:
                    if (!(_g.sent()))
                        throw new Error("byte mismatch feedback=".concat(feedback.id));
                    return [4 /*yield*/, prisma.uploadedFile.create({
                            data: {
                                key: newKey,
                                url: "feedback-private:".concat(newKey),
                                size: oldFile.size,
                                mimeType: oldFile.mimeType,
                                bizType: 'ledger-feedback-private',
                                ownerId: feedback.userId,
                            },
                        })];
                case 26:
                    privateFile = _g.sent();
                    _g.label = 27;
                case 27: return [4 /*yield*/, sameObject(key, newKey, oldFile.size)];
                case 28:
                    if (!(_g.sent()))
                        throw new Error("existing private copy mismatch feedback=".concat(feedback.id));
                    next.push("feedback-private:".concat(privateFile.id));
                    changed = true;
                    migrated++;
                    _g.label = 29;
                case 29:
                    _c++;
                    return [3 /*break*/, 10];
                case 30:
                    if (!(apply && changed)) return [3 /*break*/, 32];
                    return [4 /*yield*/, prisma.ledgerFeedback.update({
                            where: { id: feedback.id },
                            data: { images: next },
                        })];
                case 31:
                    _g.sent();
                    _g.label = 32;
                case 32:
                    scanned++;
                    _g.label = 33;
                case 33:
                    _i++;
                    return [3 /*break*/, 9];
                case 34:
                    cursor = feedbacks[feedbacks.length - 1].id;
                    console.log("feedbacks=".concat(scanned, " legacy=").concat(legacy, " migrated=").concat(migrated, " errors=").concat(errors));
                    _g.label = 35;
                case 35: return [3 /*break*/, 7];
                case 36:
                    if (errors || (verify && legacy))
                        process.exitCode = 1;
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
