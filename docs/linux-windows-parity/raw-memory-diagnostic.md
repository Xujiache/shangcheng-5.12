# Large RAW resource and checker diagnostic

2026-09-30 (Asia/Shanghai). FFF fixture SHA-256 `209d464e13702de5f4fdb830ac26ac140c98a8d0dc3e81c5ba61d93677330832`; decoded TIFF is 7327 × 5502 RGB24 (40,313,154 pixels). Neither image dimensions nor codec quality settings have been reduced.

## Observed failures

The first `70a630e` RAW run, `e2e/artifacts/run-20260929T160832Z-2181227/`, passed 14/16 FFF targets. JP2 and MP4 failed during direct original CLI conversion, before submitting a backend job. Kernel logs establish **cgroup OOM kills**, not missing encoders or the original five/ten-minute timeout:

| Target | Kernel timestamp (UTC) | FFmpeg PID | Anonymous RSS at kill |
| --- | --- | ---: | ---: |
| JP2 | 2026-09-29 17:07:41 | 2272768 | 7,586,480 KiB |
| MP4 | 2026-09-29 17:10:40 | 2276573 | 7,509,092 KiB |

These native processes shared their 8 GiB container budget with the verifier. The original checker retained full RGB buffers for direct and backend outputs, allocated another entire blank-comparison buffer, and used synchronous child-output buffering. The excess checker cost is a candidate explanation, not yet proof that either conversion fits in 8 GiB.

## Isolated thread trial

A separate networkless container ran the same FFF with 4 GiB, 2 CPU and 128 PIDs. Original TIFF preparation succeeded in 16.01 seconds, peak 677,769,216 bytes. FFmpeg input/output threads and filter threads were set to one; all other JP2 and MP4 arguments retained the original settings. JP2 was killed after 25.78 seconds, MP4 after 8.90 seconds; cgroup peak reached 4,294,967,296 bytes and `oom_kill` increased to two. Merely limiting threads does not establish a fix. No thread patch was added at this stage; the separately verified r18 candidate below includes bounded threads.

Server diagnostic root: `/root/deployment-verification/linux-windows-parity/build/fff-thread-diagnostic/`.

| File | SHA-256 |
| --- | --- |
| `probe.py` | `ec15679c3b5d21bf25041c19fffcf7fc0060a2d595aa21f7b86a92b28149af17` |
| `result-4g.jsonl` | `d420956dc9f8bd3192d8c7801b7f4eee7580fa9f1703084e21f4b563aa88d19c` |
| `original-8g-oom.log` | `ef3b7343d280acc490086154282cac709b1e82716d1fce923545b9095417546c` |

## Checker repair and replay

Commit `8f11e36` streams all decoded RGB bytes through SHA-256, requires exactly width × height × 3 bytes and a nonzero pixel, and compares both image dimensions and the complete pixel digest. [Checker tests](../../scripts/flyingmouse-pixel-check.test.cjs) detect a changed last pixel, truncated/excess/blank output, decoder failure and timeout. A separate checker process with a 32 MiB Node heap checks a 144 MiB stream while its RSS growth stays below the size of one complete image; commit `0cfcc1e` isolates that measurement from test-runner allocations. All three tests pass. The first RSS assertion passed with a constrained test-runner heap but failed with its default heap; the correction isolates the checker and its GC budget without changing the RGB check.

Only the original RAW launcher was temporarily stopped; its in-flight case continued. MEF completed all 16 targets. The first replay never entered Node: Docker could not create a new file bind target under the read-only checkout, exit 125 for both retry containers. Its logs remain in `e2e/artifacts/run-stream-pixels-20260929T181016Z-2358933/`; the two never-started containers were removed. This is a runner mount error, not conversion evidence.

The corrected replay waits for the next in-flight MRW case to finish, runs FFF→JP2/MP4 and ARW→JP2 with the repaired verifier, then resumes the same original launcher. It mounts a copied scripts directory (all prior scripts unchanged, plus the RGB helper) over the existing directory mount target. API and worker images stay `70a630e`; engine r17 is unchanged. Only the verifier and helper code differ, as a recorded `0cfcc1e` overlay; it records each file hash, image ID, cgroup peak and OOM events in a new artifact directory. The active RAW checkout was not pulled or modified mid-run.

Replay `run-stream-pixels-20260929T181948Z-2377028` completed: ARW→JP2 passed authenticated upload/conversion/download and complete RGB/dimension comparison, peak 1,487,048,704 bytes, no OOM. FFF→JP2/MP4 still died in the direct CLI before any backend job, peak 8,589,934,592 bytes, six OOM events and two OOM kills. The earlier `run-stream-pixels-20260929T181401Z-2363267` failed UID-read preflight (`EACCES`); it submitted no conversion jobs and is retained as a runner failure.

The first complete RAW batch contains 19 input files × 16 non-OCR targets: 301 pass and three fail. The ARW replay is separate acceptance evidence; the original three failures remain in the first report. Windows 0.7.10 has not run these files.

## Eight-GiB single-thread diagnostic

