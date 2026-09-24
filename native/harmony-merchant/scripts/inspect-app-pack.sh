#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
app_pack=${1:-$project_root/build/outputs/default/jingwei-merchant-harmony-default-unsigned.app}
mode=${2:---allow-unsigned}
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"

if [[ ! -f "$app_pack" ]]; then
  echo "ERROR: App Pack not found: $app_pack" >&2
  exit 1
fi

entries=$(unzip -Z1 "$app_pack")
if [[ "$entries" != *$'pack.info'* || "$entries" != *$'pac.json'* ]]; then
  echo 'ERROR: App Pack does not contain pack.info and pac.json.' >&2
  exit 1
fi

embedded_haps=$(printf '%s\n' "$entries" | awk '/\.hap$/ { print }')
hap_count=$(printf '%s\n' "$embedded_haps" | awk 'NF { count += 1 } END { print count + 0 }')
if [[ "$hap_count" -ne 1 ]]; then
  echo "ERROR: expected exactly one entry HAP in App Pack, found $hap_count." >&2
  exit 1
fi
embedded_hap=$(printf '%s\n' "$embedded_haps" | head -n 1)
if [[ "$embedded_hap" == /* || "$embedded_hap" == *'..'* ]]; then
  echo 'ERROR: App Pack contains an unsafe HAP path.' >&2
  exit 1
fi

metadata=$(unzip -p "$app_pack" pack.info | tr -d '[:space:]')
require_fragment() {
  local fragment=$1
  local label=$2
  if [[ "$metadata" != *"$fragment"* ]]; then
    echo "ERROR: packaged App Pack has unexpected $label." >&2
    exit 1
  fi
}

require_fragment '"bundleName":"top.ewsn.jingwei.merchant"' 'bundle name'
require_fragment '"code":1000000' 'version code'
require_fragment '"name":"1.0.0"' 'version name'
require_fragment '"moduleType":"entry"' 'module type'
require_fragment '"moduleName":"entry"' 'module name'
require_fragment '"compatible":21' 'compatible API version'
require_fragment '"target":26' 'target API version'
require_fragment '"deviceType":["phone","tablet","2in1"]' 'device types'

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT

if [[ ! -f "$sign_tool" ]]; then
  echo "ERROR: Harmony signature verifier not found: $sign_tool" >&2
  exit 1
fi
if java -jar "$sign_tool" verify-app \
  -inFile "$app_pack" \
  -inForm zip \
  -outCertChain "$scratch/app-cert-chain.cer" \
  -outProfile "$scratch/app-profile.p7b" \
  >"$scratch/app-verify.log" 2>&1; then
  app_signed=true
else
  app_signed=false
fi
if [[ "$app_signed" != true ]]; then
  if [[ "$mode" == '--require-signed' ]]; then
    cat "$scratch/app-verify.log" >&2
    echo 'ERROR: public release verification requires a cryptographically signed App Pack container.' >&2
    exit 1
  fi
  echo 'WARNING: App Pack container is cryptographically unsigned and cannot be submitted to AppGallery.' >&2
else
  echo 'App Pack container signature verification passed.'
fi

unzip -q "$app_pack" "$embedded_hap" -d "$scratch"
bash "$project_root/scripts/inspect-hap.sh" "$scratch/$embedded_hap" "$mode"

size=$(stat --printf='%s' "$app_pack")
sha=$(sha256sum "$app_pack" | awk '{print $1}')
echo "Release App Pack metadata passed: size=$size sha256=$sha path=$app_pack"
