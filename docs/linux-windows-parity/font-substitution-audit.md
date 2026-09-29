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

An ephemeral Fontconfig file that included the existing config and added only that bundled LibreOffice font directory changed `fc-match` to those four mapped families. It left `宋体:lang=zh-cn`, `微软雅黑:lang=zh-cn`, and `等线:lang=zh-cn` on Noto Sans CJK SC. No image or worker was changed. This confirms a narrow discovery/configuration gap, but not yet a rendered-output improvement.

## Tracked Office fixture declarations

| Fixture | Declared fonts |
| --- | --- |
| `platform-parity/office-chinese.docx` | No `w:rFonts` or named font in document, styles, or font table; result depends on renderer defaults. |
| `conversion/sheet-formula.xlsx` | Cell style names Calibri 11 pt; theme major Latin Cambria, minor Latin Calibri, East Asian theme face blank. |
| `conversion/presentation-two-slides.pptx` | Theme major/minor Latin Calibri, East Asian theme faces blank; slide/master text uses theme references. |

The same OOXML theme files list script-specific font names including 宋体, but that does not mean every text run requests 宋体. This audit concerns the three tracked Office fixtures, not all customer documents or historical WPS samples.

## Small candidate change and gate

Expose the already bundled LibreOffice `share/fonts/truetype` directory to the candidate Fontconfig config without copying Microsoft fonts or changing the input documents. First verify `fc-match` picks the intended four metric-compatible substitutes. Then run each fixed Office fixture through original CLI and authenticated backend Office→PDF in an isolated candidate, collect `pdffonts`, page count, text bounding boxes, table/slide geometry, and rendered images. Compare against a same-byte Windows run once available. Keep the change only if text/content gates remain green and geometry improves without new clipping or page changes. Carlito/Caladea/Liberation are metric substitutes, not proof of identical Windows rendering; Chinese serif/sans and formula glyph choices still need separate Windows reference evidence.
