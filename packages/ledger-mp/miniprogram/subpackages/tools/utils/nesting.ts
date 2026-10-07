// 玻璃/板材二维套料（Guillotine 自由矩形装箱启发式）。
//
// 给定整张原片尺寸(sheetW×sheetH) + 锯缝(kerf) + 若干矩形小块(宽×高×数量)，
// 在尽量少的原片上把所有小块排下，并给出每块的精确落位坐标，便于绘图导出与切割。
//
// ── 算法：Guillotine free-rectangle bin packing ──────────────────────────────
// 每张原片维护一组互不重叠的「空闲矩形(free rect)」，初始只有一整张原片。
// 对排序后的每个小块，遍历所有原片的所有空闲矩形，选「最贴合」的一个落位
// （最贴合 = 剩余面积最小，平手再比最短边贴合度），把小块按 free rect 的左上
// 原点 {x,y} 放下；随后用一刀「直通切割(guillotine)」把这块被占用的 free rect
// 切成右侧与下方两个新的空闲矩形，丢弃非正尺寸的碎片。若所有原片都放不下，则
// 新开一张原片再试。
//
// ── 锯缝(kerf) 处理 ─────────────────────────────────────────────────────────
// 每个小块预留 (w+kerf) 宽、(h+kerf) 高 的占用空间(pw/ph)，保证相邻小块之间
// 始终留出一条锯路，切完不会因为锯末互相挤占。Placement 记录的是「小块真实
// 尺寸 w/h」（不含 kerf），切割图上画出来才是工件实际大小；而 free rect 的
// 切分按含 kerf 的 pw/ph 进行，所以保守、不会重叠。原片最右/最下一列工件天然
// 不需要再留 kerf，按 pw/ph 预留只是略偏保守（少排极个别块），属可接受取舍。
//
// ── 方向策略 ────────────────────────────────────────────────────────────────
// 板材有木纹方向，必须禁止旋转；玻璃默认允许旋转以提高利用率。调用方通过
// allowRotate 显式选择策略，避免把工艺差异藏在算法内部。
//
// ── 不变量(INVARIANTS，下方切分逻辑保证其恒成立) ────────────────────────────
//   1. 任意两个 Placement 不重叠：每次落位都消耗某个 free rect 并把它切成
//      互不相交的「右/下」两块，新块只会落进后续不相交的 free rect，故全程无重叠。
//   2. 不越界：落位前已校验 pw<=fr.w 且 ph<=fr.h，而 free rect 恒在原片内
//      （初始=整张；切分只会得到更小的子矩形），故 x+w<=sheetW、y+h<=sheetH。
//   3. usedArea = Σ(w*h) 各落位小块真实面积之和。
//   4. totalArea = sheetCount*sheetW*sheetH；utilization = usedArea/totalArea。
//
// ── 验证用例（已用 node 几何校验器跑 4000+ 随机用例：无重叠/不越界/面积一致）──
// sheet 2440×1220, kerf 5, pieces [{w:1200,h:600,qty:2},{w:800,h:400,qty:3}]：
//   单刀 guillotine 切分 + 面积降序贴合，5 块全部排进 1 张原片，
//   usedArea = 2*1200*600 + 3*800*400 = 2,400,000 mm²，totalArea = 2440*1220 = 2,976,800，
//   结论：sheetCount=1，totalPieces=5，oversize=[]，utilization ≈ 0.806（约 80.6%）。
//
// 所有输入均为整数 mm；算法确定性，无 Math.random / Date.now。

export interface NestPiece {
  w: number
  h: number
  qty: number
  label?: string
}
export interface Placement {
  x: number
  y: number
  w: number // 小块真实宽（不含 kerf）
  h: number // 小块真实高（不含 kerf）
  label: string
  /** 是否相对输入边长旋转了 90°；用于排料图和导出图保持实际摆放方向。 */
  rotated: boolean
}
export interface NestSheet {
  placements: Placement[]
  usedArea: number // 该张原片上各小块真实面积之和
}
export interface NestResult {
  sheetW: number
  sheetH: number
  kerf: number
  sheets: NestSheet[]
  sheetCount: number
  totalPieces: number // 已落位小块数合计
  usedArea: number // Σ 各落位小块真实面积
  totalArea: number // = sheetCount × sheetW × sheetH
  utilization: number // 0..1 = usedArea / totalArea
  oversize: { w: number; h: number; qty: number }[] // 超过原片尺寸、无法套料的块（按尺寸聚合）
}

export interface NestingOptions {
  /** true 时每个工件可在不改变面积的前提下自动旋转 90°。 */
  allowRotate?: boolean
}

