#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
source_root="$project_root/entry/src"

if find "$source_root" -type f -name '*.vue' -print -quit | grep -q .; then
  echo 'ERROR: Harmony source tree contains .vue files.' >&2
  exit 1
fi

if find "$source_root" -type f -name '*.ets' -empty -print -quit | grep -q .; then
  echo 'ERROR: Harmony source tree contains an empty ArkTS source file.' >&2
  find "$source_root" -type f -name '*.ets' -empty -print >&2
  exit 1
fi

forbidden='@dcloudio|\buni\.|\bplus\.|DCloud|HBuilder|WebView|packages/merchant-app|@jiujiu/shared'
if rg -n --glob '*.{ets,ts,json,json5}' "$forbidden" "$source_root"; then
  echo 'ERROR: forbidden UniApp/DCloud/frontend dependency found.' >&2
  exit 1
fi

if find "$source_root" -type l -print -quit | grep -q .; then
  echo 'ERROR: symlinks are not allowed in Harmony source.' >&2
  exit 1
fi

if ! rg -q '"bundleName"\s*:\s*"top\.ewsn\.jingwei\.merchant"' "$project_root/AppScope/app.json5"; then
  echo 'ERROR: unexpected bundle name.' >&2
  exit 1
fi

if ! rg -q '"versionCode"\s*:\s*1000000' "$project_root/AppScope/app.json5"; then
  echo 'ERROR: unexpected first release versionCode.' >&2
  exit 1
fi

if rg -q '^-enable-property-obfuscation\b' "$project_root/entry/obfuscation-rules.txt"; then
  echo 'ERROR: property obfuscation would rename server and Harmony Kit contract fields.' >&2
  exit 1
fi

echo 'Clean-room audit passed.'
