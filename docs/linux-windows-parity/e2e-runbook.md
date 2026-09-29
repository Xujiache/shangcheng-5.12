# Isolated authenticated conversion stack

Server location: `/root/deployment-verification/linux-windows-parity/e2e`. Only `jiujiu-parity-*` containers and local host ports 5544, 6399, 9300, 9301, 3013 belong to this stack. The four production containers and port 3003 are separate. All test credentials are in mode-0600 `.env` and `runner.env`, which must remain outside Git.

`setup-e2e.sh` is safe to rerun: it preserves existing credentials, creates new ones only when both private files are absent, and starts the three isolated data services. Then initialize the disposable database using the existing guarded command and start the API:

```sh
cd /root/deployment-verification/linux-windows-parity/e2e
sh setup-e2e.sh
set -a; . ./runner.env; set +a
cd /root/projects/jiujiu-more-tools-fce5ef7
pnpm --filter @jiujiu/server db:push:test
cd /root/deployment-verification/linux-windows-parity/e2e
docker compose --env-file .env -f e2e-compose.yml up -d api
curl -fsS http://127.0.0.1:3013/health/ready
```

The schema in that checkout and image `jiujiu-conversion-worker:9fbe0b9` have the same SHA-256. The API uses `NODE_ENV=test`, `ledger_parity_test`, a dedicated Redis instance/database, and private `jiujiu-parity-files` and `jiujiu-parity-conversions` MinIO buckets. An authenticated disposable LedgerUser/JWT capabilities request returned HTTP 200/code 0 with `available:false` and zero operations before a candidate worker was attached; this is the expected pre-worker state. The user was deleted.

Attach only an isolated candidate worker with `DATABASE_URL`, `REDIS_URL`, S3 credentials and `CONVERSION_PASSWORD_KEY` from this stack, plus its own `CONVERSION_BUCKET=jiujiu-parity-conversions`. The isolated candidate worker is attached; see [current worker and image](e2e-worker-runbook.md). The parity runner on the server uses `runner.env` with `CONVERSION_TEST_API=http://127.0.0.1:3013`; run it after its dependencies and verified original-engine source are available. Keep its fixture paths within the isolated synthetic fixture directory. Never use production credentials, storage, queue, or bucket.

Once the candidate image and worker are ready and `/root/projects/jiujiu-linux-parity-candidate` contains the current runner and fixture hashes, run the verifier in a separate, resource-limited container. The checkout is read-only; only the artifact directory is writable. `--network host` is required because both test API and test database in `runner.env` are bound to localhost on the server. The image supplies the deployed server Node dependencies at `/app/server/node_modules` and the original CLI dependencies at `/app/flyingmouse/node_modules`.

```sh
cd /root/deployment-verification/linux-windows-parity/e2e
mkdir -p artifacts
chown 1000:1000 artifacts
docker run --rm --network host --memory 8g --cpus 2 --pids-limit 128 \
  --env-file runner.env \
  -e NODE_PATH=/app/server/node_modules \
  -e FLYINGMOUSE_TEST_SOURCE_DIR=/app/flyingmouse \
  -e FLYINGMOUSE_FFMPEG_PATH=/opt/ffmpeg-8.1.1/bin/ffmpeg \
  -e FLYINGMOUSE_LIBREOFFICE_PATH=/opt/libreoffice26.2/program/soffice \
  -e FLYINGMOUSE_PDFTOPPM_PATH=/opt/poppler-26.05.0/bin/pdftoppm \
  -v /root/projects/jiujiu-linux-parity-candidate:/parity-src:ro \
  -v "$PWD/artifacts":/parity-artifacts \
  --entrypoint node CANDIDATE_IMAGE \
  /parity-src/scripts/flyingmouse-linux-parity.cjs \
  --cases /parity-src/packages/server/test/fixtures/platform-parity/cases.json \
  --evidence /parity-artifacts/linux-parity.jsonl
```

Replace `CANDIDATE_IMAGE` with the exact new image tag. Run the same command with `--check` appended first to validate fixture SHA-256, API/database guard, and checkout mount without conversions. Resolve the Node dependencies separately with `node -e "require('@prisma/client'); require('@nestjs/jwt'); require('sharp')"` using the same image and `NODE_PATH`. The full run must exit zero with six PDF case outputs and record `not-compared` for Windows cases until the Windows reference is available. A passing content hash alone is insufficient for visual parity; compare the recorded rendered page dimensions and pixel hashes.
Use a fresh evidence filename for each run; the runner refuses to overwrite existing evidence.

