#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
harmony_home=${HARMONY_COMMAND_LINE_HOME:-/opt/harmony-command-line-tools-api26}

"$harmony_home/bin/codelinter" \
  -c "$project_root/code-linter.json5" \
  -e error,warn \
  "$project_root/entry/src/main/ets" \
  "$project_root/entry/src/ohosTest/ets"
