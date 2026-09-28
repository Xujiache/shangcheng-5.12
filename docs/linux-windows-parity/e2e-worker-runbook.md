# Isolated Linux parity worker

Server directory: `/root/deployment-verification/linux-windows-parity/e2e`. The base `e2e-compose.yml` supplies the existing parity Postgres, Redis, MinIO and API network. `e2e-worker.yml` adds one `jiujiu-parity-worker` using candidate image `jiujiu-conversion-worker:linux-parity-31f634c`; it has no published port. Credentials remain in the private `.env`. Do not print expanded Compose configuration or environment variables.

The worker has 8 GiB memory, 2 CPUs, 512 PIDs and a read-only root filesystem. `/tmp` is the dedicated `data/worker-tmp` disk directory owned by UID:GID 1000:1000, rather than an 8 GiB tmpfs. The fixed container name and single `worker` service keep the E2E queue on one worker. The production worker and its Redis are outside this Compose project.

## Before starting

Wait for the candidate image build to finish and for explicit authorization to start this E2E worker. From the server directory:

```sh
docker image inspect jiujiu-conversion-worker:linux-parity-31f634c --format '{{.Id}}'
docker compose --env-file .env -f e2e-compose.yml -f e2e-worker.yml config --quiet
stat -c '%u:%g %a %n' data/worker-tmp
df -h data/worker-tmp
```

The start script checks a 3 GiB free disk reserve, UID:GID 1000:1000 for `/tmp`, and healthy parity Postgres/Redis/MinIO before starting. It does not start those services or any production container.

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
