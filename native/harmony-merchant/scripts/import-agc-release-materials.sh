#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <application.cer> <release-profile.p7b> <agconnect-services.json>" >&2
  exit 2
fi

secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
env_file="$secure_dir/release-signing.env"
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"

for input in "$@"; do
  [[ -s "$input" ]] || { echo "Required AGC material is missing or empty: $input" >&2; exit 1; }
done
application_cert=$(realpath "$1")
release_profile=$(realpath "$2")
agconnect_source=$(realpath "$3")

if [[ ! -f "$env_file" ]]; then
  echo "Signing environment is missing; run bootstrap-release-signing.sh first." >&2
  exit 1
fi
[[ -s "$sign_tool" ]] || { echo "Harmony signature verifier is missing: $sign_tool" >&2; exit 1; }

# The generated file is owned by this tool, mode 0600, and contains only the
# paths/password created for this isolated signing directory.
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

umask 077
mkdir -p "$secure_dir"
scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
bash "$(dirname "$0")/extract-csr-certificate.sh" \
  "$application_cert" \
  "$secure_dir/jingwei-merchant-release.csr" \
  "$scratch/application.pem"

java -jar "$sign_tool" verify-profile \
  -inFile "$release_profile" \
  -outFile "$scratch/profile-verification.json" \
  >"$scratch/profile-verification.log" 2>&1 || {
    cat "$scratch/profile-verification.log" >&2
    echo 'AGC Release Profile signature verification failed.' >&2
    exit 1
  }

node - "$scratch/profile-verification.json" "$agconnect_source" <<'NODE'
const fs = require('fs')
const profile = fs.readFileSync(process.argv[2], 'utf8')
if (!profile.includes('top.ewsn.jingwei.merchant')) {
  throw new Error('Release Profile does not belong to top.ewsn.jingwei.merchant')
}
const config = JSON.parse(fs.readFileSync(process.argv[3], 'utf8'))
const source = JSON.stringify(config)
if (!source.includes('top.ewsn.jingwei.merchant')) {
  throw new Error('AGC client configuration does not belong to top.ewsn.jingwei.merchant')
}
NODE

install -m 600 "$application_cert" "$secure_dir/harmony-application.cer"
install -m 600 "$release_profile" "$secure_dir/harmony-release-profile.p7b"
install -m 600 "$agconnect_source" "$secure_dir/agconnect-services.json"

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$(dirname "$0")/verify-release-materials.sh"

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$(dirname "$0")/write-signing-manifest.sh"

echo "AGC release materials imported and bound to the CSR private key."
echo "Secure directory: $secure_dir"
echo "Next step: bash scripts/build-signed-release.sh"
