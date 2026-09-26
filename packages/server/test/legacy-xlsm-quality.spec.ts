import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { inflateRawSync } from 'node:zlib'

const fixture = join(__dirname, 'fixtures/xlsm-macro-loss')

function zipEntry(zip: Buffer, name: string): Buffer | null {
  const end = zip.lastIndexOf(Buffer.from('PK\x05\x06', 'binary'))
  if (end < 0) throw new Error('ZIP end record missing')
  let offset = zip.readUInt32LE(end + 16)
  const count = zip.readUInt16LE(end + 10)
  for (let index = 0; index < count; index++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error('ZIP central directory invalid')
    const method = zip.readUInt16LE(offset + 10)
    const size = zip.readUInt32LE(offset + 20)
    const nameLength = zip.readUInt16LE(offset + 28)
    const extraLength = zip.readUInt16LE(offset + 30)
    const commentLength = zip.readUInt16LE(offset + 32)
    const entryName = zip.toString('utf8', offset + 46, offset + 46 + nameLength)
    if (entryName === name) {
      const local = zip.readUInt32LE(offset + 42)
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28)
      const data = zip.subarray(start, start + size)
      if (method === 0) return data
      if (method === 8) return inflateRawSync(data)
      throw new Error(`Unsupported ZIP method ${method}`)
    }
    offset += 46 + nameLength + extraLength + commentLength
  }
  return null
}

test('real XLSM to XLSX fixture retains sheets, Chinese cells and formulas while removing VBA', () => {
  const source = readFileSync(join(fixture, 'source.xlsm'))
  const output = readFileSync(join(fixture, 'export.xlsx'))
  expect(zipEntry(source, 'xl/vbaProject.bin')?.length).toBeGreaterThan(10000)
  expect(zipEntry(output, 'xl/vbaProject.bin')).toBeNull()

  for (const zip of [source, output]) {
    const workbook = zipEntry(zip, 'xl/workbook.xml')?.toString('utf8')
    const cells = zipEntry(zip, 'xl/worksheets/sheet1.xml')?.toString('utf8')
    expect(workbook).toMatch(/name="Sheet1"/)
    expect(workbook).toMatch(/name="Sheet2"/)
    expect(cells).toMatch(/<f(?:\s[^>]*)?>B2\*2<\/f>/)
    expect(cells).toMatch(/<f(?:\s[^>]*)?>SUM\(B2:B3\)<\/f>/)
    for (const value of ['5682', '11364', '7319', '13001']) expect(cells).toContain(`<v>${value}</v>`)
  }
  expect(zipEntry(source, 'xl/worksheets/sheet1.xml')?.toString('utf8')).toContain('中文内容完整保留')
  expect(zipEntry(output, 'xl/sharedStrings.xml')?.toString('utf8')).toContain('中文内容完整保留')
})
