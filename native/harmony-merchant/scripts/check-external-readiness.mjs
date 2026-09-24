#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(scriptDir, '..');
const harmonyHome = process.env.HARMONY_COMMAND_LINE_HOME || '/opt/harmony-command-line-tools-api26';
const hdc = process.env.HDC_BIN || join(
  harmonyHome,
  'sdk/default/openharmony/toolchains/hdc',
);

const buildProfile = readFileSync(join(projectRoot, 'build-profile.json5'), 'utf8');
const hasSigningConfig = !/"signingConfigs"\s*:\s*\[\s*\]/s.test(buildProfile)
  && /"signingConfig"\s*:/s.test(buildProfile);
const agcCandidates = [
  join(projectRoot, 'entry/agconnect-services.json'),
  join(projectRoot, 'entry/src/main/resources/rawfile/agconnect-services.json'),
];
const hasAgcConfiguration = agcCandidates.some((path) => existsSync(path));

let connectedTargets = [];
if (existsSync(hdc)) {
  try {
    connectedTargets = execFileSync(hdc, ['list', 'targets'], { encoding: 'utf8' })
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && line !== '[Empty]');
  } catch {
    // Report the device gate as pending without hiding the other checks.
  }
}

const pushServiceAccount = process.env.HUAWEI_PUSH_SERVICE_ACCOUNT_FILE || '';
const hasPushCredentials = Boolean(
  process.env.HUAWEI_PUSH_PROJECT_ID
    && ((pushServiceAccount && existsSync(pushServiceAccount))
      || (process.env.HUAWEI_PUSH_KEY_ID
        && process.env.HUAWEI_PUSH_SUB_ACCOUNT
        && process.env.HUAWEI_PUSH_PRIVATE_KEY)),
);
const hasIapPublicKey = Boolean(process.env.HUAWEI_IAP_PUBLIC_KEY);
const iapPrivateKeyFile = process.env.HUAWEI_IAP_PRIVATE_KEY_FILE || '';
const hasIapServerCredentials = Boolean(
  process.env.HUAWEI_IAP_APPLICATION_ID
    && process.env.HUAWEI_IAP_ISSUER_ID
    && process.env.HUAWEI_IAP_KEY_ID
    && ((iapPrivateKeyFile && existsSync(iapPrivateKeyFile))
      || process.env.HUAWEI_IAP_PRIVATE_KEY),
);
const hasIapProductMapping = process.env.HUAWEI_IAP_PRODUCT_MAPPING_VERIFIED === '1';
const hasAgcKits = process.env.HUAWEI_AGC_KITS_VERIFIED === '1';
const hasAppGalleryListing = process.env.HUAWEI_APPGALLERY_LISTING_VERIFIED === '1';
let hasLocalAppGalleryCompliance = false;
try {
  execFileSync(process.execPath, [join(scriptDir, 'audit-appgallery-compliance.mjs')], {
    cwd: projectRoot,
    stdio: 'ignore',
  });
  hasLocalAppGalleryCompliance = true;
} catch {
  // Local metadata or privacy disclosure drift must block console submission.
}
const signingSecureDir = process.env.HARMONY_SIGNING_SECURE_DIR
  || '/root/secure/jingwei-harmony-signing';
const signingKeyPath = join(signingSecureDir, 'release-key.p12');
const signingCsrPath = join(signingSecureDir, 'jingwei-merchant-release.csr');
const secureAgcPath = join(signingSecureDir, 'agconnect-services.json');
let hasReleaseKeyAndCsr = false;
if (existsSync(signingKeyPath) && existsSync(signingCsrPath)) {
  try {
    execFileSync('openssl', ['req', '-in', signingCsrPath, '-noout', '-verify'], {
      stdio: 'ignore',
    });
    hasReleaseKeyAndCsr = true;
  } catch {
    // A malformed CSR is not a usable signing prerequisite.
  }
}
let hasVerifiedReleaseMaterials = false;
try {
  execFileSync('bash', [join(scriptDir, 'verify-release-materials.sh')], {
    env: { ...process.env, HARMONY_SIGNING_SECURE_DIR: signingSecureDir },
    stdio: 'ignore',
  });
  hasVerifiedReleaseMaterials = true;
} catch {
  // Missing, expired or mismatched AGC materials keep the release gate pending.
}
const hasSecureAgcConfiguration = existsSync(secureAgcPath)
  && readFileSync(secureAgcPath).length > 0;
const backendBaseUrl = String(
  process.env.HARMONY_BACKEND_BASE_URL || 'https://ewsn.top',
).replace(/\/+$/, '');

function apiEnvelope(value) {
  return value && typeof value === 'object' && Number(value.code) === 0;
}

