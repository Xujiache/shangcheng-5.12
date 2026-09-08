#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"
scratch=$(mktemp -d /tmp/jingwei-harmony-signing-pipeline.XXXXXX)
secure_dir="$scratch/secure"
entry_outputs="$project_root/entry/build/default/outputs"
app_outputs="$project_root/build/outputs/default"
entry_outputs_backup="$scratch/entry-outputs-before-test"
app_outputs_backup="$scratch/app-outputs-before-test"
had_entry_outputs=0
had_app_outputs=0
password='jingwei-ephemeral-pipeline-test'
keystore="$secure_dir/release-key.p12"
csr="$secure_dir/jingwei-merchant-release.csr"
app_cert="$secure_dir/harmony-application.cer"
profile="$secure_dir/harmony-release-profile.p7b"
agc="$secure_dir/agconnect-services.json"
profile_json="$scratch/profile.json"
evidence="$scratch/release-evidence.json"
artifact_dir="$scratch/artifacts"
profile_before=$(sha256sum "$project_root/build-profile.json5" | awk '{print $1}')

# The signing test invokes the real Hvigor output directories. Preserve their
# exact pre-test state so a package signed by the disposable test CA can never
# be mistaken for a release artifact after the test has destroyed its keys.
if [[ -d "$entry_outputs" ]]; then
  mkdir -p "$entry_outputs_backup"
  cp -a "$entry_outputs/." "$entry_outputs_backup/"
  had_entry_outputs=1
fi
if [[ -d "$app_outputs" ]]; then
  mkdir -p "$app_outputs_backup"
  cp -a "$app_outputs/." "$app_outputs_backup/"
  had_app_outputs=1
fi

restore_build_outputs() {
  rm -rf "$entry_outputs" "$app_outputs"
  if [[ $had_entry_outputs == 1 ]]; then
    mkdir -p "$entry_outputs"
    cp -a "$entry_outputs_backup/." "$entry_outputs/"
  fi
  if [[ $had_app_outputs == 1 ]]; then
    mkdir -p "$app_outputs"
    cp -a "$app_outputs_backup/." "$app_outputs/"
  fi
}

cleanup() {
  restore_build_outputs
  rm -rf "$scratch"
}
trap cleanup EXIT

[[ -s "$sign_tool" ]] || { echo "Harmony signature tool is missing: $sign_tool" >&2; exit 1; }
umask 077
mkdir -p "$secure_dir"

root_subject='C=CN,O=Jingwei Pipeline,OU=Test,CN=Jingwei Test Root CA'
app_ca_subject='C=CN,O=Jingwei Pipeline,OU=Test,CN=Jingwei Test Application CA'
profile_ca_subject='C=CN,O=Jingwei Pipeline,OU=Test,CN=Jingwei Test Profile CA'

java -jar "$sign_tool" generate-ca \
  -keyAlias test-root-ca -keyPwd "$password" \
  -keyAlg ECC -keySize NIST-P-256 \
  -subject "$root_subject" -validity 30 \
  -signAlg SHA256withECDSA \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outFile "$scratch/root-ca.cer" >/dev/null
java -jar "$sign_tool" generate-ca \
  -keyAlias test-app-ca -keyPwd "$password" \
  -keyAlg ECC -keySize NIST-P-256 \
  -issuer "$root_subject" -issuerKeyAlias test-root-ca -issuerKeyPwd "$password" \
  -subject "$app_ca_subject" -validity 30 \
  -signAlg SHA256withECDSA \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outFile "$scratch/app-ca.cer" >/dev/null
java -jar "$sign_tool" generate-ca \
  -keyAlias test-profile-ca -keyPwd "$password" \
  -keyAlg ECC -keySize NIST-P-256 \
  -issuer "$root_subject" -issuerKeyAlias test-root-ca -issuerKeyPwd "$password" \
  -subject "$profile_ca_subject" -validity 30 \
  -signAlg SHA256withECDSA \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outFile "$scratch/profile-ca.cer" >/dev/null
java -jar "$sign_tool" generate-keypair \
  -keyAlias test-app-release -keyPwd "$password" \
  -keyAlg ECC -keySize NIST-P-256 \
  -keystoreFile "$keystore" -keystorePwd "$password" >/dev/null
java -jar "$sign_tool" generate-keypair \
  -keyAlias test-profile-release -keyPwd "$password" \
  -keyAlg ECC -keySize NIST-P-256 \
  -keystoreFile "$keystore" -keystorePwd "$password" >/dev/null

java -jar "$sign_tool" generate-app-cert \
  -keyAlias test-app-release -keyPwd "$password" \
  -issuer "$app_ca_subject" -issuerKeyAlias test-app-ca -issuerKeyPwd "$password" \
  -subject 'C=CN,O=Jingwei Pipeline,OU=Test,CN=Jingwei Merchant Test Release' \
  -validity 30 -signAlg SHA256withECDSA \
  -rootCaCertFile "$scratch/root-ca.cer" -subCaCertFile "$scratch/app-ca.cer" \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outForm certChain -outFile "$app_cert" >/dev/null
