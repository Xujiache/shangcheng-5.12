#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 3 ]]; then
  echo "Usage: $0 <certificate-or-chain> <csr> <output-leaf.pem>" >&2
  exit 2
fi

certificate_source=$1
csr_source=$2
output_leaf=$3

[[ -s "$certificate_source" ]] || { echo "Certificate is missing: $certificate_source" >&2; exit 1; }
[[ -s "$csr_source" ]] || { echo "CSR is missing: $csr_source" >&2; exit 1; }

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
openssl req -in "$csr_source" -noout -verify >/dev/null
openssl req -in "$csr_source" -pubkey -noout \
  | openssl pkey -pubin -outform DER > "$scratch/csr-public.der"

split_pem_chain() {
  local source=$1
  local prefix=$2
  awk -v output_prefix="$prefix" '
    /-----BEGIN CERTIFICATE-----/ { cert_index += 1; output = output_prefix cert_index ".pem" }
    output != "" { print > output }
    /-----END CERTIFICATE-----/ { close(output); output = "" }
  ' "$source"
}

if grep -aq -- '-----BEGIN CERTIFICATE-----' "$certificate_source"; then
  split_pem_chain "$certificate_source" "$scratch/candidate-"
else
  openssl x509 -inform DER -in "$certificate_source" \
    -out "$scratch/candidate-1.pem" 2>/dev/null || true
  if openssl pkcs7 -inform DER -in "$certificate_source" -print_certs \
    -out "$scratch/pkcs7.pem" 2>/dev/null; then
    split_pem_chain "$scratch/pkcs7.pem" "$scratch/pkcs7-candidate-"
  fi
fi

matched=''
for candidate in "$scratch"/candidate-*.pem "$scratch"/pkcs7-candidate-*.pem; do
  [[ -s "$candidate" ]] || continue
  if ! openssl x509 -in "$candidate" -out "$scratch/current.pem" 2>/dev/null; then
    continue
  fi
  openssl x509 -in "$scratch/current.pem" -pubkey -noout \
    | openssl pkey -pubin -outform DER > "$scratch/current-public.der"
  if cmp -s "$scratch/csr-public.der" "$scratch/current-public.der"; then
    matched=$candidate
    break
  fi
done

[[ -n "$matched" ]] || {
  echo 'Certificate chain does not contain the application certificate bound to this CSR.' >&2
  exit 1
}

openssl x509 -in "$matched" -checkend 0 -noout >/dev/null || {
  echo 'Application certificate bound to this CSR is already expired.' >&2
  exit 1
}
openssl x509 -in "$matched" -out "$output_leaf"
chmod 600 "$output_leaf"
