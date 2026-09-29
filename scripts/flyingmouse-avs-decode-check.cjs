#!/usr/bin/env node
'use strict';

// Functional decoder check. A decoded frame is evidence of local support, not Windows parity.
const { createHash } = require('node:crypto');
const { readFileSync, writeFileSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const samples = [
  { name: 'parity-test1-avs2.mkv', codec: 'avs2', sha256: 'fcb1429017508937b257843e14762521b515616e2f2ff4b83ebf30afcd9f7ed2', dimensions: '854x480' },
  { name: 'parity-test5-avs3.mkv', codec: 'avs3', sha256: '174af739da3b2d7e0df0a72ff60e0b1e72e58243776c780e332261a485e0713a', dimensions: '1024x576' },
  { name: 'parity-avs3-10bit.mkv', codec: 'avs3', sha256: '6539a5db45966add6466704ec13a029998ecd1835c50dad8e90952cdc01ea16e', dimensions: '640x360' },
];

function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

const ffmpeg = option('--ffmpeg', 'ffmpeg');
const sampleDir = resolve(option('--samples', '.'));
const output = resolve(option('--out', 'avs-decode-evidence.json'));
const rows = [];
const version = spawnSync(ffmpeg, ['-version'], { encoding: 'utf8', timeout: 10000 });

for (const sample of samples) {
  const path = join(sampleDir, sample.name);
  const row = { ...sample, input: path };
  try {
    const actualSha = createHash('sha256').update(readFileSync(path)).digest('hex');
    row.actualSha256 = actualSha;
    if (actualSha !== sample.sha256) throw new Error('input SHA256 mismatch');
    const args = ['-hide_banner', '-v', 'error', '-i', path, '-map', '0:v:0', '-frames:v', '1', '-pix_fmt', 'rgb24', '-f', 'framehash', '-hash', 'SHA256', '-'];
    const result = spawnSync(ffmpeg, args, { encoding: 'utf8', timeout: 120000, maxBuffer: 1024 * 1024 });
    row.command = [ffmpeg, ...args];
    row.exitCode = result.status;
    row.stderr = result.stderr || String(result.error || '');
    row.framehash = result.stdout || '';
    const dimensions = row.framehash.match(/^#dimensions\s+0:\s*(\S+)/m)?.[1];
    const frames = row.framehash.split('\n').filter((line) => /^\s*0\s*,/.test(line));
    if (result.error || result.status !== 0 || dimensions !== sample.dimensions || frames.length !== 1 || !/[a-f0-9]{64}\s*$/i.test(frames[0])) {
      throw new Error(`decode failed or invalid first frame (dimensions=${dimensions || 'missing'}, frames=${frames.length})`);
    }
    row.pixelSha256 = frames[0].match(/([a-f0-9]{64})\s*$/i)[1].toLowerCase();
    row.status = 'decoded';
  } catch (error) {
    row.status = 'failed';
    row.error = error.message;
  }
  rows.push(row);
}

writeFileSync(output, JSON.stringify({ ffmpegVersion: version.stdout?.split('\n')[0] || '', platform: process.platform, arch: process.arch, windowsCompared: false, rows }, null, 2) + '\n');
console.log(`${rows.filter((row) => row.status === 'decoded').length}/${rows.length} decoded; ${output}`);
if (rows.some((row) => row.status !== 'decoded')) process.exitCode = 1;
