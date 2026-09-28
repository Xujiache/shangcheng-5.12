# Linux candidate conversion parity runner

Run against an isolated local API, PostgreSQL, Redis, object store, and worker built from the same source revision. The runner refuses a production API or nonlocal database. It creates a disposable ledger user and deletes its jobs and user on exit. It does not update `acceptance-a7b9b15.json` or the `linuxMatrix` gate.

The tracked synthetic fixtures and manifest are in `packages/server/test/fixtures/platform-parity/`. They contain Chinese text, two columns, a ruled table, and a genuine embedded bitmap. `SHA256.json` records exact bytes, the Noto CJK source-font SHA-256, and the fixture font-subset SHA-256. The generator needs fontTools 4.60.2 and the static Noto CJK font at `PARITY_CJK_FONT`; it embeds the pre-subset font with `subset:false` so Chinese glyphs render correctly. Verify fixture hashes after transferring them to another system. No customer document is used. Scanned and mixed PDFs need an installed and verified docstructure engine and models; absence or bad extraction is a failed case.

```json
[
  {"kind":"native","path":"native-table.pdf","expect":["订单","315.50"],"expectAssets":{"docx":1}},
  {"kind":"scan","path":"scan-table.pdf","expect":["订单","315.50"],"expectAssets":{"docx":1}},
  {"kind":"mixed","path":"mixed-table.pdf","expect":["订单","315.50"],"expectAssets":{"docx":1}}
]
```

Set `DATABASE_URL`, `JWT_SECRET`, `FLYINGMOUSE_TEST_SOURCE_DIR` (patched runtime copy), and the exact Linux engine paths `FLYINGMOUSE_FFMPEG_PATH`, `FLYINGMOUSE_LIBREOFFICE_PATH`, `FLYINGMOUSE_PDFTOPPM_PATH`. Set `FLYINGMOUSE_DOCSTRUCTURE_ENGINE_PATH` and `FLYINGMOUSE_DOCSTRUCTURE_MODEL_DIR` for scanned/mixed PDFs. `CONVERSION_TEST_API` must be loopback and defaults to `http://127.0.0.1:3001`. Use a development environment (`NODE_ENV` must not be `production`). Load credentials from a local restricted env file, without printing them.

```sh
node scripts/flyingmouse-linux-parity.cjs \
  --cases packages/server/test/fixtures/platform-parity/cases.json \
  --evidence .quality/linux-windows-parity/linux-parity.jsonl \
  --office --media --options
```

`--office` reuses the authenticated verifier's Chinese ruled-table PDF→XLSX, spreadsheet, and two-slide presentation checks. `--media` runs moving MP4 format outputs with decoded frame/audio checks. `--options` checks PDF grouping, text encodings, video codecs, and alpha background. These switches can be run separately to control memory and time. Each PDF case runs original CLI and authenticated backend conversion to DOCX and XLSX, validates editable content and DOCX assets, renders each result through LibreOffice and Poppler, and writes input, direct output, backend output, content and raw pixel SHA-256 values to JSONL. A failed case stays `fail` and makes the command exit nonzero.

Generate the Windows reference from the **same tracked fixture bytes** with the untouched pinned original source and Windows engines. A failure in that baseline remains failure evidence; the Linux platform patch is evaluated separately:

```sh
node scripts/flyingmouse-platform-reference.cjs \
  --cases packages/server/test/fixtures/platform-parity/cases.json \
  --out .quality/linux-windows-parity/windows-reference
```

Upload `reference.json`, `environment.json`, rendered page PNGs and converted outputs as CI artifacts. The reference records original CLI warnings and fails on `PDF_DOCX_LAYOUT_FALLBACK`, missing source bitmap, missing DOCX media asset, or missing expected editable text. The fixture set is expected to expose quality gaps; failed output remains failed evidence.

Optional `--windows-reference /path/reference.json` compares both content and rendered raw pixel hashes, page counts, and dimensions. Without a matching Windows reference or render, `windowsComparison` is `not-compared`; equal text alone never becomes a visual parity pass. Exact pixel mismatches need visual review because font rasterizers may differ by platform. This runner is a focused gate, not the complete 1174-pair matrix. Its output is evidence to review before any acceptance-ledger update.

## Full catalog batches

Use the isolated container and environment in [`e2e-runbook.md`](e2e-runbook.md). Run one batch per invocation, with a unique evidence path so `*.jobs.jsonl` and `*.pairs.jsonl` are retained. Use the same `docker run` prefix from that runbook and replace its final Node arguments as below (`CANDIDATE_IMAGE` must be the verified local tag). Run the PDF batch with an 8 GiB runner limit. Run other batches with 2 GiB unless the selected input needs more; never run PDF or RAW conversions concurrently.

```sh
parity_batch() {
  batch="$1"
  shift
  docker run --rm --network host --memory 2g --cpus 2 --pids-limit 128 \
    --env-file runner.env \
    -e CONVERSION_FIXTURE_ROOT=/parity-fixtures \
    -e NODE_PATH=/app/server/node_modules \
    -e FLYINGMOUSE_TEST_SOURCE_DIR=/app/flyingmouse \
    -e FLYINGMOUSE_FFMPEG_PATH=/opt/ffmpeg-8.1.1/bin/ffmpeg \
    -e FLYINGMOUSE_LIBREOFFICE_PATH=/opt/libreoffice26.2/program/soffice \
    -e FLYINGMOUSE_PDFTOPPM_PATH=/opt/poppler-26.05.0/bin/pdftoppm \
    -v /root/projects/jiujiu-linux-parity-candidate:/parity-src:ro \
    -v /root/deployment-verification/linux-windows-parity/fixtures:/parity-fixtures:ro \
    -v "$PWD/artifacts":/parity-artifacts \
    "$@" \
    --entrypoint node CANDIDATE_IMAGE \
    /parity-src/scripts/flyingmouse-linux-parity.cjs \
    --cases /parity-src/packages/server/test/fixtures/platform-parity/cases.json \
    --batch "$batch" --evidence "/parity-artifacts/$batch.jsonl"
}
cd /root/deployment-verification/linux-windows-parity/e2e
mkdir -p artifacts
parity_batch baseline
parity_batch text
parity_batch image
parity_batch audio
parity_batch video
parity_batch subtitle
parity_batch doc
parity_batch sheet
parity_batch xlsm
parity_batch presentation
parity_batch pdfContent
parity_batch arch
parity_batch psd
parity_batch psdOcr
parity_batch options
parity_batch original
parity_batch large
```

