# FFmpeg input decoder audit (2026-09-29)

Scope: pinned Windows FFmpeg executable versus isolated Linux image `jiujiu-conversion-worker:linux-parity-48d7c15`. The Windows executable SHA-256 is `09948d4cdd0650da6ff5a87577469f2a218dc2615ae379f8f734d24c49de0f73`. Its embedded `configuration:` line has 100 `--enable-*` flags and two `--disable-*` flags; repeated copies of that line are not separate options. Windows decoding has **not** been executed on this Mac.

## Confirmed supported-container gap: EVC

FFmpeg 8.1.1 maps EVC to MP4/MOV (`evc1`); the original engine accepts MP4 input. The Windows build enables `libxevd`. Linux image `48d7c15` has no `evc` decoder. This is a real input-codec gap, not a missing extension or a renamed raw stream.

| Evidence | Value |
| --- | --- |
| Official input | [FFmpeg FATE `evc/akiyo_cif.evc`](https://fate-suite.ffmpeg.org/evc/akiyo_cif.evc), also used by FFmpeg 8.1.1 `tests/fate/lavf-container.mak:99`; hash-locked test input is in [`evc-fixtures.json`](evc-fixtures.json) |
| Input SHA-256 | `f3ef572163a9354415ab380063137c0907df9cd097c22a7b6be65b351d3c6405` (34,071 bytes) |
| Sample licensing | The FATE file and directory listing state no license; only URL, hash, and test commands are committed, not sample bytes. |
| Remux command | `ffmpeg -f evc -i akiyo_cif.evc -c:v copy akiyo_cif.mp4` (local FFmpeg 9.0.1) |
| MP4 SHA-256 | `0f8cb4ed2713186cbc2081cca5d95503cefbd5214bdf899b421ed344d635b83f` (37,390 bytes) |
| Container proof | `ffprobe`: `mov,mp4,m4a,3gp,3g2,mj2`; video `evc`, tag `evc1`, Baseline, 352×288, 300 frames, 12 s |
| Linux direct result | `/opt/ffmpeg-8.1.1/bin/ffmpeg -i akiyo_cif.mp4 -frames:v 1 -f null -`: `Decoding requested, but no decoder found for: evc`, exit 234 |
| Linux original CLI result | `node /app/flyingmouse/cli.js convert akiyo_cif.mp4 --to gif --json`: `ok:false`, `errorCode:234`, same decoder error, exit 1 |

Both negative runs used `docker run --rm --network none` with the sample mounted read-only; they did not use the running worker. The CLI conversion reached the original FFmpeg path. A backend API job has not yet been run with this fixture.

### Minimal candidate build input

FFmpeg 8.1.1 `configure` requires `xevd >= 0.4.1` through `pkg-config`, header `xevd.h`, and symbol `xevd_decode`. The official [mpeg5/xevd](https://github.com/mpeg5/xevd) `v0.4.1` archive (commit `4e76654c5f2595d8e24d7577ebe9b92cdfdb442f`, SHA-256 `76a72ddce00642f75f5896e11ee960293640af2e8a41f9e641e1b9310348e19a`) was tried as the minimum compatible release. Its CMake default `SET_PROF=MAIN` builds and installs `libxevd.so`, `xevd.h`, and `xevd.pc`; `BASE` would install `xevdb` instead. Upstream lists CMake ≥3.5 and GCC ≥5.4.

The `v0.4.1` tag archive has neither `.git` nor `version.txt`; isolated build v1 failed at CMake's version check. Adding `printf 'v0.4.1\n' > /tmp/xevd-0.4.1/version.txt` passed that check, but build v2 failed under GCC 12 because upstream code triggers a dangling-pointer warning treated as an error. Disabling warnings would conceal a real compiler finding. The upstream fix (`13b86a74e26df979dd1cc3a1cb19bf1ac828e197`) is included in official `v0.7.0` (2026-08-07), whose archive supplies `version.txt`.

The current candidate uses official `v0.7.0`, archive `https://github.com/mpeg5/xevd/archive/refs/tags/v0.7.0.tar.gz`, SHA-256 `febfdb532819bbf36b1b04e74d3ef328ad0f0f2db6224ddb7640fce6bd0014f4`. Build with `cmake -S ... -B ... -DSET_PROF=MAIN -DCMAKE_BUILD_TYPE=Release -DCMAKE_INSTALL_PREFIX=/opt/xevd-0.7.0`, then `cmake --build ... -j2 && cmake --install ...`. For `Dockerfile.conversion-worker`, an isolated `xevd-build` stage requires `ca-certificates curl build-essential cmake`; copy `/opt/xevd-0.7.0` into `ffmpeg-build`, add `/opt/xevd-0.7.0/lib/pkgconfig` to its `PKG_CONFIG_PATH`, add `--enable-libxevd`, then copy the library into the final image and add `/opt/xevd-0.7.0/lib` to `LD_LIBRARY_PATH`. Keep `SET_PROF=MAIN`, which covers the FATE Baseline sample and Main streams. Isolated FFmpeg build stage v3 completed; the combined runtime image, EVC direct decode, original CLI, and backend batch have not yet been validated. The version of `libxevd` used by the Windows executable is unknown, so passing this decoder does not establish binary-identical decoding.

Success gate: `ffmpeg -decoders` lists `evc`/`libxevd`; direct decode writes at least one frame; original CLI MP4→GIF returns `ok:true` with a decodable nonempty output; then run the same fixture through the backend job path and compare outputs.

## Other Windows external decoders

The Windows build configuration enables 23 external decoder entries. Linux `48d7c15` has eight of those entries: `libaom-av1`, `libdavs2`, `libuavs3d`, `libjxl` and `libjxl_anim`, `libopus`, `libvpx-vp8`, `libvpx-vp9`. Linux has native/other-library decoders for the same bitstreams as Windows `libdav1d` (AV1), `libgsm`/`libgsm_ms`, `libilbc`, `libopencore_amrnb`/`libopencore_amrwb`, `libspeex`, and `libvorbis`. Their external library absence alone does not establish an input gap.

The remaining missing external decoders without a same-codec Linux decoder are `libcodec2`, `liblc3`, `libsvtjpegxs` (JPEG XS), `libaribb24`, `libaribcaption`, `libzvbi_teletext`, and `libxevd` (EVC). FFmpeg 8.1.1 maps Codec2 and LC3 to raw demuxers (`.c2`, `.lc3`), neither advertised as an original-engine input extension; JPEG XS is mapped in MPEG-TS, which is also not advertised. ARIB and teletext are subtitle streams whose conversion behavior requires an actual stream fixture. These remain capability differences, not observed failures of a supported input pair. Native `apv` and `jpeg2000` decoders exist on Linux; do not count Windows `liboapv` or encoder-only `libopenjpeg` as confirmed missing input codecs.

The original Windows build lacks `--enable-librsvg`; `--enable-cairo --enable-libxml2` do not create an SVG FFmpeg decoder in 8.1.1. Linux `48d7c15` includes `librsvg`; this closes the separately observed SVG→FFmpeg-target failures but has not established identical SVG rendering to Windows.
