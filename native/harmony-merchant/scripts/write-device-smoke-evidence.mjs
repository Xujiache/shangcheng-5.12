#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) throw new Error(`Missing ${name}`);
  return process.argv[index + 1];
}

const evidenceDir = resolve(option('--evidence-dir'));
const deviceClass = option('--device-class');
const target = option('--target');
const hap = resolve(option('--hap'));
const testHap = resolve(option('--test-hap'));
if (!['phone', 'foldable', 'tablet'].includes(deviceClass)) {
  throw new Error(`Unsupported device class: ${deviceClass}`);
}

const projectRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const text = (name) => readFileSync(join(evidenceDir, name), 'utf8').trim();
const hypium = JSON.parse(text('hypium-summary.json'));
if (hypium.total < 31 || hypium.pass !== hypium.total
  || hypium.failure !== 0 || hypium.error !== 0 || hypium.ignore !== 0) {
  throw new Error('Device Hypium summary is incomplete or contains failures');
}
if (!text('process.txt')) throw new Error('Application process evidence is empty');

function artifact(path) {
  return {
    fileName: path.split('/').pop(),
    size: statSync(path).size,
    sha256: createHash('sha256').update(readFileSync(path)).digest('hex'),
  };
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  source: {
    gitRevision: execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: projectRoot,
      encoding: 'utf8',
    }).trim(),
  },
  device: {
    class: deviceClass,
    targetSha256: createHash('sha256').update(target).digest('hex'),
    model: text('device-model.txt'),
    systemVersion: text('system-version.txt'),
  },
  artifacts: {
    hap: artifact(hap),
    hypiumTestHap: artifact(testHap),
  },
  hypium,
  gates: {
    install: text('install.txt').length > 0 ? 'passed' : 'failed',
    launch: text('start.txt').length > 0 ? 'passed' : 'failed',
    processAlive: 'passed',
  },
  evidenceDirectory: relative(projectRoot, evidenceDir).replaceAll('\\', '/'),
};
if (report.gates.install !== 'passed' || report.gates.launch !== 'passed') {
  throw new Error('Install or launch evidence is empty');
}
writeFileSync(join(evidenceDir, 'device-smoke.json'), `${JSON.stringify(report, null, 2)}\n`, {
  mode: 0o600,
});
process.stdout.write(`Device smoke manifest written for ${deviceClass}.\n`);
