#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}
export DEVECO_SDK_HOME=${DEVECO_SDK_HOME:-$harmony_home/sdk}
export OHOS_SDK_HOME=${OHOS_SDK_HOME:-$harmony_home/sdk}

bash "$project_root/scripts/prepare-vendored-dependencies.sh"
bash "$project_root/scripts/audit-vendored-dependency.sh"
bash "$project_root/scripts/audit-clean-room.sh"
node "$project_root/scripts/audit-secret-boundary.mjs"
node "$project_root/scripts/audit-feature-surface.mjs"
node "$project_root/scripts/audit-source-similarity.mjs"
node "$project_root/scripts/audit-i18n.mjs" --strict
node "$project_root/scripts/audit-routes.mjs"
node "$project_root/scripts/audit-theme.mjs"
node "$project_root/scripts/audit-adaptive-performance.mjs"
node "$project_root/scripts/audit-native-capabilities.mjs"
node "$project_root/scripts/audit-appgallery-compliance.mjs"
node "$project_root/scripts/audit-interactions.mjs"
node "$project_root/scripts/audit-api-contracts.mjs"
node "$project_root/scripts/audit-repository-reachability.mjs"
node "$project_root/scripts/audit-mutation-safety.mjs"
node "$project_root/scripts/audit-test-coverage.mjs"
node "$project_root/scripts/validate-device-test-result.mjs" --self-test
node "$project_root/scripts/audit-sbom.mjs"
bash "$project_root/scripts/lint.sh"

# 生成可安装到测试设备的 Hypium 测试 HAP。命令行环境没有已连接的
# HarmonyOS NEXT 设备时只能完成编译；接入设备后由 device-smoke.sh
# 强制执行完整测试并校验最终测试数量及零失败结果。
"$harmony_home/bin/hvigorw" --mode module \
  -p module=entry@ohosTest \
  -p product=default \
  -p isOhosTest=true \
  -p buildMode=test \
  assembleHap
bash "$project_root/scripts/audit-vendored-dependency.sh" --expected-build-mode test

test_hap=$(find "$project_root/entry/build" -type f -path '*outputs/ohosTest*' -name '*.hap' -print -quit)
bash "$project_root/scripts/inspect-test-hap.sh" "$test_hap" --allow-unsigned
printf '%s\n' "$test_hap"
