# Native JPEG 2000 repair acceptance

2026-09-30. Isolated Linux candidate only; production has not switched. This report does not establish Windows 0.7.10 equivalence or complete format coverage.

## Two independently identified defects

- Encoder codeblocks retained compressed data and pass buffers for every completed tile. The [patch](../../scripts/ffmpeg-patches/jpeg2000-encoder.patch) releases those buffers only after final packet encoding has copied every layer. Pixel/sample arrays, dimensions, arithmetic coding and rate-control settings are unchanged. Layer data pointers are cleared; subsequent frames reallocate the released buffers.
- The original SOP path cleared the packet header byte before writing the six-byte SOP marker. The subsequent bit writer ORed into an uncleared byte. Four of eleven midpoint-flat frames failed both native FFmpeg and independent OpenJPEG decoding in every tested SOP/EPH progression case. The patch moves the existing clear after SOP; without SOP it clears the same byte as before.

The original official baseline report remains `build/jp2-allocator/paired-results.jsonl`: 24/34 pass, ten baseline SOP failures. Invalid original output is not an accepted reference. The repaired memory comparison uses a SOP-only baseline and a memory+SOP candidate. Both use the same source archive, compiler and minimal build configuration.

## Identities

| Artifact | SHA-256 |
| --- | --- |
| Official FFmpeg 8.1.1 archive | `b6863adde98898f42602017462871b5f6333e65aec803fdd7a6308639c52edf3` |
| Original `j2kenc.c` | `eb328476ce7419f3c8be3105eb61df14d903a855fdc62d0999a84c14bc53b06a` |
| SOP-only source | `e24b932e684496323c4b0acb964cce1e631484bc86b82e72ee6606a319ae9eb5` |
| Memory+SOP source | `53998376db9bda077e262abaa6a1046988c8cafe894130688bb89adda3cdf308` |
| Minimal SOP-only FFmpeg | `263e38a5cd021b32100bb6cf92af88303cc1097f742034062c6d0627b504342e` |
| Minimal memory+SOP FFmpeg | `e8041e9135171308b7cefb9f3e82a63fad054a169e829ec9aac13f67c366135c` |
| Full candidate `libavcodec.so.62` | `91489cbbce0a70780117b2bcf57780ab1dd93b76403f6b09d01b5bd46c11ce0d` |

The full build retains existing AVS/EVC/SVG and other codec flags. Candidate worker image is `sha256:8937089153cd37f5be990fb9872e4fbe9f8dff1c38357cc51c55b6707d98ba45`; it overlays the prior isolated 70a630e image rather than claiming a complete fresh Dockerfile build. Compiler source/config/binary inventories were preserved before deleting reproducible compiler objects. Installed engines, encoded output, original failed reports and logs remain.

## Paired checks

The [verifier](../../scripts/flyingmouse-jpeg2000-check.py) retains all eleven encoded frame files per binary and compares full file hashes, frame counts, dimensions and complete decoded RGBA64 pixels. Independent Pillow/OpenJPEG must load every frame. It covers default JP2/J2K, one/two encoder threads, DWT53/DWT97, quality/rate settings, five SOP/EPH progression orders, grayscale16/RGB48/YUV10/YUVA16.

First repaired attempts were incomplete because decoded scratch would breach the three-GiB disk reserve while other builds or large-file checks ran. Reports `paired-sop/paired-results.jsonl` and `paired-sop/paired-v2-results.jsonl` retain those failures; skipped cases are not counted as accepted.

Serial v3 (`paired-sop/paired-v3-results.jsonl`) completed 34/34 in 242.04 seconds, exit zero, no container OOM. All encoded bytes and complete decoded pixel streams match the SOP-only baseline. However, its frozen-source lossless check normalized YUV through RGB, which can hide plane changes through clipping/rounding. Those results establish candidate/baseline byte identity but do not independently prove source YUV-plane losslessness. Source/baseline/candidate RGB normalization cannot replace a complete native-plane check.

Serial v4 (`paired-sop/paired-v4-results.jsonl`) adds canonical source-format plane hashes/counts and validates decoder pixel formats. It completed **34/34**, 296.29 seconds, exit zero, no container OOM. Every declared lossless case equals the complete frozen-source canonical byte stream and RGBA64 stream. All encoded frames, metadata, native-plane pixels and independent OpenJPEG outputs equal the SOP-only baseline. Verifier SHA-256 is `7b9951c9634d4f8b4b1ea00017ddba7453d2fc810108c36708044630372cd73d`; binary and verifier hashes are retained in `paired-v4-identities.sha256`.

Canonical formats are RGB24, gray16LE, RGB48LE, YUV420P10LE and YUVA444P16LE. The 65×33 YUV10 fixture has 6,534 bytes per frame (71,874 over eleven frames); YUVA16 has 17,160 bytes per frame (188,760 total). Decoder validation allows reversible layout/endian changes and depth promotion, while rejecting changed color space/chroma sampling, reduced depth or lost alpha; decoded output must still return byte-exact source samples for lossless cases. A mock regression confirms that unchanged normalized RGB cannot hide changed YUV planes.

## Real large RAW and runtime scope

[FFF/ARW replay](raw-memory-diagnostic.md) passed all three previous failures through authenticated upload/job/download. FFF→JP2 exactly retains the original single-thread 46,364,166-byte output, SHA-256 `54c170d033cfcc31970f89a89cbbdaa4594545fc4c2c4ffa4a8fdefbd06f3b0d`. No pixel or quality reduction was introduced.

The runtime uses one output encoder thread only for JP2/J2K; output auto-threading still exceeds four GiB for this FFF even with buffer release. Static-image video separately bounds input, filter and output threads, preserving original codecs/options. Ordinary media conversion is unchanged. Eight-GiB replay passes; production's four-GiB budget remains insufficient for the large MP4 case. Production rollout, all changed image/video routes, the complete format matrix and actual Windows output comparison remain unaccepted.
