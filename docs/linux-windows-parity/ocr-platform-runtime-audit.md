# OCR runtime parity audit (2026-09-29)

Scope: two frozen, synthetic PNGs in [`fixtures/ocr`](fixtures/ocr), original `prepareImageForOcr` and `recognizeImageResultWithWorker` parameters, isolated `--network none` Docker runs. This is evidence about Linux candidates `48d7c15` and `b801ba9`; the published Windows 0.7.10 application has not executed either input.

| Component | Windows 0.7.10 evidence | Linux `b801ba9` measured |
| --- | --- | --- |
| JavaScript dependencies | The [prior source audit](engine-audit.md) reports that published build commit `5d90f84` and pinned `a7b9b15` have the same runtime files and lock. The lock fixes `tesseract.js` 7.0.0, `tesseract.js-core` 7.0.0, `sharp` 0.35.4, `@img/sharp-win32-x64` 0.35.4, and Electron 43.1.0. The Windows installer `node_modules`, Electron executable/V8 version, and actual OCR core selection were not extracted or run. | Node 24.21.0, `tesseract.js` 7.0.0, `tesseract.js-core` 7.0.0, Sharp 0.35.4, libvips 8.18.6. |
| Models | The SHA-verified Windows core asset contains `eng.traineddata.gz` SHA-256 `45b4cb346724ac1774f1c36f42f182b887bcdb28ebe63e6fff90ac41f3fcff91` and `chi_sim.traineddata.gz` SHA-256 `b8a23f10c7de500891eb458a8adc9cc58ab7f242f08b7d149f5e9aea4ad5db7c`. | `/opt/flyingmouse-tessdata` has these exact compressed bytes. `ocr.js` requests `eng+chi_sim`, OEM 1, 300 DPI and no cache. |
| Core | The lock fixes the npm package integrity; the core variant selected by Windows CPU/V8 feature detection is unknown. | Actual `createOcrWorker()` module-load trace selected `tesseract.js-core/tesseract-core-relaxedsimd` in both `48d7c15` and `b801ba9`. Its `.wasm` SHA-256 is `45f8c9b516df326b6ae6b493ed3a6289df5cbd10490e7b6ff8bf5b12ea42d1da`; `.wasm.js` SHA-256 is `843074aa5bad1cc6421b74a86201768ced9f244795e4d81435435a61a40ce535`. These equal the locally cached pinned npm 7.0.0 package bytes. |
| Image library | The lock selects a Windows native Sharp binary; its installed libvips version and output pixels have not been measured. | Linux native Sharp uses libvips 8.18.6. Its platform binary differs from macOS, as expected. |

The `tesseract.js` 7.0.0 worker calls `getCore(lstmOnly, ...)` with a boolean; its Node loader compares that argument with numeric OEM values before choosing an `-lstm` filename. The measured Linux call selected the non-`-lstm` name above. This is npm package behavior common to the locked source, not evidence that the Windows build took the same CPU-feature branch. Do not infer a Windows result from Electron's locked version alone.

## Prepared pixels

Both runs used the same frozen input bytes and original preprocessing order: auto-orient, white flatten, grayscale, normalize, sharpen sigma 1, width 2480, PNG. The Linux maximum-pixel guard does not activate for these inputs. Decoded RGB pixel bytes were compared, not only PNG container hashes.

| Input | macOS prepared PNG SHA-256 | Linux `48d7c15` prepared PNG SHA-256 | RGB comparison |
| --- | --- | --- | --- |
| `false-deskew.png` (input SHA-256 `67d1c1113635641cc8f327bf0029320be13a85a56e5f602465e37983a3c9bfa1`) | `4b90c7795662a9d111ac052b6cb3c13d0c57497c681b7ed381bb3bbc88134669` | same; `b801ba9` also same | All 9,843,120 channel bytes equal; RGB SHA-256 `6a75e2edecab0091a15c02ce5fd9c6ce330373302ef6ce2f01062993cc26a158`. |
| `invoice-skew5.png` (input SHA-256 `fbd86c070b3fcc1a293a917808713669891ee6388c17213eabe5f292ee19e3c8`) | `b8650e0305cb4c933c9087f90c99641aad70994b41ef3516ac6dcbdad465a9f1` | `5d9dd078fbaa9ff65b6c90d980696d158c1bf9b9b1ec75236f268812cf879ffb` | 6 of 11,784,960 channel bytes differ, each by 1; macOS RGB SHA-256 `0351b4dcd448ed4b9b87ba95847f0721fd8067424095cd0d8402a71cefe0830e`, Linux `9c053f6b9261459d91ebfee755752f4b8d4c7d28c241d7614e5ab4f657e10034`. |

This comparison is macOS versus Linux, not Windows versus Linux. The six channel bytes differing by one gray level establish a small native preprocessing difference on the skewed input; they do not establish its effect on recognition. The false-deskew prepared bytes are exactly the same across the two measured platforms.

## Isolated Linux core-variant experiment

The audit preloaded an in-process replacement for only `wasm-feature-detect.simd()` and `relaxedSimd()` in an isolated container, forcing scalar, SIMD or relaxed SIMD core selection. It left the original OCR module, model files, OEM, languages, `rotateAuto:true`, PSM 6, DPI and candidate ranking unchanged. Module-load traces confirmed the selected core. Each run also called the original public image OCR route. JSON and trace files are retained under `/root/deployment-verification/linux-windows-parity/ocr-runtime-audit/{scalar,simd,relaxedsimd}.{json,stderr}`; the three JSON SHA-256 values in that order are `bbb23b8810361fd57d9da82acc6238edd6b5bd67f326a43fed3a3481c7ec6791`, `9641ce599f8756761f3e35e5e0007e3ab807f14fc2ffba4cf6d9a3155ffda4f2`, and `dd241f2e3b86e0b9f26129cdff76ba92100bfee80425e13d61a22e82c07a92b8`. No backend task was started.

| Forced selected core | `.wasm` SHA-256 | `false-deskew.png` original output and PSM 6 angle | `invoice-skew5.png` original output and PSM 6 angle |
| --- | --- | --- | --- |
| `tesseract-core` | `c7f5ace62ac0ad065e71e9c6725f1d7cdf82e7eda8fba532cbb9563964da7098` | `星窗助手 12345`, confidence 89, angle 1.048° | `采购明细单`; `| ]窗订单 474.00`; `安装费用 712.00`; `合计 1186.00`, confidence 84, angle −4.202° |
| `tesseract-core-simd` | `7d237a13edfeb0fa2f104744fccde0a00e0c076c3e23b7a8fc7af75ec9af2c3e` | Same text, confidence and angle | Same text, confidence and angle |
| `tesseract-core-relaxedsimd` (natural Linux selection) | `45f8c9b516df326b6ae6b493ed3a6289df5cbd10490e7b6ff8bf5b12ea42d1da` | Same text, confidence and angle | Same text, confidence and angle |

All three core variants still lose the visible `量` or `门` glyph. Selecting a different one of these packaged cores is therefore not a repair for either tested Linux failure. The near-identical prepared pixels and byte-identical Linux/Mac npm core package narrow the measured discrepancy, but do not prove Windows OCR parity. A Windows reference run must record its installed `sharp`/libvips version, V8 feature detection, selected core SHA, prepared RGB SHA, and text on these exact input hashes before attributing the remaining failures to the shared OCR algorithm or a Windows-specific dependency.
