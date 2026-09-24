#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
hap=${1:-$project_root/entry/build/default/outputs/ohosTest/entry-ohosTest-unsigned.hap}
mode=${2:---allow-unsigned}
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"

if [[ ! -f "$hap" ]]; then
  echo "ERROR: Hypium test HAP not found: $hap" >&2
  exit 1
fi

metadata=$(unzip -p "$hap" module.json)
compact_metadata=$(printf '%s' "$metadata" | tr -d '[:space:]')

require_fragment() {
  local fragment=$1
  local label=$2
  if [[ "$compact_metadata" != *"$fragment"* ]]; then
    echo "ERROR: packaged Hypium HAP has unexpected $label." >&2
    exit 1
  fi
}

require_fragment '"bundleName":"top.ewsn.jingwei.merchant"' 'bundle name'
require_fragment '"name":"entry_test"' 'module name'
require_fragment '"type":"feature"' 'module type'
require_fragment '"mainElement":"TestAbility"' 'test ability'
require_fragment '"versionName":"1.0.0"' 'version name'
require_fragment '"versionCode":1000000' 'version code'
require_fragment '"minAPIVersion":60001021' 'minimum API version'
require_fragment '"targetAPIVersion":260000026' 'target API version'
require_fragment '"deviceTypes":["phone","tablet","2in1"]' 'device types'

if [[ ! -f "$sign_tool" ]]; then
  echo "ERROR: Harmony signature verifier not found: $sign_tool" >&2
  exit 1
fi

verify_dir=$(mktemp -d)
trap 'rm -rf "$verify_dir"' EXIT
if java -jar "$sign_tool" verify-app \
  -inFile "$hap" \
  -outCertChain "$verify_dir/cert-chain.cer" \
  -outProfile "$verify_dir/profile.p7b" \
  >"$verify_dir/verify.log" 2>&1; then
  signed=true
else
  signed=false
fi

if [[ "$signed" != true ]]; then
  if [[ "$mode" == '--require-signed' ]]; then
    cat "$verify_dir/verify.log" >&2
    echo 'ERROR: device execution requires a cryptographically signed Hypium HAP.' >&2
    exit 1
  fi
  echo 'WARNING: Hypium HAP is cryptographically unsigned and cannot run on a production device.' >&2
else
  echo 'Hypium HAP signature verification passed.'
fi

size=$(stat --printf='%s' "$hap")
sha=$(sha256sum "$hap" | awk '{print $1}')
echo "Hypium HAP metadata passed: size=$size sha256=$sha path=$hap"
