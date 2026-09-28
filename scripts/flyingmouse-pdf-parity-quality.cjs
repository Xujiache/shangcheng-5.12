const normalize = (value) => String(value ?? '').replace(/\s+/g, '')

const pixels = (render) => ({ pageCount: render.pageCount,
  pages: render.pages.map((page) => ({ width: page.width, height: page.height,
    pixelSha256: page.pixelSha256 })) })

function tableCount(sheets, expectedRows) {
  let count = 0
  for (const sheet of sheets || []) {
    const rows = sheet.rows || []
    if (!sheet.rows) for (const cell of sheet.cells || []) {
      rows[cell.row - 1] ||= []
      rows[cell.row - 1][cell.column - 1] = cell.value
    }
    let next = 0
    for (const row of rows) {
      if (!row) continue
      const values = row.map(normalize)
      const expected = expectedRows[next].map(normalize)
      if (values.some((_, offset) => expected.every((cell, index) => values[offset + index] === cell))) next++
      if (next === expectedRows.length) { count++; next = 0 }
    }
  }
  return count
}

function assertPdfParityQuality({ item, target, sourcePages, direct, backend }) {
  const expected = item.expectByTarget?.[target] || item.expect
  for (const [name, output] of [['direct', direct], ['backend', backend]]) {
    for (const phrase of expected)
      if (output.text.split(normalize(phrase)).length - 1 < sourcePages)
        throw new Error(`${name} ${target} lost source-page content: ${phrase}`)
    if (target === 'docx') {
      if (output.render.pageCount < sourcePages || output.assets < (item.expectAssets?.docx || 0))
        throw new Error(`${name} DOCX lost source pages or embedded image`)
    } else if (item.expectTableRows && tableCount(output.sheets, item.expectTableRows) < sourcePages)
      throw new Error(`${name} XLSX lost a source-page table or known cells`)
  }
  if (direct.text !== backend.text || !backend.text ||
    JSON.stringify(pixels(direct.render)) !== JSON.stringify(pixels(backend.render)))
    throw new Error('Direct/backend content or rendered pixels differ')
}

module.exports = { assertPdfParityQuality }