async function probe(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${backendBaseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'X-Client-Platform': 'merchant-harmony',
        'X-Client-Version': '1.0.0',
        ...(options.headers || {}),
      },
    });
    let body = null;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      try {
        body = await response.json();
      } catch {
        // An invalid JSON response is reported as a failed readiness probe below.
      }
    }
    return { status: response.status, body, contentType };
  } catch (error) {
    return {
      status: 0,
      body: null,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function inspectLiveBackend() {
  const latest = await probe('/api/v1/m/app/latest?platform=merchant-harmony');
  const push = await probe('/api/v1/m/push/preferences');
  const iap = await probe('/api/v1/m/membership/iap/prepare', {
    method: 'POST',
    body: JSON.stringify({ planId: '__readiness_probe__' }),
  });
  const privacy = await probe('/api/v1/u/legal/merchant-harmony/privacy');
  const collection = await probe('/api/v1/u/legal/merchant-harmony/collect');

  const latestReady = latest.status === 200 && apiEnvelope(latest.body)
    && (latest.body.data === null
      || (typeof latest.body.data === 'object'
        && latest.body.data.platform === 'merchant-harmony'));
  // Protected Harmony routes must exist in production. An unauthenticated
  // readiness request therefore has to stop at authentication (401), not at
  // routing (404) or DTO validation (400).
  const protectedRoutesReady = push.status === 401 && iap.status === 401;
  const legalRoutesReady = privacy.status === 200 && collection.status === 200
    && privacy.contentType?.includes('text/html')
    && collection.contentType?.includes('text/html');
  if (latestReady && protectedRoutesReady && legalRoutesReady) {
    return {
      ready: true,
      detail: 'public update/legal and protected Push/IAP Harmony routes are deployed',
    };
  }

  const detail = [
    `latest=${latest.status || 'network-error'}`,
    `push=${push.status || 'network-error'}`,
    `iap=${iap.status || 'network-error'}`,
    `privacy=${privacy.status || 'network-error'}`,
    `collection=${collection.status || 'network-error'}`,
  ].join(', ');
  return {
    ready: false,
    detail: `production Harmony route probe failed (${detail})`,
  };
}

const liveBackend = await inspectLiveBackend();

const checks = [
  {
    id: 'release-key-csr',
    ready: hasReleaseKeyAndCsr,
    detail: hasReleaseKeyAndCsr
      ? 'release EC private key and verified CSR are stored outside Git'
      : 'release private key or verified CSR is absent from the secure directory',
  },
  {
    id: 'release-signing',
    ready: hasVerifiedReleaseMaterials,
    detail: hasVerifiedReleaseMaterials
      ? 'release certificate, Profile, AGC configuration and key binding are verified outside Git'
      : hasSigningConfig
        ? 'transient signingConfig exists, but secure release materials did not verify'
        : 'AGC release certificate/Profile have not been imported and verified',
  },
  {
    id: 'agc-client-config',
    ready: hasAgcConfiguration || hasSecureAgcConfiguration,
    detail: hasAgcConfiguration || hasSecureAgcConfiguration
      ? 'AGC client configuration is present in the secure build boundary'
      : 'AGC client configuration is absent',
  },
  {
    id: 'harmony-next-device',
    ready: connectedTargets.length > 0,
    detail: connectedTargets.length > 0
      ? `${connectedTargets.length} HDC target(s) connected`
      : 'no HarmonyOS NEXT HDC target is connected',
  },
  {
    id: 'server-push-credentials',
    ready: hasPushCredentials,
    detail: hasPushCredentials
      ? 'Push credential variables are present'
      : 'Push credential variables are not present in this process environment',
  },
  {
    id: 'server-iap-public-key',
    ready: hasIapPublicKey,
    detail: hasIapPublicKey
      ? 'IAP public key variable is present'
      : 'IAP public key variable is not present in this process environment',
  },
  {
    id: 'server-iap-api-credentials',
    ready: hasIapServerCredentials,
    detail: hasIapServerCredentials
      ? 'IAP Server API application ID and ES256 key variables are present'
      : 'IAP Server API application ID, issuer ID, key ID or private key is absent',
  },
  {
    id: 'production-harmony-routes',
    ready: liveBackend.ready,
    detail: liveBackend.detail,
  },
  {
    id: 'appgallery-local-compliance',
    ready: hasLocalAppGalleryCompliance,
    detail: hasLocalAppGalleryCompliance
      ? 'localized listing, privacy labels, permissions and public legal routes are source-audited'
      : 'local AppGallery metadata/privacy audit failed',
  },
  {
    id: 'agc-kits-enabled',
    ready: hasAgcKits,
    manual: true,
    detail: hasAgcKits
      ? 'Push, Map, Site, Location and IAP kits were manually confirmed'
      : 'confirm Push, Map, Site, Location and IAP kits in AGC, then set HUAWEI_AGC_KITS_VERIFIED=1',
  },
  {
    id: 'iap-product-mapping',
    ready: hasIapProductMapping,
    manual: true,
    detail: hasIapProductMapping
      ? 'production MemberPlan Huawei product mappings were manually confirmed'
      : 'verify production MemberPlan mappings, then set HUAWEI_IAP_PRODUCT_MAPPING_VERIFIED=1',
  },
  {
    id: 'appgallery-listing',
    ready: hasAppGalleryListing,
    manual: true,
    detail: hasAppGalleryListing
      ? 'AppGallery listing and merchant-harmony release record were manually confirmed'
      : 'verify AppGallery listing and release record, then set HUAWEI_APPGALLERY_LISTING_VERIFIED=1',
  },
];

const automaticChecks = checks.filter((check) => !check.manual);
const manualChecks = checks.filter((check) => check.manual);
const automaticReady = automaticChecks.filter((check) => check.ready).length;
const manualReady = manualChecks.filter((check) => check.ready).length;
if (process.argv.includes('--json')) {
  process.stdout.write(`${JSON.stringify({
    automatic: { ready: automaticReady, total: automaticChecks.length },
    manual: { ready: manualReady, total: manualChecks.length },
    checks,
  })}\n`);
  process.exit(checks.every((check) => check.ready) ? 0 : 2);
}
process.stdout.write(
  `External readiness: automatic ${automaticReady}/${automaticChecks.length}, manual ${manualReady}/${manualChecks.length}\n`,
);
for (const check of checks) {
  const status = check.ready ? 'READY' : check.manual ? 'MANUAL' : 'PENDING';
  process.stdout.write(`${status.padEnd(7)} ${check.id}: ${check.detail}\n`);
}

// This audit intentionally never prints credential values.
process.exit(checks.every((check) => check.ready) ? 0 : 2);
