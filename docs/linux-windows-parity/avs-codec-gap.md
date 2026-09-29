# AVS2/AVS3 decoder gate

The original 0.7.10 Windows FFmpeg has `--enable-libdavs2 --enable-libuavs3d`. The Linux candidate image `jiujiu-conversion-worker:linux-parity-c093bb4` recognizes these codecs in MKV but has no decoder. Its isolated, networkless one-frame attempts exit 234 with `Decoding requested, but no decoder found`; exact stderr and input hashes are in [avs-codec-c093-evidence.json](avs-codec-c093-evidence.json). Full command/stdout/stderr/exit files remain at `/root/deployment-verification/linux-windows-parity/avs-codec-audit/` on `XLHY-149.88.73.215`. No production worker was used.

## Pinned public samples

All paths below are relative to that server audit directory. Download source repository: [`xatabhk/avs2-avs3-video-samples` at `f5e12f4540784fc6b16dd736caca9ffdac44b038`](https://github.com/xatabhk/avs2-avs3-video-samples/tree/f5e12f4540784fc6b16dd736caca9ffdac44b038). Keep samples outside Git; the sample repository does not state a standalone license. Its README identifies Big Buck Bunny and Elephant Dreams as underlying video sources; the Blender projects state [CC BY 3.0](https://peach.blender.org/about/) and [CC BY 2.5](https://orange.blender.org/download/) respectively. Do not infer that every sample or muxed audio/subtitle is redistributable from those film licenses.

| Local filename | Pinned download URL | Bytes | SHA256 | Stream evidence |
| --- | --- | ---: | --- | --- |
| `parity-test1-avs2.mkv` | [test1_avs2.mkv](https://raw.githubusercontent.com/xatabhk/avs2-avs3-video-samples/f5e12f4540784fc6b16dd736caca9ffdac44b038/test1_avs2.mkv) | 4,910,715 | `fcb1429017508937b257843e14762521b515616e2f2ff4b83ebf30afcd9f7ed2` | AVS2, 854×480; bit depth unverified without decoder |
| `parity-test5-avs3.mkv` | [test5_avs3.mkv](https://raw.githubusercontent.com/xatabhk/avs2-avs3-video-samples/f5e12f4540784fc6b16dd736caca9ffdac44b038/test5_avs3.mkv) | 4,357,022 | `174af739da3b2d7e0df0a72ff60e0b1e72e58243776c780e332261a485e0713a` | AVS3, 1024×576, `yuv420p` (8-bit) |
| `parity-avs3-10bit.mkv` | [jellyfish-640x360-avs3-10bit.mkv](https://raw.githubusercontent.com/xatabhk/avs2-avs3-video-samples/f5e12f4540784fc6b16dd736caca9ffdac44b038/jellyfish-640x360-avs3-10bit.mkv) | 290,627 | `6539a5db45966add6466704ec13a029998ecd1835c50dad8e90952cdc01ea16e` | AVS3, 640×360, `yuv420p10le` (10-bit) |

The first two files also exist locally as `/tmp/parity-test1-avs2.mkv` and `/tmp/parity-test5-avs3.mkv`; the third is `/tmp/parity-avs3-10bit.mkv`. The test checks hashes before invoking FFmpeg.

## Bit depth limits

The pinned [davs2 1.7 configure](https://github.com/pkuvcl/davs2/blob/1.7/build/linux/configure) defaults to 8-bit and rejects `--bit-depth=9` and `--bit-depth=10` as unsupported. Its 8-bit build rejects a different stream depth in [`header.cc`](https://github.com/pkuvcl/davs2/blob/1.7/source/common/header.cc). The proposed build therefore establishes only an AVS2 8-bit decoder. Windows binary 10-bit AVS2 behavior is unmeasured; an actual 10-bit sample and Windows reference are required before claiming parity.

The pinned [uavs3d 1.2 parser](https://github.com/uavs3/uavs3d/blob/1.2/source/decoder/parser.c) rejects 10-bit precision only when built for 8-bit; [`com_def.h`](https://github.com/uavs3/uavs3d/blob/1.2/source/decore/com_def.h) makes `COMPILE_10BIT=ON` use 16-bit pixels. This suggests the proposed 10-bit build can process both stream depths, but is not proof: both AVS3 samples must decode and produce a valid frame. Windows pixel equivalence remains a separate check.

## Run after candidate build

Mount the audit directory read/write so the check can save JSON. The script verifies input SHA, requests exactly one RGB24 frame, checks dimensions and one SHA256 framehash, and exits nonzero on any failure. It does not mark Windows parity.

```sh
docker run --rm --network none --read-only --user 0 --memory 1g --cpus 1 \
  -v /root/deployment-verification/linux-windows-parity/avs-codec-audit:/samples \
  -v "$PWD":/parity-src:ro \
  --entrypoint node "$PARITY_WORKER_IMAGE" \
  /parity-src/scripts/flyingmouse-avs-decode-check.cjs \
  --ffmpeg /opt/ffmpeg-8.1.1/bin/ffmpeg --samples /samples \
  --out /samples/candidate-decode-evidence.json
```

Run from the checked-out repository so the script and hash-locked `avs-fixtures.json` are mounted together. Compare output pixel hashes with Windows on the same samples and options when a Windows reference runner is available; a local successful decode alone is a capability check.

The `linux-parity-dbc7eac` isolated runtime decoded all three samples. The result is retained as `candidate-dbc7eac-decode-evidence.json` in the audit directory. Its authenticated `avs` batch additionally converts each complete source to MP4, MOV, WebM and GIF, checks source duration and dimensions (including the original GIF scaling rule), and compares decoded frames/audio against the direct original CLI. Stage test inputs under the private fixture root's `avs/` directory. These outputs still require the Windows comparison.
