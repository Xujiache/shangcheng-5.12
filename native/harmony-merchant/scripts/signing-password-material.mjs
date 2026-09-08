#!/usr/bin/env node

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const component = Buffer.from([
  49, 243, 9, 115, 214, 175, 91, 184,
  211, 190, 177, 88, 101, 131, 192, 119,
]);
const mode = process.argv[2];
const materialDirIndex = process.argv.indexOf('--material-dir');
const environmentFileIndex = process.argv.indexOf('--environment-file');
const secureDir = materialDirIndex >= 0 && process.argv[materialDirIndex + 1]
  ? path.resolve(process.argv[materialDirIndex + 1])
  : null;
const environmentFile = environmentFileIndex >= 0 && process.argv[environmentFileIndex + 1]
  ? path.resolve(process.argv[environmentFileIndex + 1])
  : null;

function fail(message) {
  process.stderr.write(`ERROR: ${message}\n`);
  process.exit(1);
}

if (!['create', 'verify'].includes(mode) || !secureDir) {
  fail('Usage: signing-password-material.mjs <create|verify> --material-dir <secure-dir> [--environment-file <env-file>]');
}

const materialRoot = path.join(secureDir, 'material');
const fdRoot = path.join(materialRoot, 'fd');
const acRoot = path.join(materialRoot, 'ac');
const ceRoot = path.join(materialRoot, 'ce');

function xorBuffers(buffers) {
  const result = Buffer.from(buffers[0]);
  for (let index = 1; index < buffers.length; index += 1) {
    if (buffers[index].length !== result.length) fail('signing material component length mismatch');
    for (let offset = 0; offset < result.length; offset += 1) {
      result[offset] ^= buffers[index][offset];
    }
  }
  return result;
}

function encrypt(key, plaintext) {
  const nonce = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-128-gcm', key, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  const result = Buffer.alloc(4 + nonce.length + encrypted.length + tag.length);
  result.writeUInt32BE(encrypted.length + tag.length, 0);
  nonce.copy(result, 4);
  encrypted.copy(result, 16);
  tag.copy(result, 16 + encrypted.length);
  return result;
}

function decrypt(key, payload) {
  const encryptedAndTagLength = payload.readUInt32BE(0);
  const nonceLength = payload.length - 4 - encryptedAndTagLength;
  if (nonceLength !== 12) fail('signing material nonce has an invalid length');
  const nonce = payload.subarray(4, 4 + nonceLength);
  const encrypted = payload.subarray(4 + nonceLength, payload.length - 16);
  const tag = payload.subarray(payload.length - 16);
  const decipher = crypto.createDecipheriv('aes-128-gcm', key, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

function writeMaterialDirectory(directory, value) {
  fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
  const file = path.join(directory, crypto.createHash('sha256').update(value).digest('hex'));
  fs.writeFileSync(file, value, { mode: 0o600, flag: 'wx' });
}

function readSingleFile(directory) {
  const entries = fs.readdirSync(directory).filter((entry) => entry !== '.DS_Store');
  if (entries.length !== 1) fail(`signing material directory must contain exactly one file: ${directory}`);
  const file = path.join(directory, entries[0]);
  if (!fs.statSync(file).isFile()) fail(`signing material entry is not a file: ${file}`);
  return fs.readFileSync(file);
}

function loadKey() {
  const fdEntries = fs.readdirSync(fdRoot).filter((entry) => entry !== '.DS_Store').sort();
  if (fdEntries.length !== 3) fail('signing material fd directory must contain three components');
  const fd = fdEntries.map((entry) => readSingleFile(path.join(fdRoot, entry)));
  const salt = readSingleFile(acRoot);
  const rootKey = crypto.pbkdf2Sync(
    xorBuffers([...fd, component]).toString(),
    salt,
    10_000,
    16,
    'sha256',
  );
  return decrypt(rootKey, readSingleFile(ceRoot));
}

function requiredPassword(name) {
  const value = process.env[name];
  if (!value) fail(`${name} is required`);
  return value;
}

if (mode === 'create') {
  if (!environmentFile) fail('--environment-file is required in create mode');
  if (fs.existsSync(materialRoot)) fail(`refusing to overwrite signing material: ${materialRoot}`);
  const storePassword = requiredPassword('HARMONY_SIGNING_STORE_PASSWORD');
  const keyPassword = requiredPassword('HARMONY_SIGNING_KEY_PASSWORD');
  try {
    fs.mkdirSync(materialRoot, { recursive: true, mode: 0o700 });
    const fd = [crypto.randomBytes(16), crypto.randomBytes(16), crypto.randomBytes(16)];
    fd.forEach((value, index) => writeMaterialDirectory(path.join(fdRoot, String(index)), value));
    const salt = crypto.randomBytes(16);
    writeMaterialDirectory(acRoot, salt);
    const rootKey = crypto.pbkdf2Sync(
      xorBuffers([...fd, component]).toString(),
      salt,
      10_000,
      16,
      'sha256',
    );
    const workKey = crypto.randomBytes(16);
    writeMaterialDirectory(ceRoot, encrypt(rootKey, workKey));
    const encryptedStore = encrypt(workKey, Buffer.from(storePassword, 'utf8')).toString('hex');
    const encryptedKey = encrypt(workKey, Buffer.from(keyPassword, 'utf8')).toString('hex');
    fs.appendFileSync(
      environmentFile,
      `HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED=${encryptedStore}\n`
        + `HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED=${encryptedKey}\n`,
      { mode: 0o600 },
    );
    if (decrypt(loadKey(), Buffer.from(encryptedStore, 'hex')).toString('utf8') !== storePassword
      || decrypt(loadKey(), Buffer.from(encryptedKey, 'hex')).toString('utf8') !== keyPassword) {
      fail('generated signing password material did not round-trip');
    }
  } catch (error) {
    fs.rmSync(materialRoot, { recursive: true, force: true });
    throw error;
  }
  process.stdout.write('Encrypted Harmony signing password material created outside Git.\n');
} else {
  const storePassword = requiredPassword('HARMONY_SIGNING_STORE_PASSWORD');
  const keyPassword = requiredPassword('HARMONY_SIGNING_KEY_PASSWORD');
  const encryptedStore = requiredPassword('HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED');
  const encryptedKey = requiredPassword('HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED');
  const workKey = loadKey();
  if (decrypt(workKey, Buffer.from(encryptedStore, 'hex')).toString('utf8') !== storePassword
    || decrypt(workKey, Buffer.from(encryptedKey, 'hex')).toString('utf8') !== keyPassword) {
    fail('encrypted signing password does not match the PKCS12 password');
  }
  process.stdout.write('Encrypted Harmony signing password material verified.\n');
}
