# Native PDF to DOCX column diagnostic

Date: 2026-09-30. Status: **unresolved**. The tracked one-page native PDF still fails the one-page DOCX acceptance gate in the original Linux path. Independent server candidates preserve seven source page counts and text, but full geometry and real-document acceptance remain incomplete. No column-layout patch has been added to the runtime.

## Cause in the original document model

The hash-locked Windows Python 3.12 `pdf2docx` bytecode groups page elements by rows and columns in `RawPage.parse_section`. `Sections.make_docx` changes section geometry with `WD_SECTION.CONTINUOUS`; `Section.make_docx` calls `doc.add_section(WD_SECTION.NEW_COLUMN)` before each second column. The resulting native DOCX has two `nextColumn` section starts: one for the right text column and one for the image legend. LibreOffice 26.2 on Linux and 26.8 on Mac both render the unchanged native DOCX as three pages. The full-width amount table belongs to the following single-column section: its 9,500-twip grid equals page width 11,900 minus 960 left and 1,440 right margins. It is not an overwide table inside the right column.

An earlier diagnostic replacement of `nextColumn` with `continuous` plus a column break yielded one page but put the legend about 49 pt below the source. Increasing `min_section_height` to 80 yielded two pages. Neither is an accepted repair.

## Cell candidate and geometry

The isolated [diagnostic script](../../.quality/linux-windows-parity/column-cell-experiment.py) replaces only two-column section emission with a fixed-width, borderless, two-cell table. It keeps the original column widths, adds per-column top space from the original column bounding boxes, and computes the next section's space from the preceding columns' **maximum** bottom coordinate. This last calculation matters for unequal column heights: the original `before_space` used the shorter final column and placed the subsequent full-width footer 27 pt too low in the synthetic case. Paragraphs with an explicit OOXML `w:br` get 6 pt of renderer width slack; a paragraph without an explicit break is left alone. The script is a diagnostic monkeypatch, not a change to the wrapper or vendor source.

On Linux LibreOffice 26.2, the candidate renders the tracked PDF on one page. Measurements below use the retained source PDF and candidate-rendered PDF; text values are visible glyph bounds from `pdfplumber`, while table lines and the embedded image use their PDF geometry.

| Element | Source PDF | Cell candidate | Difference |
| --- | --- | --- | --- |
| Table top line Y | 227.0 pt | 223.9 pt | −3.1 pt |
| `项目` glyph top Y | 244.0 pt | 241.2 pt | −2.8 pt |
| Legend glyph top Y | 528.6 pt | 525.5 pt | −3.1 pt |
| Image top Y | 492.0 pt | 488.6 pt | −3.4 pt |
| Image left X | 70.0 pt | 79.0 pt | +9.0 pt |
| Table horizontal span | 55.0–520.0 pt | 54.0–530.0 pt | Right edge +10.0 pt |

The earlier approximately 6 pt vertical figure was based on PyMuPDF text-block boxes, whose font extents differ from the visible glyph bounds; it is not grounds for a 6 pt compensation. The table's right-edge expansion follows the original full-page 9,500-twip table grid. The extra 9 pt image shift occurs only when the inline image is placed inside the diagnostic table cell: a text marker with the same 22 pt paragraph indent starts at X=70.1 pt, while the image starts at X=79.0 pt. Setting both `tcMar` left/right and `tblCellMar` left/right to zero left the image at X=79.0 pt in Mac LibreOffice. Changing the picture paragraph indent to cancel that shift would be a renderer-specific adjustment without Word/WPS evidence.

Mac LibreOffice 26.8 alpha rendered the same diagnostic DOCX's table and image about 19 pt higher than retained Linux LibreOffice 26.2 output. The Mac run therefore tests structural behavior, not Linux pixel or vertical-position parity.

## Real PDF boundaries

All four synthetic PDFs were generated locally by [make-regressions.py](../../.quality/linux-windows-parity/column-geometry/make-regressions.py), converted with the exact restored original entry and 75 `pdf2docx`/Camelot modules under Python 3.12, and rendered by Mac LibreOffice 26.8. The unmodified original and isolated cell candidate retained every extracted alphanumeric token in these cases. Page count still exposes a serious cell-layout regression:

| PDF | Source pages | Original DOCX pages | Cell candidate pages | Source PDF SHA-256 |
| --- | ---: | ---: | ---: | --- |
| Two-page single column | 2 | 2 | 2 | `870c2ac1c45daf9d16ed04d6a945e2784aff8b0d566028656d49fa60c8b07e83` |
| Unequal-width two columns then full-width table | 1 | 2 | 1 | `3d88bd5677a5fb0879113f910de941a607aa05eff704baff85d4028cff738a9c` |
| Tall paired columns | 1 | 2 | **3** | `d749060041edc8fae4c0ad7cea040feecaf21c5f6217577fd78e0ec39b4cc127` |
| Two pages, each with columns/table/columns | 2 | 6 | 2 | `dad970ff9bfe48d04e30cde22a1dfaa1ebb3a4e5f8dde1d551d33325edbc9b3a` |

