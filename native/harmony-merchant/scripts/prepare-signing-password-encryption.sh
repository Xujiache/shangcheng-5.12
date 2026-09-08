#!/usr/bin/env bash
set -euo pipefail

secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
env_file="$secure_dir/release-signing.env"
project_root=$(cd "$(dirname "$0")/.." && pwd)

[[ -s "$env_file" ]] || { echo 'Release signing environment is missing.' >&2; exit 1; }
set -a
# shellcheck disable=SC1090
source "$env_file"
set +a

if [[ -z ${HARMONY_SIGNING_STORE_PASSWORD_ENCRYPTED:-} \
  || -z ${HARMONY_SIGNING_KEY_PASSWORD_ENCRYPTED:-} ]]; then
  node "$project_root/scripts/signing-password-material.mjs" create \
    --material-dir "$secure_dir" \
    --environment-file "$env_file"
  set -a
  # shellcheck disable=SC1090
  source "$env_file"
  set +a
fi

node "$project_root/scripts/signing-password-material.mjs" verify \
  --material-dir "$secure_dir"
chmod 700 "$secure_dir" "$secure_dir/material" \
  "$secure_dir/material/fd" "$secure_dir/material/ac" "$secure_dir/material/ce"
find "$secure_dir/material" -type d -exec chmod 700 {} +
find "$secure_dir/material" -type f -exec chmod 600 {} +
chmod 600 "$env_file"
HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/write-signing-manifest.sh"
