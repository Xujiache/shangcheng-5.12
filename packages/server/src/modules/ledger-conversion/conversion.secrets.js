"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertConversionPasswordKey = assertConversionPasswordKey;
exports.encryptConversionPassword = encryptConversionPassword;
exports.decryptConversionPassword = decryptConversionPassword;
var node_crypto_1 = require("node:crypto");
function key() {
    var value = process.env.CONVERSION_PASSWORD_KEY || '';
    if (!/^[0-9a-fA-F]{64}$/.test(value))
        throw new Error('CONVERSION_PASSWORD_KEY must be a 32-byte hex key');
    return Buffer.from(value, 'hex');
}
function assertConversionPasswordKey() { key(); }
function encryptConversionPassword(password) {
    var nonce = (0, node_crypto_1.randomBytes)(12);
    var cipher = (0, node_crypto_1.createCipheriv)('aes-256-gcm', key(), nonce);
    var encrypted = Buffer.concat([cipher.update(password, 'utf8'), cipher.final()]);
    return "v1:".concat(nonce.toString('base64url'), ":").concat(cipher.getAuthTag().toString('base64url'), ":").concat(encrypted.toString('base64url'));
}
function decryptConversionPassword(value) {
    var parts = value.split(':');
    if (parts.length !== 4 || parts[0] !== 'v1')
        throw new Error('Invalid encrypted conversion password');
    var nonce = Buffer.from(parts[1], 'base64url');
    var tag = Buffer.from(parts[2], 'base64url');
    if (nonce.length !== 12 || tag.length !== 16)
        throw new Error('Invalid encrypted conversion password');
    var decipher = (0, node_crypto_1.createDecipheriv)('aes-256-gcm', key(), nonce);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3], 'base64url')), decipher.final()]).toString('utf8');
}
