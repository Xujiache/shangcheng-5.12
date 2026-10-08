"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEDGER_AVATAR_HUES = void 0;
exports.isLedgerAvatarHue = isLedgerAvatarHue;
exports.ledgerAvatarImageId = ledgerAvatarImageId;
exports.sanitizeLedgerAvatar = sanitizeLedgerAvatar;
exports.ledgerAvatarPath = ledgerAvatarPath;
exports.LEDGER_AVATAR_HUES = ['teal', 'blue', 'gold', 'rust', 'olive', 'violet'];
var LEDGER_AVATAR_IMAGE_RE = /^\/api\/v1\/l\/avatar-image\/([a-zA-Z0-9_-]{8,64})$/;
function isLedgerAvatarHue(value) {
    return typeof value === 'string' && exports.LEDGER_AVATAR_HUES.includes(value);
}
function ledgerAvatarImageId(value) {
    if (typeof value !== 'string')
        return null;
    var match = LEDGER_AVATAR_IMAGE_RE.exec(value.trim());
    return match ? match[1] : null;
}
/** 数据库只保存固定字母色或本站相对头像路径。历史外链一律回退为 null。 */
function sanitizeLedgerAvatar(value) {
    if (typeof value !== 'string')
        return null;
    var v = value.trim();
    if (isLedgerAvatarHue(v))
        return v;
    return ledgerAvatarImageId(v) ? v : null;
}
function ledgerAvatarPath(id) {
    if (!/^[a-zA-Z0-9_-]{8,64}$/.test(id))
        throw new Error('invalid ledger avatar id');
    return "/api/v1/l/avatar-image/".concat(id);
}
