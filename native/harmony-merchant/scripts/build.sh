#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
export DEVECO_SDK_HOME=${DEVECO_SDK_HOME:-$harmony_home/sdk}
export OHOS_SDK_HOME=${OHOS_SDK_HOME:-$harmony_home/sdk}

bash "$project_root/scripts/prepare-vendored-dependencies.sh"
bash "$project_root/scripts/audit-clean-room.sh"
node "$project_root/scripts/audit-feature-surface.mjs"
node "$project_root/scripts/audit-source-similarity.mjs"
node "$project_root/scripts/audit-i18n.mjs" --strict
node "$project_root/scripts/audit-routes.mjs"
node "$project_root/scripts/audit-theme.mjs"
node "$project_root/scripts/audit-home-icons.mjs"
node "$project_root/scripts/audit-adaptive-performance.mjs"
node "$project_root/scripts/audit-interactions.mjs"
node "$project_root/scripts/audit-api-contracts.mjs"
node "$project_root/scripts/audit-repository-reachability.mjs"
node "$project_root/scripts/audit-mutation-safety.mjs"
node "$project_root/scripts/audit-test-coverage.mjs"
node "$project_root/scripts/audit-sbom.mjs"
bash "$project_root/scripts/lint.sh"
"$harmony_home/bin/ohpm" install --all
"$harmony_home/bin/hvigorw" assembleHap --mode module -p product=default --no-daemon

find "$project_root/entry/build" -type f -name '*.hap' -print
