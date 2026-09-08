#!/usr/bin/env bash
set -euo pipefail

secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
env_file="$secure_dir/release-signing.env"
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"
bundle_name=top.ewsn.jingwei.merchant

[[ -s "$env_file" ]] || { echo 'Release signing environment is missing.' >&2; exit 1; }
[[ -s "$sign_tool" ]] || { echo "Harmony signature verifier is missing: $sign_tool" >&2; exit 1; }

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

for variable in HARMONY_SIGNING_STORE_FILE HARMONY_SIGNING_KEY_ALIAS \
  HARMONY_SIGNING_STORE_PASSWORD HARMONY_SIGNING_KEY_PASSWORD \
  HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED \
  HARMONY_SIGNING_CERT_FILE HARMONY_SIGNING_PROFILE_FILE HARMONY_AGCONNECT_FILE; do
  [[ -n ${!variable:-} ]] || { echo "Missing $variable in the secure signing environment." >&2; exit 1; }
done

node "$(dirname "$0")/signing-password-material.mjs" verify \
  --material-dir "$secure_dir" >/dev/null
for input in "$HARMONY_SIGNING_STORE_FILE" "$secure_dir/jingwei-merchant-release.csr" \
  "$HARMONY_SIGNING_CERT_FILE" "$HARMONY_SIGNING_PROFILE_FILE" "$HARMONY_AGCONNECT_FILE"; do
  [[ -s "$input" ]] || { echo "Required release material is missing: $input" >&2; exit 1; }
done

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

bash "$(dirname "$0")/extract-csr-certificate.sh" \
  "$HARMONY_SIGNING_CERT_FILE" \
  "$secure_dir/jingwei-merchant-release.csr" \
  "$scratch/application.pem"

export JW_HARMONY_STORE_PASSWORD="$HARMONY_SIGNING_STORE_PASSWORD"
keytool -list \
  -alias "$HARMONY_SIGNING_KEY_ALIAS" \
  -keystore "$HARMONY_SIGNING_STORE_FILE" \
  -storetype PKCS12 \
  -storepass:env JW_HARMONY_STORE_PASSWORD >/dev/null

java -jar "$sign_tool" verify-profile \
  -inFile "$HARMONY_SIGNING_PROFILE_FILE" \
  -outFile "$scratch/profile-verification.json" \
  >"$scratch/profile-verification.log" 2>&1 || {
    cat "$scratch/profile-verification.log" >&2
    echo 'Release Profile signature verification failed.' >&2
    exit 1
  }

node - "$scratch/profile-verification.json" "$HARMONY_AGCONNECT_FILE" "$bundle_name" <<'NODE'
const fs = require('fs')
const [profilePath, agcPath, bundleName] = process.argv.slice(2)
const profileText = fs.readFileSync(profilePath, 'utf8')
if (!profileText.includes(bundleName)) {
  throw new Error(`Release Profile does not belong to ${bundleName}`)
}
const agc = JSON.parse(fs.readFileSync(agcPath, 'utf8'))
if (!JSON.stringify(agc).includes(bundleName)) {
  throw new Error(`AGC client configuration does not belong to ${bundleName}`)
}
NODE

echo "Harmony release certificate, Profile, AGC configuration and private key binding passed for $bundle_name."