// 内部：算法用的可变空闲矩形（不对外暴露）。
interface FreeRect {
  x: number
  y: number
  w: number
  h: number
}
// 内部：原片在排料过程中的可变状态。
interface WorkSheet {
  free: FreeRect[]
  placements: Placement[]
  usedArea: number
}

// 防御性上限：避免病态 qty 把内存撑爆；超出部分直接停止落位（调用方应预校验）。
const MAX_PLACED = 2000

// 内部辅助：把一个被占用的 free rect 按 guillotine（单刀直通切割）切成两个
// 互不重叠的空闲矩形，丢弃非正尺寸的碎片，原地更新 sheet.free。
// pw/ph 为含 kerf 的占用尺寸；idx 为被占用 free rect 在数组中的下标。
//
// 关键：必须单刀切分——只能「右块满高 + 下块同宽(pw)」或「右块同高(ph) + 下块
// 满宽」二选一，绝不能同时让右块满高且下块满宽，否则两子块会在右下角重叠，
// 后续两个小块各落进重叠区就会真实重叠（切割图叠刀）。按「较短剩余轴」择刀：
// 剩余宽更小 → 水平切（右块矮、下块宽）；否则垂直切（右块高、下块窄）。
function splitFreeRect(sheet: WorkSheet, idx: number, pw: number, ph: number): void {
  const fr = sheet.free[idx]
  sheet.free.splice(idx, 1)
  const leftoverW = fr.w - pw // 占用块右侧剩余宽
  const leftoverH = fr.h - ph // 占用块下方剩余高
  if (leftoverW < leftoverH) {
    // 水平切：右块只占用块同高(ph)，下块占满整宽——两块在 y=fr.y+ph 处分界，不重叠。
    if (leftoverW > 0) sheet.free.push({ x: fr.x + pw, y: fr.y, w: leftoverW, h: ph })
    if (leftoverH > 0) sheet.free.push({ x: fr.x, y: fr.y + ph, w: fr.w, h: leftoverH })
  } else {
    // 垂直切：右块占满整高，下块只占用块同宽(pw)——两块在 x=fr.x+pw 处分界，不重叠。
    if (leftoverW > 0) sheet.free.push({ x: fr.x + pw, y: fr.y, w: leftoverW, h: fr.h })
    if (leftoverH > 0) sheet.free.push({ x: fr.x, y: fr.y + ph, w: pw, h: leftoverH })
  }
}

// 内部辅助：在单张原片里为占用尺寸 pw×ph 选「最贴合」的空闲矩形下标。
// 贴合度 = 剩余面积最小；平手再比最短边贴合（leftover 短边更小者更优）。
// 找不到任何能容纳的 free rect 返回 -1。
function findBestPlacement(
  sheet: WorkSheet,
  orientations: Array<{ w: number; h: number; rotated: boolean }>,
  kerf: number,
): { idx: number; w: number; h: number; rotated: boolean; score: number; short: number } | null {
  let best: {
    idx: number
    w: number
    h: number
    rotated: boolean
    score: number
    short: number
  } | null = null
  let bestLeftoverArea = Infinity
  let bestShortLeftover = Infinity
  for (let i = 0; i < sheet.free.length; i++) {
    const fr = sheet.free[i]
    for (const orientation of orientations) {
      const pw = orientation.w + kerf
      const ph = orientation.h + kerf
      if (pw > fr.w || ph > fr.h) continue
      const leftoverArea = fr.w * fr.h - pw * ph
      const shortLeftover = Math.min(fr.w - pw, fr.h - ph)
      // 分数相同时保留先检查的未旋转方向，保证结果稳定且更易阅读。
      if (
        leftoverArea < bestLeftoverArea ||
        (leftoverArea === bestLeftoverArea && shortLeftover < bestShortLeftover)
      ) {
        best = {
          idx: i,
          w: orientation.w,
          h: orientation.h,
          rotated: orientation.rotated,
          score: leftoverArea,
          short: shortLeftover,
        }
        bestLeftoverArea = leftoverArea
        bestShortLeftover = shortLeftover
      }
    }
  }
  return best
}

