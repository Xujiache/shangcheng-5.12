#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
vendor_root="$project_root/third_party/ibest-ui"
expected_revision=a8ca200ed7bfbf362d12b00ed5578125bf5252bc
reviewed_base=1444c0fb082c97dd7e767b633df0e058ea503c79
relative_target=library/src/main/ets/components/loading/circular.ets
relative_profile=library/BuildProfile.ets
actual_target="$vendor_root/$relative_target"
actual_profile="$vendor_root/$relative_profile"
patch_file="$project_root/patches/ibest-ui-api21-loading.patch"
expected_build_mode=any

if [[ ${1:-} == "--expected-build-mode" ]]; then
  expected_build_mode=${2:-}
fi
if [[ ! "$expected_build_mode" =~ ^(any|release|test)$ ]]; then
  echo "Usage: $0 [--expected-build-mode any|release|test]" >&2
  exit 1
fi

if [[ ! -d "$vendor_root/.git" && ! -f "$vendor_root/.git" ]]; then
  echo "IBest-UI submodule metadata is missing" >&2
  exit 1
fi

actual_revision=$(git -C "$vendor_root" rev-parse HEAD)
if [[ "$actual_revision" != "$expected_revision" ]]; then
  echo "IBest-UI revision mismatch: expected $expected_revision, got $actual_revision" >&2
  exit 1
fi

unexpected=$(git -C "$vendor_root" status --porcelain --untracked-files=all \
  | grep -vE "^ M ($relative_target|$relative_profile)$" || true)
if [[ -n "$unexpected" ]]; then
  echo "Unexpected changes exist in the vendored IBest-UI tree:" >&2
  echo "$unexpected" >&2
  exit 1
fi

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
mkdir -p "$scratch/$(dirname "$relative_target")"
git -C "$vendor_root" show "$reviewed_base:$relative_target" > "$scratch/$relative_target"
patch --directory="$scratch" --strip=1 --silent < "$patch_file"

if ! cmp --silent "$scratch/$relative_target" "$actual_target"; then
  echo "IBest-UI compatibility file does not exactly match the reviewed patch" >&2
  exit 1
fi

git -C "$vendor_root" show "$expected_revision:$relative_profile" > "$scratch/profile-release.ets"
sed \
  -e "s/BUILD_MODE_NAME = 'release'/BUILD_MODE_NAME = 'test'/" \
  -e 's/DEBUG = false/DEBUG = true/' \
  "$scratch/profile-release.ets" > "$scratch/profile-test.ets"

actual_build_mode=unknown
if cmp --silent "$scratch/profile-release.ets" "$actual_profile"; then
  actual_build_mode=release
elif cmp --silent "$scratch/profile-test.ets" "$actual_profile"; then
  actual_build_mode=test
else
  echo "IBest-UI generated BuildProfile does not match the reviewed release or test form" >&2
  exit 1
fi

if [[ "$expected_build_mode" != any && "$actual_build_mode" != "$expected_build_mode" ]]; then
  echo "IBest-UI generated BuildProfile mode mismatch: expected $expected_build_mode, got $actual_build_mode" >&2
  exit 1
fi

echo "Vendored dependency audit passed: IBest-UI $expected_revision, reviewed API 21 patch, generated mode $actual_build_mode."
