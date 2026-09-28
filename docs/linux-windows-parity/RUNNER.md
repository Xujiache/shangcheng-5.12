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

Generate the Windows reference from the **same tracked fixture bytes** with the patched original source and Windows engines:

```sh
node scripts/flyingmouse-platform-reference.cjs \
  --cases packages/server/test/fixtures/platform-parity/cases.json \
  --out .quality/linux-windows-parity/windows-reference
```

Upload `reference.json`, `environment.json`, rendered page PNGs and converted outputs as CI artifacts. The reference records original CLI warnings and fails on `PDF_DOCX_LAYOUT_FALLBACK`, missing source bitmap, missing DOCX media asset, or missing expected editable text. The fixture set is expected to expose quality gaps; failed output remains failed evidence.

Optional `--windows-reference /path/reference.json` compares both content and rendered raw pixel hashes, page counts, and dimensions. Without a matching Windows reference or render, `windowsComparison` is `not-compared`; equal text alone never becomes a visual parity pass. Exact pixel mismatches need visual review because font rasterizers may differ by platform. This runner is a focused gate, not the complete 1174-pair matrix. Its output is evidence to review before any acceptance-ledger update.