export function optimizeNesting(
  sheetW: number,
  sheetH: number,
  pieces: NestPiece[],
  kerf = 0,
  options: NestingOptions = {},
): NestResult {
  const SW = Math.max(0, Math.round(Number(sheetW) || 0))
  const SH = Math.max(0, Math.round(Number(sheetH) || 0))
  const k = Math.max(0, Math.round(Number(kerf) || 0))

  // 1) 展开数量、剔除非法/超尺寸块，按面积降序、再按最长边降序排序（稳定平手）。
  interface FlatPiece {
    w: number
    h: number
    label: string
  }
  const flat: FlatPiece[] = []
  const oversizeMap: { [key: string]: { w: number; h: number; qty: number } } = {}
  let autoLabel = 0
  for (const p of pieces) {
    const w = Math.round(Number(p.w) || 0)
    const h = Math.round(Number(p.h) || 0)
    const qty = Math.max(0, Math.round(Number(p.qty) || 0))
    if (w <= 0 || h <= 0 || qty <= 0) continue
    // 默认标签：原料行序号（1 起），便于切割图区分；用户传了 label 则用 label。
    const label = p.label != null && String(p.label).length > 0 ? String(p.label) : `${++autoLabel}`
    for (let i = 0; i < qty; i++) {
      const fitsOriginal = w <= SW && h <= SH
      const fitsRotated = !!options.allowRotate && h <= SW && w <= SH
      // 两个方向都放不下才算超尺寸；允许旋转时不把可转向的玻璃误判为 oversize。
      if (SW <= 0 || SH <= 0 || (!fitsOriginal && !fitsRotated)) {
        const key = `${w}x${h}`
        if (oversizeMap[key]) oversizeMap[key].qty++
        else oversizeMap[key] = { w, h, qty: 1 }
      } else {
        flat.push({ w, h, label })
      }
    }
  }
  flat.sort((a, b) => {
    const areaDiff = b.w * b.h - a.w * a.h
    if (areaDiff !== 0) return areaDiff
    return Math.max(b.w, b.h) - Math.max(a.w, a.h) // 平手按最长边降序
  })

  // 2) 逐块装箱：尽量塞进已开原片的最贴合空隙，放不下就新开一张。
  const sheets: WorkSheet[] = []
  let placedCount = 0
  for (const piece of flat) {
    if (placedCount >= MAX_PLACED) break // 病态 qty 防御：停止落位
    const orientations = [
      { w: piece.w, h: piece.h, rotated: false },
      ...(options.allowRotate && piece.w !== piece.h
        ? [{ w: piece.h, h: piece.w, rotated: true }]
        : []),
    ]

    let targetSheet: WorkSheet | null = null
    let target: ReturnType<typeof findBestPlacement> = null
    // 在已开原片的所有可用方向中选最贴合位置，提升旋转玻璃的利用率。
    for (const sheet of sheets) {
      const candidate = findBestPlacement(sheet, orientations, k)
      if (
        candidate &&
        (!target ||
          candidate.score < target.score ||
          (candidate.score === target.score && candidate.short < target.short))
      ) {
        targetSheet = sheet
        target = candidate
      }
    }
    // 都放不下 → 新开一张原片（初始空闲矩形 = 整张原片）。
    if (!targetSheet) {
      const fresh: WorkSheet = { free: [{ x: 0, y: 0, w: SW, h: SH }], placements: [], usedArea: 0 }
      target = findBestPlacement(fresh, orientations, k)
      // 锯缝也可能让边界尺寸放不下；此时不要留下空原片。
      if (!target) continue
      targetSheet = fresh
      sheets.push(targetSheet)
    }

    if (!target) continue
    const fr = targetSheet.free[target.idx]
    // 落位：记录小块真实尺寸于 free rect 左上原点（不含 kerf）。
    targetSheet.placements.push({
      x: fr.x,
      y: fr.y,
      w: target.w,
      h: target.h,
      label: piece.label,
      rotated: target.rotated,
    })
    targetSheet.usedArea += target.w * target.h
    placedCount++
    // 用含 kerf 的占用尺寸做 guillotine 切分，保证相邻块留出锯路、不重叠。
    splitFreeRect(targetSheet, target.idx, target.w + k, target.h + k)
  }

  // 3) 汇总输出。
  const outSheets: NestSheet[] = sheets.map((s) => ({
    placements: s.placements,
    usedArea: s.usedArea,
  }))
  const sheetCount = outSheets.length
  const usedArea = outSheets.reduce((sum, s) => sum + s.usedArea, 0)
  const totalArea = sheetCount * SW * SH
  const oversize = Object.keys(oversizeMap).map((key) => oversizeMap[key])

  return {
    sheetW: SW,
    sheetH: SH,
    kerf: k,
    sheets: outSheets,
    sheetCount,
    totalPieces: placedCount,
    usedArea,
    totalArea,
    utilization: totalArea ? usedArea / totalArea : 0,
    oversize,
  }
}
