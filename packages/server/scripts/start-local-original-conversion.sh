#!/usr/bin/env bash
set -euo pipefail

script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(cd "$script_dir/../../.." && pwd)"
server_dir="$repo_root/packages/server"
engine_root="${CONVERSION_ENGINE_ROOT:-$HOME/Library/Caches/ledger-flyingmouse-engines/darwin-arm64}"
qpdf_root="${CONVERSION_QPDF_ROOT:-$HOME/Library/Caches/ledger-qpdf-osx-arm64}"
raw_path="${CONVERSION_DCRAW_PATH:-$HOME/Library/Caches/LibRaw-0.21.5/bin/dcraw_emu}"
structure_python="${CONVERSION_DOCSTRUCTURE_PYTHON:-$HOME/Library/Caches/ledger-flyingmouse-engines/docstructure-venv/bin/python}"
structure_models="${CONVERSION_DOCSTRUCTURE_MODEL_DIR:-$HOME/Library/Caches/ledger-flyingmouse-engines/docstructure-models/models}"
runtime_source="${FLYINGMOUSE_RUNTIME_SOURCE_DIR:-$HOME/Library/Caches/ledger-flyingmouse-engines/runtime-a7b9b15-platform-v8}"
ofd_font_dir="${FLYINGMOUSE_OFD_FONT_DIR:-$HOME/Library/Caches/ledger-flyingmouse-engines/ofd-fonts}"

test "$(uname -s)" = Darwin
test -f "$server_dir/.env"
test -x "$engine_root/runtime/bin/ffmpeg"
test -x "$engine_root/runtime/bin/pdftoppm"
test -x "$engine_root/libreoffice/LibreOffice.app/Contents/MacOS/soffice"
test -f "$ofd_font_dir/NotoSansSC-Regular.ttf"
node --env-file="$server_dir/.env" -e 'for (const key of ["DATABASE_URL", "REDIS_URL", "S3_ENDPOINT"]) { const host = new URL(process.env[key]).hostname; if (!["127.0.0.1", "localhost"].includes(host)) throw new Error(`${key} must be local`) } if (process.env.NODE_ENV === "production") throw new Error("Development environment required"); if (!/^[0-9a-fA-F]{64}$/.test(process.env.CONVERSION_PASSWORD_KEY || "")) throw new Error("CONVERSION_PASSWORD_KEY must be 32-byte hex")'
node "$repo_root/scripts/apply-flyingmouse-platform-fixes.cjs" --copy "$runtime_source"
(cd "$repo_root" && corepack pnpm --filter @jiujiu/server build)

export CONVERSION_FEATURE_ENABLED=true
export FLYINGMOUSE_SOURCE_DIR="$runtime_source"
export FLYINGMOUSE_FFMPEG_PATH="$engine_root/runtime/bin/ffmpeg"
export FLYINGMOUSE_LIBREOFFICE_PATH="$engine_root/libreoffice/LibreOffice.app/Contents/MacOS/soffice"
export FLYINGMOUSE_PDFTOPPM_PATH="$engine_root/runtime/bin/pdftoppm"
export FLYINGMOUSE_TESSDATA_PATH="$engine_root/tessdata"
export FLYINGMOUSE_OFD_FONT_DIR="$ofd_font_dir"
export FLYINGMOUSE_PANDOC_PATH="$FLYINGMOUSE_SOURCE_DIR/bin/pandoc/pandoc"
if test -x "$qpdf_root/bin/qpdf"; then
  export FLYINGMOUSE_QPDF_PATH="$qpdf_root/bin/qpdf"
  export DYLD_LIBRARY_PATH="$engine_root/runtime/lib${DYLD_LIBRARY_PATH:+:$DYLD_LIBRARY_PATH}"
fi
if test -x "$raw_path"; then export FLYINGMOUSE_DCRAW_PATH="$raw_path"; fi
if test -x "$structure_python" && test -d "$structure_models"; then
  FLYINGMOUSE_DOCSTRUCTURE_PYTHON="$structure_python" \
    PYTHONPATH="$FLYINGMOUSE_SOURCE_DIR/tools/docstructure-engine" \
    PYTHONDONTWRITEBYTECODE=1 \
    "$structure_python" -c 'from pathlib import Path; from flyingmouse_docstructure.pipeline import _resolve_models; import sys; _resolve_models(Path(sys.argv[1]))' "$structure_models"
  export FLYINGMOUSE_DOCSTRUCTURE_PYTHON="$structure_python"
  export FLYINGMOUSE_DOCSTRUCTURE_MODEL_DIR="$structure_models"
  export FLYINGMOUSE_DOCSTRUCTURE_ENGINE_PATH="$server_dir/scripts/run-original-docstructure-macos.sh"
fi

cd "$server_dir"
node --env-file=.env dist/main.js &
api_pid=$!
node --env-file=.env dist/workers/conversion.worker.js &
worker_pid=$!
cleanup() {
  kill "$api_pid" "$worker_pid" 2>/dev/null || true
  wait "$api_pid" "$worker_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM
while kill -0 "$api_pid" 2>/dev/null && kill -0 "$worker_pid" 2>/dev/null; do sleep 2; done
exit 1
