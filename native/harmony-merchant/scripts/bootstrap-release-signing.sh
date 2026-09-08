#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
secure_dir=${HARMONY_SIGNING_SECURE_DIR:-/root/secure/jingwei-harmony-signing}
alias_name=${HARMONY_SIGNING_KEY_ALIAS:-jingwei_harmony_release}
store_file="$secure_dir/release-key.p12"
csr_file="$secure_dir/jingwei-merchant-release.csr"
self_cert="$secure_dir/release-self-signed.cer"
env_file="$secure_dir/release-signing.env"
manifest="$secure_dir/SHA256SUMS"

umask 077
mkdir -p "$secure_dir"
chmod 700 "$secure_dir"

for target in "$store_file" "$csr_file" "$env_file"; do
  if [[ -e "$target" ]]; then
    echo "Refusing to overwrite existing signing material: $target" >&2
    exit 1
  fi
done

password=$(openssl rand -base64 48 | tr -d '\r\n')
export JW_HARMONY_STORE_PASSWORD="$password"

keytool -genkeypair \
  -alias "$alias_name" \
  -keyalg EC \
  -groupname secp256r1 \
  -sigalg SHA256withECDSA \
  -validity 10950 \
  -dname 'CN=Jingwei Merchant, OU=Mobile, O=Liaoning Jingwei Architectural Decoration Co. Ltd., L=Shenyang, ST=Liaoning, C=CN' \
  -keystore "$store_file" \
  -storetype PKCS12 \
  -storepass:env JW_HARMONY_STORE_PASSWORD \
  -keypass:env JW_HARMONY_STORE_PASSWORD \
  -noprompt >/dev/null

keytool -certreq \
  -alias "$alias_name" \
  -sigalg SHA256withECDSA \
  -file "$csr_file" \
  -rfc \
  -keystore "$store_file" \
  -storetype PKCS12 \
  -storepass:env JW_HARMONY_STORE_PASSWORD >/dev/null

keytool -exportcert \
  -alias "$alias_name" \
  -file "$self_cert" \
  -keystore "$store_file" \
  -storetype PKCS12 \
  -storepass:env JW_HARMONY_STORE_PASSWORD >/dev/null

openssl req -in "$csr_file" -noout -verify >/dev/null
keytool -list \
  -alias "$alias_name" \
  -keystore "$store_file" \
  -storetype PKCS12 \
  -storepass:env JW_HARMONY_STORE_PASSWORD >/dev/null

{
  printf 'HARMONY_SIGNING_STORE_FILE=%q\n' "$store_file"
  printf 'HARMONY_SIGNING_KEY_ALIAS=%q\n' "$alias_name"
  printf 'HARMONY_SIGNING_STORE_PASSWORD=%q\n' "$password"
  printf 'HARMONY_SIGNING_KEY_PASSWORD=%q\n' "$password"
  printf 'HARMONY_SIGNING_CERT_FILE=%q\n' "$secure_dir/harmony-application.cer"
  printf 'HARMONY_SIGNING_PROFILE_FILE=%q\n' "$secure_dir/harmony-release-profile.p7b"
  printf 'HARMONY_AGCONNECT_FILE=%q\n' "$secure_dir/agconnect-services.json"
} > "$env_file"

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/prepare-signing-password-encryption.sh"

HARMONY_SIGNING_SECURE_DIR="$secure_dir" \
  bash "$project_root/scripts/write-signing-manifest.sh"
chmod 600 "$store_file" "$csr_file" "$self_cert" "$env_file" "$manifest"

csr_sha=$(sha256sum "$csr_file" | awk '{print $1}')
cert_fingerprint=$(keytool -printcert -file "$self_cert" 2>/dev/null \
  | awk -F': ' '/SHA256:/{print $2; exit}')

echo "Harmony release key and CSR created outside Git."
echo "Secure directory: $secure_dir"
echo "CSR for AGC upload: $csr_file"
echo "CSR SHA-256: $csr_sha"
echo "Local key fingerprint: ${cert_fingerprint:-unavailable}"
echo "Secret environment file: $env_file"
echo "Copy the entire secure directory to encrypted offline storage before first public release."
echo "After AGC issues the application certificate, release Profile and client configuration, run:"
echo "  bash $project_root/scripts/import-agc-release-materials.sh <application.cer> <release-profile.p7b> <agconnect-services.json>"