Run other categories as separate invocations of the same `docker run` command, changing the final arguments to `--batch CATEGORY --evidence /parity-artifacts/CATEGORY.jsonl`. The PDF batch needs the 8 GiB limit above: the scanned PDF direct conversion alone exceeded 4 GiB in a real probe. The verifier completes each direct conversion before starting its authenticated backend conversion; run batches one at a time so the candidate worker's own 8 GiB budget is not contended. The current categories are `baseline`, `text`, `image`, `audio`, `video`, `subtitle`, `doc`, `sheet`, `xlsm`, `presentation`, `pdfContent`, `arch`, `raw`, `rawOcr`, `vector`, `vectorOcr`, `psd`, `psdOcr`, `legacyDoc`, `legacySheet`, `legacySlide`, `ofd`, `options`, `original`, `large`, `avs`, and `evc`. RAW, AI, legacy Office, and OFD require manifest hash-locked samples under the isolated fixture root; [`RUNNER.md`](RUNNER.md) lists their parameters. The `psd` and `psdOcr` batches use separate tracked synthetic files. Each invocation creates a new test user, runs only its selected checks, and exits independently. Batch evidence says `historicalMatrixStatus:not-run` because a successful category check does not establish all 1,174 historical pairs.

Each batch also writes `<evidence-base>.jobs.jsonl` with authenticated job input/output hashes, bytes, options, warnings, terminal state, and time; `<evidence-base>.pairs.jsonl` records only pairs actually asserted by that invocation. Generated test inputs are saved once per SHA-256 and original extension under `<evidence-base>-inputs/`, with a relative path in each job row. `*.fixture-index.json` identifies SHA-locked repository and public fixtures by repository path or `resourceId`, so their bytes are not copied again. These records allow the same input bytes to be replayed on Windows; they do not establish Windows parity. The baseline batch writes `<evidence-base>.operations.jsonl` after checking both multi-file merge outputs against the original CLI using the same inputs, page content, dimensions and rendered pixels; a failed quality check records a failed operation event. PDF evidence retains direct and backend DOCX/XLSX files plus each rendered PNG in `<evidence-base>-files`, with relative paths in its JSONL. A timed out or failed job remains a failure. The 954 historical passes and 220 incomplete pairs are not counted as results of this Linux run.

The serial launcher [`run-e2e-batches.sh`](run-e2e-batches.sh) runs PDF first, then the lighter categories; `--phase external` schedules each hash-locked RAW, AI, legacy Office and OFD sample separately. Copy it from the candidate checkout into this isolated E2E directory after syncing that checkout. It requires `PARITY_WORKER_IMAGE` to equal the running parity worker image, verifies all 307 original source-file hashes and platform fix revision 17, checks a 3 GiB disk reserve before each batch, and retains a unique log, JSONL evidence, and exit status for each case. Failed cases are recorded and later cases continue; it never retries or overwrites a failed output. No conversion starts until the script is invoked.

```sh
cd /root/deployment-verification/linux-windows-parity/e2e
install -m 700 /root/projects/jiujiu-linux-parity-candidate/docs/linux-windows-parity/run-e2e-batches.sh ./run-e2e-batches.sh
PARITY_WORKER_IMAGE=jiujiu-conversion-worker:linux-parity-b801ba9 ./run-e2e-batches.sh --phase core
PARITY_WORKER_IMAGE=jiujiu-conversion-worker:linux-parity-b801ba9 ./run-e2e-batches.sh --phase external
```

Use `--batch pdf` or another batch name for a short first probe; each invocation writes a new run directory. External sample files are mounted read-only from `/root/deployment-verification/linux-windows-parity/fixtures`. For an individual failed external case, pass its exact `status.tsv` label to `--batch`; this starts a new run and preserves the earlier evidence. Missing sample bytes or expected content remain `not-run` in `status.tsv`; inspect the adjacent logs and pair evidence before claiming acceptance.

For a focused image regression, use `CONVERSION_IMAGE_INPUTS=svg PARITY_WORKER_IMAGE=jiujiu-conversion-worker:linux-parity-b801ba9 ./run-e2e-batches.sh --batch image`. The existing fixture generator rejects unsupported input extensions; every catalog target for the selected input still runs. The summary records the selected input scope. A scoped rerun cannot replace the other image results or establish full matrix acceptance.
