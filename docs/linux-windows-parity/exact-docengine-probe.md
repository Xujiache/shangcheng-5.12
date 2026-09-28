# Original docengine entry and algorithm module probe

Source: locked `ci-engines-v1-win32-core.tar.zst` SHA-256 `d4f13034e719760790d75569b2dd9696facb88b15b8322f28d2aa4c3dbe6a835`. Its `docengine.exe` SHA-256 is `c79c5fb2f797a04e7d2794ef84a88caac0ec6e8f8348efe310fc127549cd518c`. `scripts/restore-original-docengine.py` verifies both when `--core-archive` is provided, extracts the original Python 3.12 entry code (`36404137ad6657f41e10558f7b72de907d845c851c5e9be76e926853d4e99037`), and preserves raw PYZ code bytes as 75 legacy `.pyc` modules: 55 `pdf2docx`, 20 `camelot`. The embedded PYZ SHA-256 is `6f75f22d34ca0cc910ac6bfaf17dcbc639d41a864e816980aa918ddf0b433504`. The generated manifest holds each code and `.pyc` SHA-256. `packages/server/scripts/run-original-docengine.py` rejects missing or changed modules before adding them to `sys.path` and executing the original entry.

On an isolated Linux host, the restored tree was copied to `/root/deployment-verification/linux-windows-parity/docengine-algorithm-probe/`. The probe used `python:3.12-slim-bookworm`, `--network none`, 3 GiB memory and 2 CPU limits, and a separate test venv. Imports resolved to the restored `.pyc` paths, not the pip `pdf2docx` or Camelot paths. The fixture was the tracked synthetic `native-table.pdf`, SHA-256 `bbaa09d06f28a970094f3cc22ee7f95f74f1fee4b01799c3ef86bd6917930062`.

| Probe | Result |
| --- | --- |
| `convert native-table.pdf native-exact.docx` | Exit 0; DOCX SHA-256 `24f02d26f35684aa1ac50b81011d8ba51afae4eb963bf544acd6ddc2450b9ffe`; Chinese title and table values retained; one editable table; one embedded PNG. |
| `table native-table.pdf native-table-exact.json` | Exit 0; JSON SHA-256 `387e5c9ce55624e10a664deedce612a8a50e4b53e7d2cdf9bca355d5f49d83f6`; 3×2 editable cells: `项目/金额`, `门窗订单/315.50`, `安装费用/48.20`; reported accuracy 100.0. |
| `convert mixed-table.pdf mixed-exact.docx` | Exit 0; native-page text retained and two media assets present. The scanned page is an image and needs the separate structure/OCR path for editable text. |

This proves the original entry and extracted Python algorithm modules can run in the isolated Linux environment with installed dependencies. It does not prove Windows binary output equivalence: Windows Actions did not start because the account had a billing lock, and OS-specific native libraries and rendering remain separate comparison gates.
