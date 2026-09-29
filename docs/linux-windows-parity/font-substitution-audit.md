# Office font substitution audit (2026-09-29)

Read-only snapshot of isolated image `jiujiu-conversion-worker:linux-parity-48d7c15`. Its runtime sets `FONTCONFIG_PATH=/opt/poppler-deps/etc/fonts` and installs `fonts-noto-cjk` plus a static Noto Sans CJK SC font for OFD. The original Windows engine archive has 47 font binaries (31 Poppler, 14 qpdf documentation, two LibreOffice OpenSymbol files) and contains no Arial, Calibri, Cambria, Times New Roman, 宋体, 微软雅黑, 等线, or Noto CJK binary. The actual Windows host's installed fonts and substitution choices have **not** been measured.

## Linux Fontconfig result

`fc-match -f '%{family}|%{file}\n' FONT` inside the candidate image returned:

| Requested family | Current match | Explicit `:lang=zh-cn` match |
| --- | --- | --- |
| Arial | DejaVu Sans | Noto Sans CJK SC |
| Calibri | DejaVu Sans | Noto Sans CJK SC |
| Cambria | DejaVu Serif | Noto Sans CJK SC |
| Times New Roman | DejaVu Serif | Noto Sans CJK SC |
| 宋体 | DejaVu Sans | Noto Sans CJK SC |
| 微软雅黑 | DejaVu Sans | Noto Sans CJK SC |
| 等线 | DejaVu Sans | Noto Sans CJK SC |
| Cambria Math | DejaVu Sans | not measured |

The Chinese-script match is `/opt/ofd-fonts/NotoSansCJKsc-Regular.ttf` (SHA-256 `ca33911b07f82374ae5cac67bf7d6bae7881af97abb9057b94e82d4c3e585dd8`). A plain `fc-match` result does not prove glyph fallback for each mixed-script run or LibreOffice's internal font choice.

LibreOffice 26.2 in the *same image* already includes Carlito, Caladea, Liberation Sans, and Liberation Serif under `/opt/libreoffice26.2/share/fonts/truetype`, but that directory is absent from the candidate's Fontconfig search path. Regular-face SHA-256 values are `b4ff23ba370cc95a3c349336b73f9c28514a1371210f89832efc85c4b1ea7131` (Carlito), `d2f6cad33f191e65b68bd74e6d4f7708080a41b32db635866109df3090265d91` (Caladea), `76d04c18ea243f426b7de1f3ad208e927008f961dc5945e5aad352d0dfde8ee8` (Liberation Sans), and `058ea80864aef09a23f45cbec2bb5400bc3dfbdea01c3f10538a21fcb497fb74` (Liberation Serif). The existing `30-metric-aliases.conf` explicitly maps Arial→Liberation Sans, Calibri→Carlito, Cambria→Caladea, and Times New Roman→Liberation Serif when those fonts are discoverable.

Mounting [`libreoffice-fonts.conf`](../../packages/server/scripts/libreoffice-fonts.conf) directly into the existing `conf.d` changed `fc-match` to those four mapped families. `Noto Sans CJK SC` and `宋体:lang=zh-cn` still select `/opt/ofd-fonts/NotoSansCJKsc-Regular.ttf`. `DejaVu Sans` remains available, but its selected file changes from `/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf` to LibreOffice's bundled `DejaVuSans.ttf`; both report the same font version, while their SHA-256 values differ. No running worker was changed.

## Tracked Office fixture declarations

| Fixture | Declared fonts |
| --- | --- |
| `platform-parity/office-chinese.docx` | No `w:rFonts` or named font in document, styles, or font table; result depends on renderer defaults. |
| `conversion/sheet-formula.xlsx` | Cell style names Calibri 11 pt; theme major Latin Cambria, minor Latin Calibri, East Asian theme face blank. |
| `conversion/presentation-two-slides.pptx` | Theme major/minor Latin Calibri, East Asian theme faces blank; slide/master text uses theme references. |

The same OOXML theme files list script-specific font names including 宋体, but that does not mean every text run requests 宋体. This audit concerns the three tracked Office fixtures, not all customer documents or historical WPS samples.

## Small candidate change and gate

Expose the already bundled LibreOffice `share/fonts/truetype` directory to the candidate Fontconfig config without copying Microsoft fonts or changing the input documents. The main `fonts.conf` includes `conf.d`; the added file declares only that directory.

The three fixed Office fixtures were converted to PDF by the original CLI in two isolated `48d7c15` containers, one baseline and one with the `.conf` mounted at its intended path. The results are retained under `/root/deployment-verification/linux-windows-parity/font-audit/{baseline,config}/`:

| Input | Pages before/after | Embedded font names before/after | Text and 72 dpi page pixels |
| --- | --- | --- | --- |
| `office-chinese.docx` | 1 / 1 | NotoSerifCJKsc-Regular, LiberationSerif / same | Identical |
| `sheet-formula.xlsx` | 2 / 2 | NotoSansCJKSC-Regular, Carlito / same | Identical |
| `presentation-two-slides.pptx` | 2 / 2 | NotoSansCJKSC-Regular, Carlito / same | Identical |

`pdffonts` reports all listed fonts embedded. The PDF file hashes differ between runs, but extracted text SHA-256 and every rendered page's raw PPM SHA-256 match. Thus the new Fontconfig discovery fixes `fc-match` for the four named Latin families but **does not change these three LibreOffice PDF renderings**; LibreOffice already used bundled fonts for these inputs. The authenticated backend was not run for this comparison. Retain geometry and clipping checks for broader samples, particularly documents that invoke Fontconfig through Poppler or another engine. Carlito/Caladea/Liberation are metric substitutes, not proof of identical Windows rendering; Chinese serif/sans and formula glyph choices still need separate Windows reference evidence.