Run PDF with the same command prefix in [`e2e-runbook.md`](e2e-runbook.md) using `--memory 8g`, `--batch pdf`, and `/parity-artifacts/pdf.jsonl`. Each command is independent; continue after a failed batch using a fresh evidence filename. Input lists can be narrowed with the corresponding `CONVERSION_*_INPUTS` environment variable passed using `-e` before `--entrypoint`.

The remaining eight batches require a sample below `CONVERSION_FIXTURE_ROOT`. The runner checks its real path and SHA-256 against [`matrix-fixtures.json`](matrix-fixtures.json). Set each filename to a hash-locked fixture from that manifest; run one source sample per invocation and use a unique evidence path. Example calls using the function above:

```sh
parity_batch raw -e "CONVERSION_RAW_SAMPLE=/parity-fixtures/${RAW_FILE:?}"
parity_batch vector -e "CONVERSION_VECTOR_SAMPLE=/parity-fixtures/${AI_FILE:?}"
parity_batch legacyDoc -e "CONVERSION_LEGACY_DOCUMENT_SAMPLE=/parity-fixtures/${WPS_WPT_WPD_FILE:?}" -e "CONVERSION_LEGACY_EXPECT=${DOCUMENT_TEXT:?}"
parity_batch legacySheet -e "CONVERSION_LEGACY_SHEET_SAMPLE=/parity-fixtures/${ET_ETT_FILE:?}" -e "CONVERSION_LEGACY_SHEET_EXPECT=${SHEET_TEXT:?}"
parity_batch legacySlide -e "CONVERSION_LEGACY_PRESENTATION_SAMPLE=/parity-fixtures/${DPS_DPT_FILE:?}" -e "CONVERSION_LEGACY_PRESENTATION_EXPECT=${SLIDE_TEXT:?}"
parity_batch ofd -e "CONVERSION_OFD_SAMPLE=/parity-fixtures/${OFD_FILE:?}" -e "CONVERSION_OFD_EXPECT=${OFD_TEXT:?}"
```

`rawOcr` and `vectorOcr` use the same RAW or AI sample variable plus `-e "CONVERSION_RAW_OCR_EXPECT=${VISIBLE_TEXT:?}"`; run them only when that exact hash-locked image visibly contains the phrase. The default RAW/AI public samples may lack readable text; OCR uses only the separately qualified `ocrCandidates` entries. Landscape/photo OCR must never be marked passed from a generic no-text error. WPS/WPT rich fixtures require editable DOCX table and image; synthetic ET/ETT require two sheets and a formula; synthetic DPS/DPT require two pages and HTML images. The tracked `graphic.psd` covers 16 image/video targets; separate tracked `graphic-text.psd` covers three OCR targets with visible `WINDOW ORDER` and `TOTAL 315.50`, and both have hashes in `office-SHA256.json`.

The catalog has 1,174 input/output pairs over 98 inputs and 46 operations. Batch definitions are static routing coverage only. OCR-capable public RAW and AI candidates are recorded separately in `matrix-fixtures.json`; visible source text is a fixture qualification, not an OCR pass. Any RAW input missing from `ocrCandidates` still leaves its three OCR pairs without a qualified fixture. PSD's three OCR pairs have a synthetic fixture, but remain **not run** until direct CLI and authenticated backend output checks finish. No Linux batch inherits the historical 954 passes. `currentCoverage` and `qualityOperationCoverage` derive from this invocation's asserted pair events and the two multi-file operation quality events in `*.operations.jsonl`; a failure takes precedence over a pass. `jobOperationCoverage` only reports transport and download completion. If a verifier exits nonzero, `qualityEvidenceComplete` is false and any preceding pass events are partial evidence, not a batch acceptance. The historical 220 incomplete pairs and Windows reference gaps remain separate from current Linux results.

## Replay the exact inputs through the original CLI

Copy a batch's `*.jobs.jsonl`, matching `*.fixture-index.json`, and its `*-inputs/` directory together. Check out the same repository revision; place the public fixtures under a separate root with `raw/`, `design/`, and `legacy/` children. On Windows or Linux, run:

```sh
node scripts/flyingmouse-job-reference.cjs \
  --jobs /path/to/batch.jobs.jsonl \
  --repo-root /path/to/checkout \
  --public-root /path/to/public-fixtures \
  --source /path/to/original-engine \
  --out /path/to/new-reference-directory
```

The replay checks every input's SHA-256 and size, preserves primary outputs and nested sidecar assets with individual hashes, CLI warnings, and source/runtime fingerprints, then writes one `reference.jsonl` row per job. `qualityStatus` stays `not-assessed` and `parityStatus` stays `not-compared`. Original CLI lacks `splitMode`, `groupSize`, and `alphaBackground`; those PDF and video jobs use the original `server.js` conversion route bound to a temporary localhost port with an isolated runtime directory. The existing six-PDF Windows reference is separate; this general job replay has not run on Windows yet.
