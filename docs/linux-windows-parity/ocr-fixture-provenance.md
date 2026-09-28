# OCR-capable public RAW fixtures

Local source metadata: `/Users/mac/Library/Caches/ledger-flyingmouse-engines/parity-fixtures/raw/{download-plan,additional-download-plan}.json`. The 19 source files were kept byte-for-byte intact. LibRaw 0.21.5 `simple_dcraw -e` extracted embedded previews from 18; X3F had no preview. All 18 previews were inspected visually. The three strongest OCR candidates were also rendered from RAW pixels with local `dcraw_emu -h -T -o 1`, preserving the original files.

| RAW file | raw.pixls.us resource ID; metadata license | SHA-256 verified locally | Text visible in both embedded preview and half-size RAW decode |
| --- | --- | --- | --- |
| `public-209d464e13702de5.fff` | [1640](https://raw.pixls.us/getfile.php/1640/nice/Hasselblad%20-%20H5D-40%20-%2016bit%20%284%3A3%29.fff); CC0 | `209d464e13702de5f4fdb830ac26ac140c98a8d0dc3e81c5ba61d93677330832` | `Digital ColorChecker SG`, `gretagmacbeth` on the color chart |
| `public-27809a7d252d5156.pef` | [4392](https://raw.pixls.us/getfile.php/4392/nice/Pentax%20-%20%2Aist%20DS%20-%2012bit%2012bit%20uncompressed%20%283%3A2%29.pef); CC0 | `27809a7d252d515685ed4e6091b70ab25348502baeb75db03ce7b4f1d9549b76` | `Nutrition Facts` on a bottle, `Made by Wolf Faust`, `Charge: R190808` on the chart |
| `public-4ee482f2b6f9f1a8.crw` | [1307](https://raw.pixls.us/getfile.php/1307/nice/Canon%20-%20EOS%20D30%20-%20RAW%20%283%3A2%29.CRW); CC0 | `4ee482f2b6f9f1a8d370703ea04e9f2abaa49356973a7f56b229af93a78e8a2e` | `PlayStation 2`, `AMPLITUDE`, `beatmania`, `Katamari Damacy` on game cases |

The MEF preview contains dark Cyrillic building signage, but it is weaker for an initial OCR check. The two pages of `design/IconGrid.ai` were rendered; they show only pink construction lines and a grid, with no readable text. No OCR engine or backend conversion has yet been run on these fixtures, so visual legibility is a sample-selection result, not an OCR acceptance result.
