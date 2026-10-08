"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ledger_avatar_util_1 = require("../src/modules/ledger/ledger-avatar.util");
describe('ledger avatar values', function () {
    it('accepts only the fixed letter-avatar hues', function () {
        expect((0, ledger_avatar_util_1.isLedgerAvatarHue)('teal')).toBe(true);
        expect((0, ledger_avatar_util_1.isLedgerAvatarHue)('violet')).toBe(true);
        expect((0, ledger_avatar_util_1.isLedgerAvatarHue)('custom')).toBe(false);
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)(' teal ')).toBe('teal');
    });
    it('accepts only a valid internal immutable image path', function () {
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('/api/v1/l/avatar-image/abc12345')).toBe('/api/v1/l/avatar-image/abc12345');
        expect((0, ledger_avatar_util_1.ledgerAvatarImageId)('/api/v1/l/avatar-image/abc12345')).toBe('abc12345');
        expect((0, ledger_avatar_util_1.ledgerAvatarPath)('abc12345')).toBe('/api/v1/l/avatar-image/abc12345');
    });
    it('rejects absolute, legacy, forged and malformed values', function () {
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('https://ewsn.top/api/v1/l/avatar-image/abc12345')).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('https://ewsn.top/oss/avatar/a.jpg')).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('/api/v1/l/avatar-image/short')).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('/api/v1/l/avatar-image/abc12345/extra')).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)('teal<script>')).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)(null)).toBeNull();
        expect((0, ledger_avatar_util_1.sanitizeLedgerAvatar)(undefined)).toBeNull();
    });
    it('rejects invalid ids when creating a path', function () {
        expect(function () { return (0, ledger_avatar_util_1.ledgerAvatarPath)('short'); }).toThrow();
        expect(function () { return (0, ledger_avatar_util_1.ledgerAvatarPath)('a'.repeat(65)); }).toThrow();
    });
});
