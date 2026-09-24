#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
env_file="$secure_dir/release-signing.env"
build_profile="$project_root/build-profile.json5"
agconnect_target="$project_root/entry/agconnect-services.json"
evidence_output=${HARMONY_RELEASE_EVIDENCE_OUTPUT:-$project_root/artifacts/release/1.0.0/release-evidence.json}
scratch=$(mktemp -d)
profile_backup="$scratch/build-profile.json5"
agconnect_backup="$scratch/agconnect-services.json"
had_agconnect=0
restored=0

cp "$build_profile" "$profile_backup"
if [[ -f "$agconnect_target" ]]; then
  cp "$agconnect_target" "$agconnect_backup"
  had_agconnect=1
fi

restore_sources() {
  if [[ $restored == 1 ]]; then return; fi
  install -m 644 "$profile_backup" "$build_profile"
  if [[ $had_agconnect == 1 ]]; then
    install -m 600 "$agconnect_backup" "$agconnect_target"
  else
    rm -f "$agconnect_target"
  fi
  restored=1
}

cleanup() {
  restore_sources
  rm -rf "$scratch"
}
trap cleanup EXIT

[[ -f "$env_file" ]] || {
  echo "Signing environment is missing. Run scripts/bootstrap-release-signing.sh first." >&2
  exit 1
}

set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

for variable in HARMONY_SIGNING_STORE_FILE HARMONY_SIGNING_KEY_ALIAS \
  HARMONY_SIGNING_STORE_PASSWORD HARMONY_SIGNING_KEY_PASSWORD \
  HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED \
  HARMONY_SIGNING_CERT_FILE HARMONY_SIGNING_PROFILE_FILE HARMONY_AGCONNECT_FILE; do
  [[ -n ${!variable:-} ]] || { echo "Missing $variable in $env_file" >&2; exit 1; }
done
for input in "$HARMONY_SIGNING_STORE_FILE" "$HARMONY_SIGNING_CERT_FILE" \
  "$HARMONY_SIGNING_PROFILE_FILE" "$HARMONY_AGCONNECT_FILE"; do
  [[ -s "$input" ]] || { echo "Required release material is missing: $input" >&2; exit 1; }
done

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/verify-release-materials.sh"

node - "$build_profile" <<'NODE'
const fs = require('fs')
const path = process.argv[2]
const profile = JSON.parse(fs.readFileSync(path, 'utf8'))
profile.app.signingConfigs = [{
  name: 'release',
  type: 'HarmonyOS',
  material: {
    certpath: process.env.HARMONY_SIGNING_CERT_FILE,
    storePassword: process.env.HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED,
    keyAlias: process.env.HARMONY_SIGNING_KEY_ALIAS,
    keyPassword: process.env.HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED,
    profile: process.env.HARMONY_SIGNING_PROFILE_FILE,
    signAlg: 'SHA256withECDSA',
    storeFile: process.env.HARMONY_SIGNING_STORE_FILE,
  },
}]
for (const product of profile.app.products || []) {
  product.signingConfig = 'release'
  product.buildOption ??= {}
  product.buildOption.packOptions ??= {}
  // Hvigor only repacks the App Pack with signed inner HAP/HSP packages when
  // this official option is enabled. The resulting release candidate is the
  // distinct *-all-signed.app output.
  product.buildOption.packOptions.appWithSignedPkg = true
}
fs.writeFileSync(path, `${JSON.stringify(profile, null, 2)}\n`, { mode: 0o600 })
NODE
chmod 600 "$build_profile"
install -m 600 "$HARMONY_AGCONNECT_FILE" "$agconnect_target"

SKIP_RELEASE_EVIDENCE=1 bash "$project_root/scripts/build-release.sh"

mapfile -t test_haps < <(find "$project_root/entry/build" -type f \
  -path '*outputs/ohosTest*' -name '*-signed.hap' -print | sort)
mapfile -t haps < <(find "$project_root/entry/build" -type f \
  -path '*outputs/default*' -name '*-signed.hap' -print | sort)
mapfile -t app_packs < <(find "$project_root/build/outputs/default" -type f \
  -name '*-all-signed.app' -print | sort)

[[ ${#test_haps[@]} -eq 1 ]] || {
  echo "Expected exactly one signed Hypium HAP, found ${#test_haps[@]}." >&2
  exit 1
}
[[ ${#haps[@]} -eq 1 ]] || {
  echo "Expected exactly one signed release HAP, found ${#haps[@]}." >&2
  exit 1
}
[[ ${#app_packs[@]} -eq 1 ]] || {
  echo "Expected exactly one fully signed App Pack, found ${#app_packs[@]}." >&2
  exit 1
}
test_hap=${test_haps[0]}
hap=${haps[0]}
app_pack=${app_packs[0]}

bash "$project_root/scripts/inspect-test-hap.sh" "$test_hap" --require-signed
bash "$project_root/scripts/inspect-hap.sh" "$hap" --require-signed
bash "$project_root/scripts/inspect-app-pack.sh" "$app_pack" --require-signed

# Remove the transient password-bearing profile and AGC copy before hashing
# the source tree or generating distributable release evidence.
restore_sources

node "$project_root/scripts/generate-release-evidence.mjs" \
  --hap "$hap" \
  --app-pack "$app_pack" \
  --test-hap "$test_hap" \
  --output "$evidence_output"

node - "$evidence_output" <<'NODE'
const evidence = require(process.argv[2])
if (evidence.releaseState !== 'signed-release-candidate') {
  throw new Error(`Expected signed release evidence, got ${evidence.releaseState}`)
}
NODE

artifact_dir=${HARMONY_SIGNED_ARTIFACT_DIR:-$secure_dir/artifacts/1.0.0}
mkdir -p "$artifact_dir"
chmod 700 "$artifact_dir"
if [[ "$artifact_dir" == "$secure_dir"/artifacts/* ]]; then
  chmod 700 "$secure_dir/artifacts"
fi
install -m 600 "$hap" "$artifact_dir/jingwei-merchant-1.0.0-1000000-release.hap"
install -m 600 "$test_hap" "$artifact_dir/jingwei-merchant-1.0.0-1000000-ohosTest.hap"
install -m 600 "$app_pack" "$artifact_dir/jingwei-merchant-1.0.0-1000000-release.app"
(
  cd "$artifact_dir"
  sha256sum *.hap *.app > SHA256SUMS
  chmod 600 SHA256SUMS
)

echo "Signed Harmony release candidate created and verified."
echo "Secure artifacts: $artifact_dir"
