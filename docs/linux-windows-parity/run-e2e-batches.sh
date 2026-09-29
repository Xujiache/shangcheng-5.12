#!/usr/bin/env bash
set -euo pipefail

cd /root/deployment-verification/linux-windows-parity/e2e
umask 077
: "${PARITY_WORKER_IMAGE:?set the exact candidate image tag}"
image="$PARITY_WORKER_IMAGE"
checkout=/root/projects/jiujiu-linux-parity-candidate
fixtures=/root/deployment-verification/linux-windows-parity/fixtures
reserve=$((3 * 1024 * 1024 * 1024))
phase=core
selected=
if [[ "${1:-}" == --phase ]]; then phase="${2:?phase required}"; shift 2; fi
if [[ "${1:-}" == --batch ]]; then selected="${2:?batch required}"; shift 2; fi
if (( $# )) || [[ ! "$phase" =~ ^(core|external|all)$ ]]; then
  echo 'Usage: PARITY_WORKER_IMAGE=tag ./run-e2e-batches.sh [--phase core|external|all] [--batch NAME]' >&2
  exit 2
fi
if [[ "$phase" == core && "$selected" =~ ^(raw|rawOcr|vector|vectorOcr|legacyDoc|legacySheet|legacySlide|ofd)(-|$) ]]; then
  phase=external
fi
[[ -f runner.env && -f "$checkout/scripts/flyingmouse-linux-parity.cjs" && -d "$fixtures" ]] ||
  { echo 'Missing isolated runner.env, candidate checkout, or fixture root' >&2; exit 2; }
mode=$(stat -c '%a' runner.env)
(( (8#$mode & 077) == 0 )) || { echo 'runner.env must not be readable by group/others' >&2; exit 2; }
grep -Eq '^CONVERSION_TEST_API=http://(127\.0\.0\.1|localhost):3013$' runner.env ||
  { echo 'runner.env must target the isolated localhost API on port 3013' >&2; exit 2; }
image_id=$(docker image inspect "$image" --format '{{.Id}}')
worker_id=$(docker inspect jiujiu-parity-worker --format '{{.Image}}')
[[ "$image_id" == "$worker_id" ]] || { echo 'Parity worker image differs from runner image' >&2; exit 2; }
[[ "$(docker inspect jiujiu-parity-worker --format '{{.State.Running}}')" == true ]] ||
  { echo 'Parity worker is not running' >&2; exit 2; }
curl -fsS http://127.0.0.1:3013/health/ready >/dev/null ||
  { echo 'Isolated API is not ready' >&2; exit 2; }

# Existing runtime: --copy verifies 307 original file hashes and fixRevision 17.
docker run --rm --read-only --network none \
  -v "$checkout":/parity-src:ro --entrypoint node "$image" \
  /parity-src/scripts/apply-flyingmouse-platform-fixes.cjs --copy /app/flyingmouse >/dev/null

run_dir="artifacts/run-$(date -u +%Y%m%dT%H%M%SZ)-$$"
mkdir -m 700 "$run_dir"
run_dir=$(realpath "$run_dir")
chown 1000:1000 "$run_dir"
node - "$image_id" "$image" "$checkout" >"$run_dir/environment.json" <<'NODE'
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const { readFileSync } = require('node:fs')
const [imageId, imageTag, checkout] = process.argv.slice(2)
console.log(JSON.stringify({ imageId, imageTag, startedAt: new Date().toISOString(),
  checkoutRevision: execFileSync('git', ['-C', checkout, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  fixtureManifestSha256: createHash('sha256').update(readFileSync(
    `${checkout}/docs/linux-windows-parity/matrix-fixtures.json`)).digest('hex') }, null, 2))
NODE
printf 'label\tbatch\texit\tevidence\tlog\n' >"$run_dir/status.tsv"
failed=0
disk_blocked=0
run_count=0

run_case() {
  local label="$1" batch="$2" free rc
  shift 2
  [[ -z "$selected" || "$selected" == "$batch" || "$selected" == "$label" ]] || return 0
  run_count=$((run_count + 1))
  [[ "$label" =~ ^[A-Za-z0-9_.-]+$ ]] || { echo 'Invalid case label' >&2; exit 2; }
  free=$(df -B1 --output=avail "$run_dir" | tail -n 1 | tr -d ' ')
  if [[ ! "$free" =~ ^[0-9]+$ ]] || (( free < reserve )); then
    printf '%s\t%s\tnot-run-disk\t\t\n' "$label" "$batch" >>"$run_dir/status.tsv"
    disk_blocked=1
    failed=1
    return 0
  fi
  if (( disk_blocked )); then
    printf '%s\t%s\tnot-run-disk\t\t\n' "$label" "$batch" >>"$run_dir/status.tsv"
    return 0
  fi
  local evidence="/parity-artifacts/$label.jsonl" log="$run_dir/$label.log"
  local extra=()
  case "$batch" in raw|rawOcr|vector|vectorOcr|psd|psdOcr|image|avs)
    extra=(-e CONVERSION_TEST_JOB_TIMEOUT_SECONDS=720) ;;
  esac
  if [[ "$batch" == image && -n "${CONVERSION_IMAGE_INPUTS:-}" ]]; then
    extra+=(-e "CONVERSION_IMAGE_INPUTS=$CONVERSION_IMAGE_INPUTS")
  fi
  if docker run --rm --network host --memory 8g --cpus 2 --pids-limit 512 \
    --env-file runner.env \
    -e NODE_PATH=/app/server/node_modules \
    -e FLYINGMOUSE_TEST_SOURCE_DIR=/app/flyingmouse \
    -e FLYINGMOUSE_FFMPEG_PATH=/opt/ffmpeg-8.1.1/bin/ffmpeg \
    -e FLYINGMOUSE_LIBREOFFICE_PATH=/opt/libreoffice26.2/program/soffice \
    -e FLYINGMOUSE_PDFTOPPM_PATH=/opt/poppler-26.05.0/bin/pdftoppm \
    -e CONVERSION_FIXTURE_ROOT=/parity-fixtures \
    -v "$checkout":/parity-src:ro \
    -v "$fixtures":/parity-fixtures:ro \
    -v "$run_dir":/parity-artifacts \
    "${extra[@]}" \
    "$@" --entrypoint node "$image" \
    /parity-src/scripts/flyingmouse-linux-parity.cjs \
    --cases /parity-src/packages/server/test/fixtures/platform-parity/cases.json \
    --batch "$batch" --evidence "$evidence" >"$log" 2>&1; then rc=0
  else rc=$?; failed=1; fi
  printf '%s\t%s\t%s\t%s\t%s\n' "$label" "$batch" "$rc" "$evidence" "$label.log" >>"$run_dir/status.tsv"
  printf '%s %s exit=%s\n' "$label" "$batch" "$rc"
}

if [[ "$phase" == core || "$phase" == all ]]; then
  for batch in pdf baseline doc sheet xlsm presentation pdfContent text audio video subtitle image arch options original psd psdOcr large avs; do
    run_case "$batch" "$batch"
  done
fi

if [[ "$phase" == external || "$phase" == all ]]; then
  node - "$checkout/docs/linux-windows-parity/matrix-fixtures.json" >"$run_dir/external-plan.tsv" <<'NODE'
const matrix = require(process.argv[2])
const raw = '3fr arw cr2 cr3 crw dng erf fff iiq kdc mef mrw nef orf pef raf rw2 srw x3f'.split(' ')
const emit = (batch, item, expected = []) => {
  const name = require('node:path').basename(item.resourceId)
  const text = expected.join('|')
  if ([name, text].some((value) => /[\t\r\n]/.test(value))) throw new Error('Invalid fixture plan field')
  console.log([batch, name, item.sha256, text].join('\t'))
}
for (const ext of raw) emit('raw', matrix.inputExtensions[ext].candidate)
emit('vector', matrix.inputExtensions.ai.candidate)
for (const item of matrix.ocrCandidates || [])
  emit(item.resourceId.toLowerCase().endsWith('.ai') ? 'vectorOcr' : 'rawOcr', item, item.expectedText || [])
for (const item of matrix.legacyReplayFixtures.files) {
  const ext = item.resourceId.split('.').pop().toLowerCase()
  const batch = ['wps', 'wpt', 'wpd'].includes(ext) ? 'legacyDoc'
    : ['et', 'ett'].includes(ext) ? 'legacySheet'
      : ['dps', 'dpt'].includes(ext) ? 'legacySlide' : ext === 'ofd' ? 'ofd' : null
  if (batch) emit(batch, item, item.expectedText || [])
}
NODE
  while IFS=$'\t' read -r batch name sha expected; do
    label="$batch-${name%.*}-${sha:0:8}"
    [[ -z "$selected" || "$selected" == "$batch" || "$selected" == "$label" ]] || continue
    mapfile -t matches < <(find "$fixtures" -type f -name "$name" -print)
    if (( ${#matches[@]} != 1 )) || [[ "$(sha256sum "${matches[0]:-/dev/null}" | cut -d ' ' -f 1)" != "$sha" ]]; then
      printf '%s\t%s\tnot-run-fixture\t\t\n' "$label" "$batch" >>"$run_dir/status.tsv"
      failed=1
      run_count=$((run_count + 1))
      continue
    fi
    sample="/parity-fixtures/${matches[0]#"$fixtures"/}"
    case "$batch" in
      raw) run_case "$label" "$batch" -e "CONVERSION_RAW_SAMPLE=$sample" ;;
      rawOcr|vectorOcr)
        if [[ -z "$expected" ]]; then
          printf '%s\t%s\tnot-run-expectation\t\t\n' "$label" "$batch" >>"$run_dir/status.tsv"
          failed=1; run_count=$((run_count + 1)); continue
        fi
        if [[ "$batch" == rawOcr ]]; then key=CONVERSION_RAW_SAMPLE
        else key=CONVERSION_VECTOR_SAMPLE; fi
        run_case "$label" "$batch" -e "$key=$sample" \
          -e "CONVERSION_RAW_OCR_EXPECT=${expected%%|*}" ;;
      vector) run_case "$label" "$batch" -e "CONVERSION_VECTOR_SAMPLE=$sample" ;;
      legacyDoc|legacySheet|legacySlide|ofd)
        if [[ -z "$expected" ]]; then
          printf '%s\t%s\tnot-run-expectation\t\t\n' "$label" "$batch" >>"$run_dir/status.tsv"
          failed=1; run_count=$((run_count + 1)); continue
        fi
        case "$batch" in
          legacyDoc) key=CONVERSION_LEGACY_DOCUMENT_SAMPLE; cue=CONVERSION_LEGACY_EXPECT ;;
          legacySheet) key=CONVERSION_LEGACY_SHEET_SAMPLE; cue=CONVERSION_LEGACY_SHEET_EXPECT ;;
          legacySlide) key=CONVERSION_LEGACY_PRESENTATION_SAMPLE; cue=CONVERSION_LEGACY_PRESENTATION_EXPECT ;;
          ofd) key=CONVERSION_OFD_SAMPLE; cue=CONVERSION_OFD_EXPECT; expected=${expected%%|*} ;;
        esac
        run_case "$label" "$batch" -e "$key=$sample" -e "$cue=$expected" ;;
    esac
  done <"$run_dir/external-plan.tsv"
fi

printf 'Evidence: %s\n' "$run_dir"
if [[ -n "$selected" ]] && (( run_count == 0 )); then
  echo "No case selected: $selected" >&2
  exit 2
fi
exit "$failed"
