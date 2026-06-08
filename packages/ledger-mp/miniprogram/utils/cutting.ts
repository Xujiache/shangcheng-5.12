// 型材一维优化下料（First-Fit-Decreasing 启发式）。
// 给定整根料长 + 锯缝(kerf) + 需要的若干段(长度×数量)，给出每根料的切割方案，尽量少用料、少损耗。

export interface CutPiece {
  length: number
  qty: number
}
export interface CutPlanBar {
  cuts: number[]
  used: number // 含锯缝消耗的已用长度
  waste: number // 该根余料
}
export interface CutPlanResult {
  bars: CutPlanBar[]
  barCount: number
  stockLength: number
  kerf: number
  totalPieces: number // 段数合计
  totalCutLength: number // 有效切割长度合计
  totalStock: number // 用料总长 = barCount × stockLength
  totalWaste: number // 损耗合计
  utilization: number // 利用率 0..1 = 有效长度 / 用料总长
  oversize: number[] // 超过整根料长、无法下料的段
}

export function optimizeCutting(stockLength: number, pieces: CutPiece[], kerf = 0): CutPlanResult {
  const L = Math.max(0, Math.round(stockLength))
  const k = Math.max(0, Math.round(kerf))

  const flat: number[] = []
  const oversize: number[] = []
  for (const p of pieces) {
    const len = Math.round(Number(p.length) || 0)
    const qty = Math.max(0, Math.round(Number(p.qty) || 0))
    if (len <= 0 || qty <= 0) continue
    for (let i = 0; i < qty; i++) {
      if (L > 0 && len > L) oversize.push(len)
      else flat.push(len)
    }
  }
  flat.sort((a, b) => b - a) // 从长到短

  const bars: { cuts: number[]; remaining: number }[] = []
  for (const len of flat) {
    let placed = false
    for (const bar of bars) {
      // 同一根料里，除第一刀外每刀前都要扣一个锯缝
      const need = bar.cuts.length === 0 ? len : len + k
      if (bar.remaining >= need) {
        bar.remaining -= need
        bar.cuts.push(len)
        placed = true
        break
      }
    }
    if (!placed) bars.push({ cuts: [len], remaining: L - len })
  }

  const planBars: CutPlanBar[] = bars.map((b) => {
    const used = L - b.remaining
    return { cuts: b.cuts, used, waste: b.remaining }
  })
  const totalCutLength = flat.reduce((s, l) => s + l, 0)
  const totalStock = planBars.length * L
  const totalWaste = planBars.reduce((s, b) => s + b.waste, 0)
  return {
    bars: planBars,
    barCount: planBars.length,
    stockLength: L,
    kerf: k,
    totalPieces: flat.length,
    totalCutLength,
    totalStock,
    totalWaste,
    utilization: totalStock ? totalCutLength / totalStock : 0,
    oversize,
  }
}
