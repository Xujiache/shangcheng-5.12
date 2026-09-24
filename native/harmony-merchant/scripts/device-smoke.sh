#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
hdc=${HDC_BIN:-$harmony_home/sdk/default/openharmony/toolchains/hdc}
sign_tool="$harmony_home/sdk/default/openharmony/toolchains/lib/hap-sign-tool.jar"
bundle_name=top.ewsn.jingwei.merchant
device_class=${HARMONY_DEVICE_CLASS:-}

if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: HARMONY_DEVICE_CLASS=phone|foldable|tablet $0 <signed-release.hap> [signed-ohos-test.hap]" >&2
  exit 2
fi
if [[ "$device_class" != phone && "$device_class" != foldable && "$device_class" != tablet ]]; then
  echo 'ERROR: set HARMONY_DEVICE_CLASS to phone, foldable or tablet for auditable device evidence.' >&2
  exit 2
fi
if [[ ! -x "$hdc" ]]; then
  echo "ERROR: hdc is unavailable: $hdc" >&2
  exit 2
fi

hap=$(realpath "$1")
test_hap=${2:-}
if [[ -z "$test_hap" ]]; then
  test_hap=$(find "$project_root/entry/build" -type f -path '*outputs/ohosTest*' -name '*.hap' -print -quit)
fi
if [[ -z "$test_hap" || ! -f "$test_hap" ]]; then
  echo 'ERROR: a signed Hypium ohosTest HAP is required for device acceptance.' >&2
  exit 2
fi
test_hap=$(realpath "$test_hap")
bash "$project_root/scripts/inspect-hap.sh" "$hap" --require-signed
bash "$project_root/scripts/inspect-test-hap.sh" "$test_hap" --require-signed

signature_dir=$(mktemp -d)
trap 'rm -rf "$signature_dir"' EXIT
java -jar "$sign_tool" verify-app \
  -inFile "$hap" \
  -outCertChain "$signature_dir/app-cert-chain.cer" \
  -outProfile "$signature_dir/app-profile.p7b" \
  > "$signature_dir/app-verify.log" 2>&1
java -jar "$sign_tool" verify-app \
  -inFile "$test_hap" \
  -outCertChain "$signature_dir/test-cert-chain.cer" \
  -outProfile "$signature_dir/test-profile.p7b" \
  > "$signature_dir/test-verify.log" 2>&1
if ! cmp -s "$signature_dir/app-cert-chain.cer" "$signature_dir/test-cert-chain.cer"; then
  echo 'ERROR: release and Hypium HAPs were not signed by the same certificate chain.' >&2
  exit 2
fi

targets=$($hdc list targets | sed '/^\[Empty\]$/d;/^[[:space:]]*$/d')
if [[ -z "$targets" ]]; then
  echo 'ERROR: no HarmonyOS NEXT device is connected.' >&2
  exit 3
fi

target=${HDC_TARGET:-}
if [[ -z "$target" ]]; then
  target_count=$(printf '%s\n' "$targets" | wc -l | tr -d ' ')
  if [[ "$target_count" != '1' ]]; then
    echo 'ERROR: multiple devices are connected; set HDC_TARGET explicitly.' >&2
    printf '%s\n' "$targets" >&2
    exit 3
  fi
  target=$(printf '%s\n' "$targets" | head -n 1 | awk '{print $1}')
fi

run_hdc() {
  "$hdc" -t "$target" "$@"
}

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
evidence_dir="$project_root/artifacts/device-smoke/$timestamp"
mkdir -p "$evidence_dir"
sha256sum "$hap" > "$evidence_dir/artifact.sha256"
sha256sum "$test_hap" > "$evidence_dir/test-artifact.sha256"
sha256sum "$signature_dir/app-cert-chain.cer" > "$evidence_dir/signing-certificate.sha256"
printf '%s\n' "$target" > "$evidence_dir/target.txt"
$hdc list targets -v > "$evidence_dir/targets.txt"
run_hdc shell param get const.product.model > "$evidence_dir/device-model.txt" 2>&1 || true
run_hdc shell param get const.product.software.version > "$evidence_dir/system-version.txt" 2>&1 || true

run_hdc install -r "$hap" "$test_hap" | tee "$evidence_dir/install.txt"
expected_tests=$(rg -c "^[[:space:]]*it\(" "$project_root/entry/src/ohosTest/ets/test/CoreLogic.test.ets")
run_hdc shell aa test \
  -b "$bundle_name" \
  -m entry_test \
  -s unittest /ets/testrunner/OpenHarmonyTestRunner \
  -s timeout 120000 \
  | tee "$evidence_dir/hypium-output.txt"
node "$project_root/scripts/validate-device-test-result.mjs" \
  "$evidence_dir/hypium-output.txt" "$expected_tests" \
  > "$evidence_dir/hypium-summary.json"
run_hdc shell aa force-stop "$bundle_name" > "$evidence_dir/force-stop.txt" 2>&1 || true
run_hdc shell aa start -a EntryAbility -b "$bundle_name" | tee "$evidence_dir/start.txt"
sleep 3
run_hdc shell bm dump -n "$bundle_name" > "$evidence_dir/bundle-dump.txt"
run_hdc shell "pidof $bundle_name || ps -A | grep $bundle_name" > "$evidence_dir/process.txt"

if [[ ! -s "$evidence_dir/process.txt" ]]; then
  echo 'ERROR: the application process did not remain alive after launch.' >&2
  exit 4
fi

node "$project_root/scripts/write-device-smoke-evidence.mjs" \
  --evidence-dir "$evidence_dir" \
  --device-class "$device_class" \
  --target "$target" \
  --hap "$hap" \
  --test-hap "$test_hap"

echo "Device Hypium execution and smoke launch passed. Evidence: $evidence_dir"
