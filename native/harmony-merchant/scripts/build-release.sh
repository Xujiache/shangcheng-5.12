#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
export DEVECO_SDK_HOME=${DEVECO_SDK_HOME:-$harmony_home/sdk}
export OHOS_SDK_HOME=${OHOS_SDK_HOME:-$harmony_home/sdk}
reports_dir="$project_root/reports/release"
mkdir -p "$reports_dir"

bash "$project_root/scripts/prepare-vendored-dependencies.sh"
bash "$project_root/scripts/audit-vendored-dependency.sh"
bash "$project_root/scripts/audit-clean-room.sh"
node "$project_root/scripts/audit-secret-boundary.mjs"
node "$project_root/scripts/audit-feature-surface.mjs"
node "$project_root/scripts/audit-source-similarity.mjs"
node "$project_root/scripts/audit-i18n.mjs" --strict
node "$project_root/scripts/audit-routes.mjs"
node "$project_root/scripts/audit-theme.mjs"
node "$project_root/scripts/audit-home-icons.mjs"
node "$project_root/scripts/audit-adaptive-performance.mjs"
node "$project_root/scripts/audit-native-capabilities.mjs"
node "$project_root/scripts/audit-appgallery-compliance.mjs"
node "$project_root/scripts/audit-interactions.mjs"
node "$project_root/scripts/audit-api-contracts.mjs"
node "$project_root/scripts/audit-server-route-parity.mjs" \
  --server-root "${BACKEND_SOURCE_ROOT:-$project_root/../../packages/server/src}"
node "$project_root/scripts/audit-repository-reachability.mjs"
node "$project_root/scripts/audit-mutation-safety.mjs"
node "$project_root/scripts/audit-test-coverage.mjs"
node "$project_root/scripts/audit-sbom.mjs"
bash "$project_root/scripts/lint.sh"
"$harmony_home/bin/ohpm" install --all
"$harmony_home/bin/hvigorw" clean --no-daemon
"$harmony_home/bin/hvigorw" --mode module \
  -p module=entry@ohosTest \
  -p product=default \
  -p isOhosTest=true \
  -p buildMode=test \
  assembleHap \
  --no-daemon 2>&1 | tee "$reports_dir/ohos-test-build.log"
node "$project_root/scripts/audit-compiler-warnings.mjs" "$reports_dir/ohos-test-build.log"
test_hap=$(find "$project_root/entry/build" -type f -path '*outputs/ohosTest*' -name '*.hap' -print -quit)
bash "$project_root/scripts/inspect-test-hap.sh" "$test_hap" --allow-unsigned
"$harmony_home/bin/hvigorw" assembleApp \
  -p product=default \
  -p buildMode=release \
  --no-daemon 2>&1 | tee "$reports_dir/release-build.log"
node "$project_root/scripts/audit-compiler-warnings.mjs" "$reports_dir/release-build.log"
bash "$project_root/scripts/audit-vendored-dependency.sh" --expected-build-mode release

hap=$(find "$project_root/entry/build" -type f -path '*outputs/default*' -name '*.hap' -print -quit)
bash "$project_root/scripts/audit-packaged-runtime.sh" "$hap"
bash "$project_root/scripts/inspect-hap.sh" "$hap" --allow-unsigned
app_pack=$(find "$project_root/build/outputs/default" -type f -name '*.app' -print -quit)
bash "$project_root/scripts/inspect-app-pack.sh" "$app_pack" --allow-unsigned
if [[ ${SKIP_RELEASE_EVIDENCE:-0} != 1 ]]; then
  node "$project_root/scripts/generate-release-evidence.mjs" \
    --hap "$hap" \
    --app-pack "$app_pack" \
    --test-hap "$test_hap"
fi
