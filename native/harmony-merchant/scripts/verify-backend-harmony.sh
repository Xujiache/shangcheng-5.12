#!/usr/bin/env bash
set -euo pipefail

project_root=$(cd "$(dirname "$0")/.." && pwd)
backend_root=${BACKEND_SERVER_ROOT:-$project_root/../../packages/server}
production_base_url=${HARMONY_BACKEND_BASE_URL:-https://ewsn.top}
timestamp=$(date -u +%Y%m%dT%H%M%SZ)
evidence_dir=${HARMONY_BACKEND_EVIDENCE_DIR:-$project_root/artifacts/backend-verification/$timestamp}
scratch=$(mktemp -d)

cleanup() {
  rm -rf "$scratch"
}
trap cleanup EXIT

[[ -f "$backend_root/package.json" ]] || {
  echo "ERROR: backend server package is missing: $backend_root" >&2
  exit 2
}
mkdir -p "$evidence_dir"

tests=(
  test/harmony-iap.service.spec.ts
  test/huawei-iap-jws.service.spec.ts
  test/huawei-iap-server.service.spec.ts
  test/harmony-push.service.spec.ts
  test/harmony-realtime.service.spec.ts
  test/app-release-harmony.spec.ts
  test/harmony-module-bootstrap.spec.ts
  test/auth.service.spec.ts
  test/legal.service.spec.ts
  test/merchant-plaza.spec.ts
  test/merchant-chat.spec.ts
  test/chat.gateway.spec.ts
)

(
  cd "$backend_root"
  pnpm exec jest --runInBand "${tests[@]}" \
    --json --outputFile "$scratch/jest.json" 2>&1 | tee "$evidence_dir/jest.log"
  pnpm typecheck 2>&1 | tee "$evidence_dir/typecheck.log"
  pnpm build 2>&1 | tee "$evidence_dir/build.log"
  HARMONY_SMOKE_BASE_URL="$production_base_url" \
    pnpm smoke:harmony-account 2>&1 | tee "$evidence_dir/production-smoke.log"
)

curl -fsS --max-time 10 -o /dev/null -w '%{http_code}\n' \
  "$production_base_url/health" > "$evidence_dir/health-http-status.txt"

node "$project_root/scripts/summarize-harmony-backend-verification.mjs" \
  --backend-root "$backend_root" \
  --jest "$scratch/jest.json" \
  --smoke "$evidence_dir/production-smoke.log" \
  --health "$evidence_dir/health-http-status.txt" \
  --base-url "$production_base_url" \
  --output "$evidence_dir/verification.json"

mkdir -p "$project_root/artifacts/backend-verification"
install -m 600 "$evidence_dir/verification.json" \
  "$project_root/artifacts/backend-verification/latest.json"
echo "Harmony backend verification passed. Evidence: $evidence_dir"
