#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"
tmp_dir=data/worker-tmp
reserve_bytes=$((3 * 1024 * 1024 * 1024))

if [[ ! -d "$tmp_dir" || "$(stat -c '%u:%g' "$tmp_dir")" != '1000:1000' ]]; then
  echo 'E2E worker /tmp directory must exist and belong to UID:GID 1000:1000' >&2
  exit 1
fi
free_bytes=$(df -B1 --output=avail "$tmp_dir" | tail -n 1 | tr -d ' ')
if [[ ! "$free_bytes" =~ ^[0-9]+$ ]] || (( free_bytes < reserve_bytes )); then
  echo 'E2E worker not started: disk free space is below the 3 GiB reserve' >&2
  exit 1
fi

for service in postgres redis minio; do
  if [[ "$(docker inspect -f '{{.State.Health.Status}}' "jiujiu-parity-$service")" != healthy ]]; then
    echo "E2E worker not started: $service is not healthy" >&2
    exit 1
  fi
done

docker compose --env-file .env -f e2e-compose.yml -f e2e-worker.yml config --quiet
docker compose --env-file .env -f e2e-compose.yml -f e2e-worker.yml up -d --no-deps worker
