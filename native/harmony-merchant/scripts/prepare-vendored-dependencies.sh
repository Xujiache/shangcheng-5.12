#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
vendor_root="$project_root/third_party/ibest-ui"
target="$vendor_root/library/src/main/ets/components/loading/circular.ets"
generated_profile="$vendor_root/library/BuildProfile.ets"
patch_file="$project_root/patches/ibest-ui-api21-loading.patch"
reviewed_revision=1444c0fb082c97dd7e767b633df0e058ea503c79

if [[ ! -f "$target" ]]; then
  echo "IBest-UI submodule is missing; run git submodule update --init --recursive" >&2
  exit 1
fi

if grep -Fq "import { UIContext } from '@ohos.arkui.UIContext';" "$target"; then
  patch --directory="$vendor_root" --strip=1 --forward < "$patch_file"
fi

if ! grep -Fq 'LoadingProgress()' "$target"; then
  echo "IBest-UI API 21 loading compatibility patch was not applied" >&2
  exit 1
fi

# Hvigor rewrites this generated file to debug/release/test according to the
# last command. Normalize it to the reviewed release form before auditing so
# build -> test and test -> build are both reproducible. The post-build audit
# still requires the exact mode emitted by the command that just ran.
git -C "$vendor_root" show "$reviewed_revision:library/BuildProfile.ets" > "$generated_profile"

echo "Vendored dependency compatibility patches are ready."
node "$project_root/scripts/prepare-generated-icons.cjs"