java -jar "$sign_tool" generate-profile-cert \
  -keyAlias test-profile-release -keyPwd "$password" \
  -issuer "$profile_ca_subject" -issuerKeyAlias test-profile-ca -issuerKeyPwd "$password" \
  -subject 'C=CN,O=Jingwei Pipeline,OU=Test,CN=Jingwei Profile Test Release' \
  -validity 30 -signAlg SHA256withECDSA \
  -rootCaCertFile "$scratch/root-ca.cer" -subCaCertFile "$scratch/profile-ca.cer" \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outForm certChain -outFile "$scratch/profile-cert.pem" >/dev/null

export JW_PIPELINE_PASSWORD="$password"
keytool -certreq \
  -alias test-app-release -sigalg SHA256withECDSA -rfc \
  -file "$csr" -keystore "$keystore" -storetype PKCS12 \
  -storepass:env JW_PIPELINE_PASSWORD >/dev/null
bash "$project_root/scripts/extract-csr-certificate.sh" \
  "$app_cert" "$csr" "$scratch/application-leaf.pem"

node - "$scratch/application-leaf.pem" "$profile_json" <<'NODE'
const fs = require('fs')
const crypto = require('crypto')
const certificate = fs.readFileSync(process.argv[2], 'utf8')
const now = Math.floor(Date.now() / 1000)
const profile = {
  'version-name': '1.0.0',
  'version-code': 1000000,
  'app-distribution-type': 'os_integration',
  uuid: crypto.randomUUID(),
  validity: { 'not-before': now - 60, 'not-after': now + 86400 },
  type: 'release',
  'bundle-info': {
    'developer-id': 'jingwei-pipeline-test',
    'distribution-certificate': certificate,
    'bundle-name': 'top.ewsn.jingwei.merchant',
    apl: 'normal',
    'app-feature': 'hos_normal_app',
  },
  acls: { 'allowed-acls': [''] },
  permissions: { 'restricted-permissions': [] },
  issuer: 'pki_internal',
}
fs.writeFileSync(process.argv[3], `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 })
NODE

java -jar "$sign_tool" sign-profile \
  -mode localSign -keyAlias test-profile-release -keyPwd "$password" \
  -profileCertFile "$scratch/profile-cert.pem" \
  -inFile "$profile_json" -signAlg SHA256withECDSA \
  -keystoreFile "$keystore" -keystorePwd "$password" \
  -outFile "$profile" >/dev/null

node - "$agc" <<'NODE'
const fs = require('fs')
fs.writeFileSync(process.argv[2], `${JSON.stringify({
  client: [{ client_info: { package_name: 'top.ewsn.jingwei.merchant' } }],
  configuration_version: 'pipeline-test-only',
}, null, 2)}\n`, { mode: 0o600 })
NODE

node - "$secure_dir/release-signing.env" "$secure_dir" "$password" <<'NODE'
const fs = require('fs')
const [path, root, password] = process.argv.slice(2)
const lines = [
  `HARMONY_SIGNING_STORE_FILE=${root}/release-key.p12`,
  'HARMONY_SIGNING_KEY_ALIAS=test-app-release',
  `HARMONY_SIGNING_STORE_PASSWORD=${password}`,
  `HARMONY_SIGNING_KEY_PASSWORD=${password}`,
  `HARMONY_SIGNING_CERT_FILE=${root}/harmony-application.cer`,
  `HARMONY_SIGNING_PROFILE_FILE=${root}/harmony-release-profile.p7b`,
  `HARMONY_AGCONNECT_FILE=${root}/agconnect-services.json`,
]
fs.writeFileSync(path, `${lines.join('\n')}\n`, { mode: 0o600 })
NODE

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/prepare-signing-password-encryption.sh"

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/verify-release-materials.sh"
HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
HARMONY_RELEASE_EVIDENCE_OUTPUT="$evidence" \
HARMONY_SIGNED_ARTIFACT_DIR="$artifact_dir" \
  bash "$project_root/scripts/build-signed-release.sh"

node - "$evidence" <<'NODE'
const evidence = require(process.argv[2])
if (evidence.releaseState !== 'signed-release-candidate') {
  throw new Error(`Synthetic signing pipeline did not produce signed evidence: ${evidence.releaseState}`)
}
if (!evidence.artifacts.hap.cryptographicallySigned
  || !evidence.artifacts.appPack.cryptographicallySigned
  || !evidence.artifacts.appPack.embeddedHap.cryptographicallySigned) {
  throw new Error('Synthetic signing pipeline left an unsigned release artifact')
}
NODE

profile_after=$(sha256sum "$project_root/build-profile.json5" | awk '{print $1}')
[[ "$profile_before" == "$profile_after" ]] || {
  echo 'Signed pipeline did not restore build-profile.json5.' >&2
  exit 1
}
[[ ! -e "$project_root/entry/agconnect-services.json" ]] || {
  echo 'Signed pipeline left AGC client configuration in the repository.' >&2
  exit 1
}

echo 'Ephemeral Harmony signed-release pipeline passed; test keys and artifacts were destroyed.'
