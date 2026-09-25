#!/bin/zsh
set -eu

repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
engine_cache="$HOME/Library/Caches/ledger-local-conversion"
runtime_bin="$HOME/.cache/codex-runtimes/codex-primary-runtime/dependencies/bin/override"
node_bin="${LEDGER_NODE_BIN:-$HOME/.local/bin/node}"

export FLYINGMOUSE_FFMPEG_PATH="${FLYINGMOUSE_FFMPEG_PATH:-$engine_cache/ffmpeg}"
export FLYINGMOUSE_LIBREOFFICE_PATH="${FLYINGMOUSE_LIBREOFFICE_PATH:-$runtime_bin/soffice}"
export FLYINGMOUSE_PDFTOPPM_PATH="${FLYINGMOUSE_PDFTOPPM_PATH:-$runtime_bin/pdftoppm}"
export FLYINGMOUSE_TESSDATA_PATH="${FLYINGMOUSE_TESSDATA_PATH:-$engine_cache/tessdata}"
export LEDGER_LOCAL_LAN_HOST="${LEDGER_LOCAL_LAN_HOST:-192.168.2.147}"
export PATH="$runtime_bin:$PATH"

for engine in "$FLYINGMOUSE_FFMPEG_PATH" "$FLYINGMOUSE_LIBREOFFICE_PATH" "$FLYINGMOUSE_PDFTOPPM_PATH"; do
  if [[ ! -x "$engine" ]]; then
    print -u2 "缺少本地转换引擎：$engine"
    exit 1
  fi
done

exec "$node_bin" "$repo_root/packages/ledger-mp/scripts/local-conversion-server.cjs"