A separate original FFmpeg 8.1.1 run retained all dimensions and codec settings, setting input/output and filter threads to one. JP2 succeeded in 24.85 s at 4,753,539,072 bytes peak; MP4 succeeded in 111.34 s at 7,958,925,312 bytes peak. Both fully decoded. JP2 SHA-256 is `54c170d033cfcc31970f89a89cbbdaa4594545fc4c2c4ffa4a8fdefbd06f3b0d`; MP4 is `af0e6240f7fb877f5eedff1435195a8fe7358ceb0be4e60c18230878a310981a`. MP4 is the original even-width 7326 × 5502 H.264/YUV420P, exactly 3 seconds. This standalone run is not backend acceptance and does not fit the production four-GiB limit.

## Native JPEG 2000 candidate

The official encoder retained each completed tile's compressed codeblock/pass buffers until shutdown. The candidate frees them only after all final packet layers have copied their bytes; it retains sample data, quality settings and packet content. Native frame encoder auto-thread initialization still allocates multiple encoder contexts, so the runtime limits only JPEG 2000 output threads to one. Still-image video uses one input/filter/output thread; ordinary media conversion is unchanged.

A full FFmpeg build retains the existing AVS/EVC/SVG and other codec flags. Memory-only full-build FFF→JP2 succeeds inside four GiB in 22.29 s, peak 1,519,230,976 bytes. Its complete 46,364,166-byte output exactly matches the unmodified original single-thread SHA-256 above; Pillow/OpenJPEG fully decodes 7327 × 5502 RGB, pixel SHA-256 `110984d7cda50f155841a3521550cdd7a709c16dce3337560b159e32d19c169c`. Default output threading still OOMs; input-only threading also OOMs. Output-only threading succeeds and preserves that file hash; its memory peak is not separately measured because it shares the earlier OOM cgroup.

The first synthetic run passed 24/34 paired checks. All ten SOP/EPH progression cases failed in the unchanged baseline, before candidate evaluation. Independent native and OpenJPEG decoders reject the same four midpoint-flat frames. Original code clears a packet-header byte before writing SOP; the subsequent OR-based bit writer uses an uncleared byte after the six-byte SOP marker. The separate correction moves the clear after SOP. With SOP disabled it clears exactly the same byte.

The [tracked check](../../scripts/flyingmouse-jpeg2000-check.py) evaluates both binaries independently, compares all eleven frame files and complete decoded pixels, checks lossless output against frozen source pixels and canonical planes, and loads each frame through independent Pillow/OpenJPEG. It covers default JP2/J2K, two thread counts, both DWT modes, quality/rate control, all five progression orders, 16-bit color and alpha. SOP-only baseline is compared against memory+SOP candidate, retaining the original failed report. Earlier repaired runs stopped at the three-GiB disk reserve during concurrent build/large-file activity; those partial reports remain. After preserving source/config/binary hashes and deleting only reproducible compiler trees, serial v3 passed 34/34; the stronger canonical-plane v4 also passed 34/34, exit zero and no OOM. Encoded files, original reports and installed engines are retained. [Full encoder evidence](jpeg2000-encoder-diagnostic.md).

Current isolated r18 overlay image: `sha256:8937089153cd37f5be990fb9872e4fbe9f8dff1c38357cc51c55b6707d98ba45`. Full candidate `libavcodec.so.62` SHA-256: `91489cbbce0a70780117b2bcf57780ab1dd93b76403f6b09d01b5bd46c11ce0d`. Source archive SHA-256 is `b6863adde98898f42602017462871b5f6333e65aec803fdd7a6308639c52edf3`; full patched `j2kenc.c` is `53998376db9bda077e262abaa6a1046988c8cafe894130688bb89adda3cdf308`.

## Authenticated r18 replay

`e2e/artifacts/run-r18-raw-retry-20260929T191806Z-2501671/` completed all three previously failed pairs: FFF→JP2, FFF→MP4 and ARW→JP2. Each performed direct conversion, authenticated upload/job/download and complete decoded-pixel/dimension comparison. FFF backend files exactly retain the original single-thread SHA-256 and byte counts above. The two FFF jobs are `cmun27ypu01vrmaofc5140tav` and `cmun2cx1401w5maofjw8tz7y9`.

FFF runner peak was 8,118,878,208 bytes; ARW runner peak was 393,043,968 bytes. The shared isolated worker peaked at 8,316,755,968 bytes across these jobs. All three cgroups recorded zero OOM events/kills. These are container-wide peaks, not measurements of an individual codec allocation. This proves the complete replay within eight GiB; it does not prove production's four-GiB allowance is sufficient. No resize, quality reduction or truncation was added.

This three-pair replay is separate from the earlier 301/304 batch and does not establish that all 304 pairs have rerun under r18. Native encoder option checks passed as described above; broader image/video regressions and production resource acceptance remain required. Production image is unchanged. Following the user's runtime constraint, no Mac backend or new WeChat DevTools preview is started; heavy acceptance runs only on the server.
