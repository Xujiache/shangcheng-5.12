# Isolated Linux parity worker

Server directory: `/root/deployment-verification/linux-windows-parity/e2e`. The base `e2e-compose.yml` supplies the existing parity Postgres, Redis, MinIO and API network. Both the isolated API and `jiujiu-parity-worker` use the required `PARITY_WORKER_IMAGE` value in the private `.env` (current candidate: `jiujiu-conversion-worker:linux-parity-70a630e`); the worker has no published port. Credentials remain in the private `.env`. Do not print expanded Compose configuration or environment variables.

As verified on 2026-09-29, the image ID is `sha256:a1c9ae62d977369178342b64be0033c0e5b4da0548ac12fe2c6c10f3e461ca65`, with runtime fix revision 17. It derives from `linux-parity-b801ba9` (ID `sha256:affc0971c705446f9cd824e6b044638930c9d98b8d349da2b0f14b1dbf1a384c`) by overlaying the compiled conversion service, catalog and engine from source commit `70a630e`. The isolated build context and file hashes are retained at `/root/deployment-verification/linux-windows-parity/build/ledger-parity-overlay-70a630e/`. This is an isolated candidate, not the production image.

The worker has 8 GiB memory, 2 CPUs, 512 PIDs and a read-only root filesystem. `/tmp` is the dedicated `data/worker-tmp` disk directory owned by UID:GID 1000:1000, rather than an 8 GiB tmpfs. The fixed container name and single `worker` service keep the E2E queue on one worker. The production worker and its Redis are outside this Compose project.

## Before starting

The isolated worker was authorized and started. Before changing its candidate image, wait for active batch runners to finish and verify the replacement image hashes. From the server directory:

```sh
docker image inspect jiujiu-conversion-worker:linux-parity-70a630e --format '{{.Id}}'
docker compose --env-file .env -f e2e-compose.yml -f e2e-worker.yml config --quiet
stat -c '%u:%g %a %n' data/worker-tmp
df -h data/worker-tmp
```

The start script checks a 3 GiB free disk reserve, UID:GID 1000:1000 for `/tmp`, and healthy parity Postgres/Redis/MinIO before starting. It does not start those services or any production container.

Set `PARITY_WORKER_IMAGE=jiujiu-conversion-worker:linux-parity-70a630e` in the private `.env` after the image build and hash checks. Pass the same value to the batch runner. The image variable is required; a missing value makes Compose fail before starting the API or worker.

```sh
./start-e2e-worker.sh
docker inspect jiujiu-parity-worker --format 'running={{.State.Running}} oom={{.State.OOMKilled}} restarts={{.RestartCount}}'
```

## Engine versions and resource use

```sh
docker exec jiujiu-parity-worker /opt/ffmpeg-8.1.1/bin/ffmpeg -hide_banner -version
docker exec jiujiu-parity-worker /opt/poppler-26.05.0/bin/pdftoppm -v
docker exec jiujiu-parity-worker /opt/libreoffice26.2/program/soffice --headless --version
docker exec jiujiu-parity-worker /usr/local/bin/jiujiu-qpdf --version
docker exec jiujiu-parity-worker /app/flyingmouse/bin/pandoc/pandoc --version
docker exec jiujiu-parity-worker /usr/bin/fc-match 'Noto Sans CJK SC'
docker exec jiujiu-parity-worker /usr/bin/fc-match 'DejaVu Sans'
docker exec jiujiu-parity-worker cat /sys/fs/cgroup/memory.peak
docker exec jiujiu-parity-worker cat /sys/fs/cgroup/memory.events
docker stats --no-stream jiujiu-parity-worker
df -h data/worker-tmp
```

Record `memory.peak`, `memory.events` (`oom` and `oom_kill`), disk free space and job output quality after each test group. The cgroup counters are per container and reset if Compose recreates it. Keep at least 3 GiB free on the `/tmp` filesystem before further jobs.

## Stop only this E2E worker

```sh
docker compose --env-file .env -f e2e-compose.yml -f e2e-worker.yml stop worker
```
