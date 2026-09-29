# Original 0.7.10 conversion options: Linux coverage

The desktop options below come from `vendor/flyingmouse-format/upstream-a7b9b15/public/index.html` and `public/app.js`. The previous isolated `options` run exited successfully but recorded **zero pair-quality events**; an exit code is not evidence that every visible value works. The expanded authenticated checks in `verify-local-original-conversion.cjs` are pending a fresh run. Each new value writes an operation-quality row with the requested option, input/output hashes and a content or decoded-frame assertion. These rows do not count as additional format pairs in the 1,174-pair catalog.

| Original control | Values or behavior | Evidence before expansion | Outstanding boundary |
| --- | --- | --- | --- |
| Text source encoding | `auto`, `utf-8`, `gb18030`, `utf-16le`, `utf-16be` | Three explicit encodings compared extracted Chinese EPUB text from backend and original CLI | Fresh run of all five values; `auto` is tested with UTF-8, not BOM-based UTF-16 |
| Video codec | `h264`, `h265`, `av1` for MP4, MOV and MKV | Three values tested only for WebM→MP4 | Fresh run of all nine target/codec combinations; other source codecs remain separate input tests |
| Transparent video background | `white`, `black`, `0x00ff00`, `0xff00ff` | Only an extra `#0000ff` custom value had a decoded color assertion | Fresh run of the four visible values and the existing custom regression |
| PDF action | Split, encrypt, decrypt and merge | Group split by two pages, one merge, encrypted and decrypted sample in earlier baseline and options runs | The `page` split setting and multiple group sizes need explicit checks; password error handling remains distinct |
| Multi-image PDF mode | Merge or one PDF per image | Merge tested; `separate` is client-side dispatch to individual `convert:pdf` jobs | Verify both outputs and their input order through the mini-program; the batch runner does not exercise the desktop client branch |
| Insert blank PDF pages | Repeated zero-based positions before, between or after uploaded images | **Backend missing:** catalog declares no `blanks` option and the worker sends `{}` for `images-to-pdf` | Add validated option to generated catalog and multipart engine request, then test page count, blank-page positions and invalid indices. The original accepts positions `0..N` for `N` real images; repeated positions mean consecutive blanks. |

The earlier option/control-flow log and the current shell checks cover only their stated assertions. Windows 0.7.10 output for the same option inputs has not been obtained. Any failing or unrun value remains unaccepted. The isolated production worker is unchanged while the expanded checks are being prepared.