The tall source column spans Y=92.1–746.6 pt in the original layout model. The candidate's one-row table has `w:cantSplit`; its first page contains only the title, the row starts on page two, and left-column text overflows onto page three. Removing `w:cantSplit` in a diagnostic DOCX reduces this case to two pages but still splits the left column and does not recover the source's one-page geometry. The original `pdf2docx` paragraph for that left column also concatenates its 30 PDF lines without explicit `w:br`, leaving only 142.7 pt of text width after its right indent in a 197.3 pt cell; LibreOffice wraps words that fit the PDF. A two-cell table cannot be considered a general fix for tall or cross-page columns on this evidence.

The tracked source [native-table.pdf](../../packages/server/test/fixtures/platform-parity/native-table.pdf) has SHA-256 `bbaa09d06f28a970094f3cc22ee7f95f74f1fee4b01799c3ef86bd6917930062`. Diagnostic script SHA-256 values are `ba71b5dd57aa58a5e32304c8a0694302bc15b1442d688db29b8e4ef86b409e05` (cell experiment) and `30ef74b99f758b3892cf654bb1cfda86d6e968b5cb1d245dbf500b41e6decd51` (PDF generator). The retained Linux candidate DOCX and rendered PDF are `.quality/linux-windows-parity/native-cell.docx` and `.quality/linux-windows-parity/native-cell.pdf`. The regression inputs and Mac outputs are under `.quality/linux-windows-parity/column-geometry/`.

## Later WPS and server diagnostics

Before the user's no-local-runtime constraint, Mac WPS 12.1.28496 opened the original authenticated backend DOCX (`84f90a09ede516d66106b09ea876822a8c1304aedbbf7a117ba4c20d3fcf44f2`) on one page. Its exported PDF (`f91b3a157698466ed20441f0edfdbc2d29a2794c4c5b7f5d1385159e23cd2e02`) wraps `客户` and `37`, places the legend about 34.6 pt high, and reports font substitution. Mac WPS does not prove Windows 0.7.10 parity. No further Mac backend, conversion, rendering or WeChat DevTools preview is started.

The existing [LibreOffice section importer](https://github.com/LibreOffice/core/blob/libreoffice-26.2.1.2/sw/source/writerfilter/dmapper/PropertyMap.cxx#L1825-L1850) documents its incorrect `nextColumn` handling; [Microsoft section semantics](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.sectiontype?view=openxml-3.0.1#remarks) keep the column start on the current page. A separate explicit-column-break diagnostic retains real columns, avoiding the rejected one-row cell layout. It derives each column's top gap from the earliest source column and the next section gap from the preceding maximum bottom coordinate. All seven server cases retain source page counts `1/2/1/1/2/1/1` and non-whitespace character/token multisets, including tall columns and both unequal column-origin cases. Outputs and measurements remain under `.quality/linux-windows-parity/column-origin-61/`.

The 9 pt image shift also occurs outside diagnostic cells. [LibreOffice's inline drawing importer](https://github.com/LibreOffice/core/blob/libreoffice-26.2.1.2/sw/source/writerfilter/dmapper/GraphicImport.cxx#L324-L349) retains floating drawing margins when optional inline distance attributes are absent. Explicit `wp:inline` distances of zero preserve the original paragraph indent and put the native image at source X=70.0 pt; all seven outputs retain previous text positions and image dimensions. No compensating source-coordinate offset was added. Native image Y is still about 2.2 pt high in that candidate.

Original two-row column blocks merge 34 pt-spaced source rows into a relative Word line spacing that renders 25.35 pt apart. A separate global use of the original `max_line_spacing_ratio=0` option improves native text positions to below 0.8 pt error and retains all seven page counts, text multisets and image sizes; native image remains 1.80 pt high. **Global paragraph splitting is not adopted**, because it changes ordinary paragraph editing/reflow. A scoped multi-column-only candidate is being checked on the server; its nested-cell inheritance and the still-global explicit hard breaks require separate acceptance.

The original table's preferred cell widths (`tcW=4700/4600` twips) match source 235/230 pt, while its inherited `tblGrid=4750/4750` makes the table 10 pt wider. This is a grid/cell inconsistency, not a table assigned to the wrong section. An independent fragment derives complete logical grid boundaries from all source cells and colspans and synchronizes only `gridCol`. Incomplete or conflicting boundaries produce `GRID_SKIP` and retain the original grid; such a skipped table remains unresolved even if the job succeeds. Merged and nested tables need additional cases. No guessed grid or fixture-specific width is accepted.

Server scoped-row+grid outputs retain all seven page counts, exact per-page non-whitespace and ASCII/Han token multisets, and image counts/display dimensions. No `GRID_SKIP` occurred. Native DOCX grid and preferred cell widths both equal `4700/4600`; rendered table span is 465 pt rather than 475 pt. Its left/middle/right border positions are 54.5/289.5/519.5 pt versus source 55/290/520, with no compensating offset. Native text/image Y positions remain the preceding physical-row candidate's values, including image −1.80 pt. Native and both column-origin DOCX image media retain complete source RGB bytes; the latter source images use ICCBased color spaces, whose profile-aware color appearance is not separately accepted. These fixtures are controlled diagnostics, not arbitrary-document coverage. Explicit hard breaks still need a narrower scope; overlapping sections and merged/nested tables remain untested.

The original Windows result remains unmeasured. Keep all historical failures and rejected candidates; page-count/text success alone does not complete layout acceptance.
