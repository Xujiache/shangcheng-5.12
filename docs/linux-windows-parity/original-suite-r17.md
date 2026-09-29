# Original FlyingMouse suite on Linux, platform fixes r17

Run date: 2026-09-29. This is the unmodified original test suite against an isolated runtime copy. The production worker, production image, and running parity worker were not changed.

## Provenance and setup

- Base image: `jiujiu-conversion-worker:linux-parity-dbc7eac`, image ID `sha256:777cf997c0181a5d5f46e7bf9122e745198b43d935ae0187c49dd3a165cd5cba`. The container runs Node.js 24.21.0. It has the original engine resources but no `npm` or `ps` binary.
- Test copy: `/root/deployment-verification/linux-windows-parity/original-test-support-r17/source` on the isolated Linux server. All 307 files (6,725,548 bytes) came from `vendor/flyingmouse-format/upstream-a7b9b15` and were checked individually against `docs/flyingmouse-migration/source-a7b9b15-manifest.json` before copying. The source revision is `a7b9b15d32db80cecedae00e89289088656fb1ae`; the manifest SHA-256 is `cf20cbc23d8f676ece92c776d5f92586351e45c418ad5c5243207e74a4b07c5f`.
- Dependencies: the original `package.json` and `package-lock.json` in that 307-file set. The lockfile SHA-256 is `696e3c7472431309a0247a01a43c08230693fe90cf2adc3fe79a902719a568f5`. On the Linux host (Node.js 22.23.2, npm 10.9.8), `ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts --include=dev --no-audit --no-fund` installed the locked production and development dependencies into the test copy. Installed `@electron/asar` is 3.4.1 and `app-builder-lib` is 26.15.3. `node_modules` occupies 405 MB. The temporary npm cache was cleared after installation; the installed dependencies remain available for another run.
- Runtime fixes: `scripts/apply-flyingmouse-platform-fixes.cjs --in-place <test-copy>` from fix revision 17 (introduced in commit `684de86`), SHA-256 `fb7430aa8cbf46ae4b1d9b2bbff3432d485ffbaabcb5fb8ae2f777de2c6cde3d`. The resulting `.platform-fixes.json` records revision 17 and has SHA-256 `91439178c3d51fa452712808e44a24a33f5efea17acae812aa64bf94a0c476f5`. After patching, all 307 files were checked against either their original manifest hash or the corresponding r17 runtime hash; the patched OFD dependency was also hash-checked.
- The test copy's `bin` symlink points to `/app/flyingmouse/bin` inside the base image so tests use its existing native engines. `procps` was installed only inside each disposable test container with `apt-get update -qq` and `apt-get install -qq --no-install-recommends procps`. No development package or `procps` was added to the image.

The complete run mounted the test copy at `/test/source`, set `FLYINGMOUSE_SOURCE_DIR=/test/source`, retained the image's native-engine environment, and used a disposable container with `--memory 8g --cpus 2 --pids-limit 256 --user 0:0`. From `/test/source` it ran `node --test tests/*.test.js`, covering all 99 original `*.test.js` files. The same environment first ran `office-process.test.js` and `public-package.test.js` as a targeted check: 14/14 passed.

The dependency and test commands, after the verified 307-file copy, were:

```sh
cd /root/deployment-verification/linux-windows-parity/original-test-support-r17/source
ELECTRON_SKIP_BINARY_DOWNLOAD=1 npm ci --ignore-scripts --include=dev --no-audit --no-fund \
  --cache /root/deployment-verification/linux-windows-parity/original-test-support-r17/npm-cache
node ../scripts/apply-flyingmouse-platform-fixes.cjs --in-place "$PWD"
# Inside the disposable dbc7eac container, with the test copy mounted at /test/source:
apt-get update -qq
DEBIAN_FRONTEND=noninteractive apt-get install -qq --no-install-recommends procps
cd /test/source
node --test tests/*.test.js
```

## Result

| Tests | Passed | Failed | Skipped | Duration |
| ---: | ---: | ---: | ---: | ---: |
| 1,037 | 1,014 | 8 | 15 | 117,682 ms |

The prior `dbc7eac` run without these test dependencies recorded 1,031 tests, 995 passed, 22 failed, and 14 skipped. The four `office-process` failures caused by missing `ps` and the eight `public-package` failures caused by missing development dependencies are gone. The two PDF OCR failures are also gone with r17. The full suite **still fails**; the eight remaining failures were retained without filtering or changing tests.

| File | Failed test | Observed cause |
| --- | --- | --- |
| `desktop-entry-compat.test.js` | a usable explicit directory wins over Electron's default without copying default settings | Desktop boot calls `resolveRuntimePaths`; `Unsupported platform: linux`. |
| `desktop-entry-compat.test.js` | an explicit Unicode profile starts without changing its path or overwriting settings | Same Linux desktop platform gate. |
| `desktop-entry-compat.test.js` | a missing packaged native entry falls back to the existing runtime for taskbar relaunch | Same Linux desktop platform gate. |
| `desktop-entry-compat.test.js` | packaged skill installation and taskbar agree on the native entry | Same Linux desktop platform gate. |
| `desktop-entry-compat.test.js` | packaged skill installation and taskbar agree on the runtime fallback | Same Linux desktop platform gate. |
| `desktop-entry-compat.test.js` | development skill installation retains the runtime and source arguments | Same Linux desktop platform gate. |
| `desktop-shutdown.test.js` | actual desktop entry closes service and cancels owned work without synchronous directory deletion | Desktop startup enters its failure handler; the test's `dialog` mock lacks `showErrorBox`, producing `TypeError: dialog.showErrorBox is not a function`. |
| `desktop-shutdown.test.js` | CLI entry stops its own helper before exit and retains its result code (false) | The desktop CLI fixture records exit code 1 where the test expects 0; the Linux startup path is unsupported. |

These eight tests exercise Electron desktop startup, taskbar integration, or the desktop CLI fixture. Their failures happen before a backend API request, so they do not establish a failure of the Linux server API conversion path. They remain failures of the complete original suite. No Windows Word, WPS, or desktop acceptance is implied.

## Evidence and disk boundary

- Server log: `/root/deployment-verification/linux-windows-parity/original-test-support-r17/full-tests-r17.log`.
- Local copy: `.quality/linux-windows-parity/linux-runs/original-tests-r17-complete-deps.log` (ignored diagnostic file).
- Both logs SHA-256: `2f7257a27d9cf85ddc785085ca0e3f094f73aabf726c39a1380b17d9f93b3809`.
- Test dependency copy is retained for reruns. Its npm cache was removed; server free space after the run was about 3.55 GiB, above the required 3 GiB reserve.
