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

A separate networkless container ran the same FFF with 4 GiB, 2 CPU and 128 PIDs. Original TIFF preparation succeeded in 16.01 seconds, peak 677,769,216 bytes. FFmpeg input/output threads and filter threads were set to one; all other JP2 and MP4 arguments retained the original settings. JP2 was killed after 25.78 seconds, MP4 after 8.90 seconds; cgroup peak reached 4,294,967,296 bytes and `oom_kill` increased to two. Merely limiting threads does not establish a fix. **No thread patch was added to the conversion core.**

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

**Replay results pending.** The first FFF failures remain failed until an authenticated upload/convert/download and full-pixel comparison passes. Windows 0.7.10 has not run this exact file; a passing Linux replay would not establish Windows parity or the production 4 GiB capacity.
