#!/usr/bin/env bash
set -euo pipefail

secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
manifest="$secure_dir/SHA256SUMS"
scratch=$(mktemp "$secure_dir/.SHA256SUMS.XXXXXX")
files=()

for candidate in release-key.p12 jingwei-merchant-release.csr release-self-signed.cer \
  harmony-application.cer harmony-release-profile.p7b agconnect-services.json; do
  [[ -s "$secure_dir/$candidate" ]] && files+=("$candidate")
done
if [[ -d "$secure_dir/material" ]]; then
  while IFS= read -r -d '' candidate; do
    files+=("${candidate#"$secure_dir/"}")
  done < <(find "$secure_dir/material" -type f -print0 | sort -z)
fi
[[ ${#files[@]} -gt 0 ]] || { echo 'No signing material is available for the manifest.' >&2; exit 1; }

(
  cd "$secure_dir"
  sha256sum "${files[@]}"
) > "$scratch"
chmod 600 "$scratch"
mv -f "$scratch" "$manifest"
chmod 600 "$manifest"
