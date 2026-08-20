import { optimizeNesting } from '../miniprogram/utils/nesting'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function assertGeometry(result: ReturnType<typeof optimizeNesting>) {
  result.sheets.forEach((sheet, sheetIndex) => {
    sheet.placements.forEach((p, index) => {
      assert(p.x >= 0 && p.y >= 0, `sheet ${sheetIndex}: placement ${index} has negative origin`)
      assert(p.x + p.w <= result.sheetW, `sheet ${sheetIndex}: placement ${index} exceeds width`)
      assert(p.y + p.h <= result.sheetH, `sheet ${sheetIndex}: placement ${index} exceeds height`)
      sheet.placements.slice(index + 1).forEach((other) => {
        const overlap =
          p.x < other.x + other.w &&
          p.x + p.w > other.x &&
          p.y < other.y + other.h &&
          p.y + p.h > other.y
        assert(!overlap, `sheet ${sheetIndex}: placements overlap`)
      })
    })
  })
}

// 只有旋转后才可放入：玻璃自动转向，板材保持原方向并判为超尺寸。
const glass = optimizeNesting(100, 60, [{ w: 60, h: 100, qty: 1 }], 0, { allowRotate: true })
assert(glass.sheetCount === 1 && glass.totalPieces === 1, 'glass rotation should place the piece')
assert(glass.sheets[0].placements[0].rotated, 'glass placement should record rotation')
assertGeometry(glass)

const board = optimizeNesting(100, 60, [{ w: 60, h: 100, qty: 1 }], 0, { allowRotate: false })
assert(board.sheetCount === 0 && board.oversize[0]?.qty === 1, 'board must not rotate')

const rotateInput = [
  { w: 70, h: 40, qty: 1 },
  { w: 40, h: 70, qty: 1 },
]
const withoutRotation = optimizeNesting(100, 100, rotateInput, 0, { allowRotate: false })
const withRotation = optimizeNesting(100, 100, rotateInput, 0, { allowRotate: true })
assert(
  withRotation.sheetCount < withoutRotation.sheetCount,
  'rotation should reduce required sheets',
)
assertGeometry(withRotation)

const packed = optimizeNesting(
  2440,
  1220,
  [
    { w: 1200, h: 600, qty: 2 },
    { w: 800, h: 400, qty: 3 },
    { w: 300, h: 900, qty: 2 },
  ],
  5,
  { allowRotate: true },
)
assertGeometry(packed)

console.log('nesting verification passed')
