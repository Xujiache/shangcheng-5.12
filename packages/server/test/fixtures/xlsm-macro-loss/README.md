# XLSM macro-loss test fixture

`source.xlsm` is a modified copy of Jan Marvin Garbuszus's
[`gh_issue_416.xlsm`](https://github.com/JanMarvin/openxlsx-data/blob/73356895f715477e84a631060bd8fa4f7ff0f2d4/gh_issue_416.xlsm).
The local modification adds sample Chinese text, numeric values, and formulas
to the first worksheet while preserving the original VBA
project. `export.xlsx` is the resulting LibreOffice XLSX export, used to check
that worksheet content survives and VBA is omitted.

The upstream file is licensed under the MIT License. The copyright notice and
license text are preserved in [LICENSE.upstream](LICENSE.upstream).
