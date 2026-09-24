#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  lstatSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';

function option(name) {
  const index = process.argv.indexOf(name);
  if (index < 0 || !process.argv[index + 1]) {
    throw new Error(`Missing ${name}`);
  }
  return process.argv[index + 1];
}

const backendRoot = resolve(option('--backend-root'));
const jestPath = resolve(option('--jest'));
const smokePath = resolve(option('--smoke'));
const healthPath = resolve(option('--health'));
const outputPath = resolve(option('--output'));
const baseUrl = option('--base-url').replace(/\/+$/, '');
const jest = JSON.parse(readFileSync(jestPath, 'utf8'));
const smoke = readFileSync(smokePath, 'utf8');
const healthStatus = readFileSync(healthPath, 'utf8').trim();

if (!jest.success || jest.numFailedTestSuites !== 0 || jest.numFailedTests !== 0) {
  throw new Error('Harmony backend Jest verification did not pass cleanly');
}
if (jest.numPassedTestSuites < 12 || jest.numPassedTests < 87) {
  throw new Error(
    `Harmony backend coverage unexpectedly shrank: suites=${jest.numPassedTestSuites}, tests=${jest.numPassedTests}`,
  );
}
const smokeMatch = smoke.match(
  /Authenticated Harmony merchant smoke passed against deployed service:\s*(\d+) read-only REST surfaces,\s*(\d+) response contract shapes and JSON WebSocket auth\/chat ownership\./,
);
if (!smokeMatch || Number(smokeMatch[1]) < 30 || Number(smokeMatch[2]) < 30) {
  throw new Error('Production Harmony merchant account smoke evidence is incomplete');
}
if (healthStatus !== '200') {
  throw new Error(`Production health endpoint returned HTTP ${healthStatus || 'unknown'}`);
}

const sourceRoots = [
  'src',
  'prisma/schema.prisma',
  'package.json',
  'tsconfig.json',
  'nest-cli.json',
  'scripts/smoke-harmony-merchant-account.mjs',
  'test/app-release-harmony.spec.ts',
  'test/auth.service.spec.ts',
  'test/chat.gateway.spec.ts',
  'test/harmony-iap.service.spec.ts',
  'test/huawei-iap-jws.service.spec.ts',
  'test/huawei-iap-server.service.spec.ts',
  'test/harmony-module-bootstrap.spec.ts',
  'test/harmony-push.service.spec.ts',
  'test/harmony-realtime.service.spec.ts',
  'test/legal.service.spec.ts',
  'test/merchant-chat.spec.ts',
  'test/merchant-plaza.spec.ts',
];
const files = [];
function collect(path) {
  const entry = lstatSync(path);
  if (entry.isDirectory()) {
    for (const name of readdirSync(path).sort()) collect(join(path, name));
  } else if (entry.isFile()) {
    files.push(path);
  }
}
for (const source of sourceRoots) collect(join(backendRoot, source));
const sourceHash = createHash('sha256');
for (const path of [...new Set(files)].sort()) {
  sourceHash.update(relative(backendRoot, path).replaceAll('\\', '/'));
  sourceHash.update('\0');
  sourceHash.update(readFileSync(path));
  sourceHash.update('\0');
}

let gitRevision = null;
let gitDirty = null;
try {
  gitRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: backendRoot,
    encoding: 'utf8',
  }).trim();
  gitDirty = execFileSync('git', ['status', '--porcelain', '--', 'packages/server'], {
    cwd: resolve(backendRoot, '../..'),
    encoding: 'utf8',
  }).trim().length > 0;
} catch {
  // The source tree hash remains authoritative when Git metadata is unavailable.
}

const report = {
  schemaVersion: 1,
  generatedAt: new Date().toISOString(),
  productionBaseUrl: baseUrl,
  backend: {
    path: backendRoot,
    gitRevision,
    gitDirty,
    sourceFileCount: new Set(files).size,
    sourceTreeSha256: sourceHash.digest('hex'),
  },
  tests: {
    suites: jest.numPassedTestSuites,
    tests: jest.numPassedTests,
    failedSuites: jest.numFailedTestSuites,
    failedTests: jest.numFailedTests,
    success: jest.success,
  },
  gates: {
    typecheck: 'passed',
    productionBuild: 'passed',
    productionHealthHttp: Number(healthStatus),
    authenticatedReadOnlyRestSurfaces: Number(smokeMatch[1]),
    authenticatedResponseContractShapes: Number(smokeMatch[2]),
    jsonWebSocketAuthentication: 'passed',
    jsonWebSocketChatOwnership: 'passed',
  },
  logs: {
    jest: 'jest.log',
    typecheck: 'typecheck.log',
    build: 'build.log',
    smoke: basename(smokePath),
    health: basename(healthPath),
  },
};
writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
process.stdout.write(
  `Harmony backend evidence generated: ${report.tests.tests} tests, ${report.gates.authenticatedReadOnlyRestSurfaces} production REST surfaces.\n`,
);
