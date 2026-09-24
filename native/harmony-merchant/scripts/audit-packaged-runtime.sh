#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
hap=${1:-$project_root/entry/build/default/outputs/default/app/entry-default.hap}

if [[ ! -f "$hap" ]]; then
  echo "ERROR: packaged-runtime audit cannot find HAP: $hap" >&2
  exit 1
fi

entries=$(unzip -Z1 "$hap")
if [[ "$entries" != *$'ets/modules.abc'* ]]; then
  echo 'ERROR: HAP does not contain the ArkTS bytecode module.' >&2
  exit 1
fi

forbidden_entries=$(printf '%s\n' "$entries" \
  | rg -i '(^|/)(www|_www|webroot)(/|$)|\.(vue|html?|m?js|wasm)$' || true)
if [[ -n "$forbidden_entries" ]]; then
  echo 'ERROR: HAP contains a forbidden web/cross-platform runtime entry:' >&2
  printf '%s\n' "$forbidden_entries" >&2
  exit 1
fi

forbidden_strings=$(unzip -p "$hap" \
  | strings -a \
  | rg -i '@dcloudio|dcloud|uni[-_. ]?app|plus\.runtime|html5plus|webview|vue(?:\.runtime|\.global|\.esm)?' \
  || true)
if [[ -n "$forbidden_strings" ]]; then
  echo 'ERROR: HAP contains a forbidden UniApp, DCloud, Vue or WebView runtime marker:' >&2
  printf '%s\n' "$forbidden_strings" | head -n 20 >&2
  exit 1
fi

echo 'Packaged native-runtime audit passed: ArkTS bytecode present; no web or UniApp runtime markers.'
