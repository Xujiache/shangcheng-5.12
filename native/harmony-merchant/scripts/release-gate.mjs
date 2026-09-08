#!/usr/bin/env node

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
function option(name, fallback) {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? resolve(process.argv[index + 1]) : fallback;
}
const releaseEvidencePath = option(
  '--release-evidence',
  join(projectRoot, 'artifacts/release/1.0.0/release-evidence.json'),
);
const backendEvidencePath = option(
  '--backend-evidence',
  join(projectRoot, 'artifacts/backend-verification/latest.json'),
);
const acceptancePath = option(
  '--acceptance',
  process.env.HARMONY_RELEASE_ACCEPTANCE_FILE
    ? resolve(process.env.HARMONY_RELEASE_ACCEPTANCE_FILE)
    : '/root/secure/jingwei-harmony-signing/release-acceptance.json',
);
const failures = [];
const passed = [];
const fail = (message) => failures.push(message);
const pass = (message) => passed.push(message);

function json(path, label) {
  if (!existsSync(path)) {
    fail(`${label} is missing: ${path}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    fail(`${label} is not valid JSON: ${path}`);
    return null;
  }
}

const currentRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).trim();
const statusLines = execFileSync('git', ['status', '--porcelain'], {
  cwd: projectRoot,
  encoding: 'utf8',
}).split(/\r?\n/).filter(Boolean);
const unexpectedStatus = statusLines.filter((line) => !/^ [mM] third_party\/ibest-ui$/.test(line));
if (unexpectedStatus.length > 0) fail(`native source has unreviewed changes: ${unexpectedStatus.join(', ')}`);
else pass('native source revision is controlled');

const release = json(releaseEvidencePath, 'signed release evidence');
if (release) {
  if (release.releaseState !== 'signed-release-candidate') {
    fail(`release state is ${release.releaseState}, not signed-release-candidate`);
  } else if (release.source?.gitRevision !== currentRevision) {
    fail('signed release evidence does not match the current Git revision');
  } else if (!release.artifacts?.hap?.cryptographicallySigned
    || !release.artifacts?.appPack?.cryptographicallySigned
    || !release.artifacts?.appPack?.embeddedHap?.cryptographicallySigned) {
    fail('release HAP, App Pack container and embedded HAP are not all signed');
  } else if (release.application?.bundleName !== 'top.ewsn.jingwei.merchant'
    || release.application?.versionName !== '1.0.0'
    || release.application?.versionCode !== 1000000) {
    fail('signed release identity does not match the approved application identity');
  } else {
    pass('signed release identity and three-layer signatures passed');
  }
}

const backend = json(backendEvidencePath, 'Harmony backend evidence');
if (backend) {
  const age = Date.now() - Date.parse(backend.generatedAt);
  if (!Number.isFinite(age) || age < 0 || age > 24 * 60 * 60 * 1000) {
    fail('Harmony backend evidence is older than 24 hours');
  } else if (!backend.tests?.success || backend.tests?.suites < 12
    || backend.tests?.tests < 87 || backend.tests?.failedTests !== 0
    || backend.gates?.typecheck !== 'passed'
    || backend.gates?.productionBuild !== 'passed'
    || backend.gates?.productionHealthHttp !== 200
    || backend.gates?.authenticatedReadOnlyRestSurfaces < 30
    || backend.gates?.authenticatedResponseContractShapes < 30
    || backend.gates?.jsonWebSocketAuthentication !== 'passed'
    || backend.gates?.jsonWebSocketChatOwnership !== 'passed') {
    fail('Harmony backend evidence does not satisfy the release contract');
  } else {
    pass('Harmony backend tests, build and production smoke passed');
  }
}

const readinessResult = spawnSync(
  process.execPath,
  [join(projectRoot, 'scripts/check-external-readiness.mjs'), '--json'],
  { cwd: projectRoot, encoding: 'utf8' },
);
try {
  const readiness = JSON.parse(readinessResult.stdout || '{}');
  const pending = (readiness.checks || []).filter((check) => !check.ready);
  if (pending.length > 0) fail(`external readiness pending: ${pending.map((item) => item.id).join(', ')}`);
  else pass('AGC, device, Push, IAP and AppGallery readiness passed');
} catch {
  fail('external readiness report is unavailable');
}

function collectDeviceReports(path, output = []) {
  if (!existsSync(path)) return output;
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const child = join(path, entry.name);
    if (entry.isDirectory()) collectDeviceReports(child, output);
    else if (entry.isFile() && entry.name === 'device-smoke.json') output.push(child);
  }
  return output;
}
const deviceReports = collectDeviceReports(join(projectRoot, 'artifacts/device-smoke'))
  .map((path) => ({ path, report: json(path, 'device smoke evidence') }))
  .filter((entry) => entry.report);
const matchingDevices = deviceReports.filter(({ report }) => (
  report.source?.gitRevision === currentRevision
  && report.artifacts?.hap?.sha256 === release?.artifacts?.hap?.sha256
  && report.hypium?.total >= 32
  && report.hypium?.pass === report.hypium?.total
  && report.hypium?.failure === 0
  && report.hypium?.error === 0
  && report.hypium?.ignore === 0
  && report.gates?.install === 'passed'
  && report.gates?.launch === 'passed'
  && report.gates?.processAlive === 'passed'
));
const deviceClasses = new Set(matchingDevices.map(({ report }) => report.device?.class));
if (!deviceClasses.has('phone') || (!deviceClasses.has('foldable') && !deviceClasses.has('tablet'))) {
  fail('matching phone and foldable/tablet device smoke evidence is incomplete');
} else {
  pass('phone and expanded-device Hypium/install/launch evidence passed');
}

const acceptance = json(acceptancePath, '31-surface manual acceptance');
if (acceptance && release) {
  const expectedIds = Array.from({ length: 31 }, (_, index) => index + 1);
  const features = acceptance.featureSurfaces || [];
  const featureIds = new Set(features.map((item) => item.id));
  const featuresPassed = features.length === 31
    && expectedIds.every((id) => featureIds.has(id))
    && features.every((item) => item.status === 'passed' && String(item.evidence || '').trim());
  const requiredCapabilities = new Set([
    'permissions',
    'map-location-site',
    'push-deeplink',
    'iap-lifecycle',
    'update-appgallery',
    'theme-layout-accessibility',
  ]);
  const capabilities = acceptance.systemCapabilities || [];
  const capabilitiesPassed = capabilities.length === requiredCapabilities.size
    && capabilities.every((item) => requiredCapabilities.has(item.id)
      && item.status === 'passed' && String(item.evidence || '').trim());
  const memory = acceptance.performance?.memory;
  const performancePassed = acceptance.performance?.firstFrame?.status === 'passed'
    && Number.isFinite(acceptance.performance?.firstFrame?.milliseconds)
    && String(acceptance.performance?.firstFrame?.evidence || '').trim()
    && acceptance.performance?.navigation50?.status === 'passed'
    && String(acceptance.performance?.navigation50?.evidence || '').trim()
    && memory?.status === 'passed'
    && Number.isFinite(memory?.growthPercent)
    && Number.isFinite(memory?.growthMiB)
    && (memory.growthPercent <= 10 || memory.growthMiB <= 20)
    && String(memory?.evidence || '').trim();
  if (acceptance.gitRevision !== currentRevision
    || acceptance.appPackSha256 !== release.artifacts?.appPack?.sha256
    || !featuresPassed || !capabilitiesPassed || !performancePassed
    || !String(acceptance.approvedAt || '').trim()
    || !String(acceptance.approvedBy || '').trim()) {
    fail('manual feature, system-capability or performance acceptance is incomplete');
  } else {
    pass('31 feature surfaces, system capabilities and performance acceptance passed');
  }
}

const output = {
  ready: failures.length === 0,
  gitRevision: currentRevision,
  passed,
  failures,
};
if (process.argv.includes('--json')) process.stdout.write(`${JSON.stringify(output)}\n`);
else {
  process.stdout.write(`Harmony release gate: ${output.ready ? 'READY' : 'NOT READY'}\n`);
  for (const item of passed) process.stdout.write(`PASS    ${item}\n`);
  for (const item of failures) process.stdout.write(`PENDING ${item}\n`);
}
process.exit(output.ready ? 0 : 2);
