import { makePdf } from '../quote-export'
import { Backup, proofPath, repository } from './client'
import {
  check,
  Filter,
  filteredEntries,
  localDate,
  MODE_LABEL,
  money,
  quantity,
  rows,
  summary,
  Workbook,
} from './domain'
import { checksum, uid } from './storage'
export function csvCell(v: any): string {
  let s = String(v ?? '')
  if (/^[\s]*[=+\-@\t\r]/.test(s) && !/^\-?\d+(\.\d+)?$/.test(s)) s = "'" + s
  return '"' + s.replace(/"/g, '""') + '"'
}
export function makeCsv(b: Workbook, f: Filter): string {
  const out: any[][] = [
    ['门窗利账 · 记工明细（金额单位：元）'],
    [
      '日期',
      '工人',
      '工人编号',
      '工种',
      '工地',
      '计薪方式',
      '数量',
      '单价',
      '加班小时',
      '加班时薪',
      '奖金',
      '补贴',
      '扣款',
      '应计工资',
      '出勤',
      '标签',
      '备注',
    ],
  ]
  for (const e of filteredEntries(b, f))
    out.push([
      e.workDate,
      b.workers[e.workerId].name,
      e.workerId,
      b.workers[e.workerId].jobType,
      b.projects[e.projectId]?.name || '未分配工地',
      MODE_LABEL[e.mode],
      quantity(e.quantity100),
      (e.rateFen / 100).toFixed(2),
      quantity(e.overtimeQuantity100),
      (e.overtimeRateFen / 100).toFixed(2),
      (e.bonusFen / 100).toFixed(2),
      (e.subsidyFen / 100).toFixed(2),
      (e.deductionFen / 100).toFixed(2),
      (e.amountFen / 100).toFixed(2),
      e.attendance,
      e.tags,
      e.note,
    ])
  const match = (r: any) =>
    (!f.workerId || r.workerId === f.workerId) &&
    (!f.from || (r.workDate || r.date || r.to) >= f.from) &&
    (!f.to || (r.workDate || r.date || r.from) <= f.to)
  out.push([], ['工资补差'], ['日期', '工人', '工地', '补差金额', '原因'])
  rows(b, 'adjustments')
    .filter(match)
    .filter((r) => !f.projectId || r.projectId === f.projectId)
    .forEach((r) =>
      out.push([
        r.workDate,
        b.workers[r.workerId].name,
        b.projects[r.projectId]?.name || '未分配工地',
        (r.amountFen / 100).toFixed(2),
        r.note,
      ]),
    )
  for (const c of ['settlements', 'payments', 'advances'] as const) {
    out.push(
      [],
      [{ settlements: '结算单', payments: '发薪记录', advances: '借支记录' }[c]],
      ['编号', '工人', '日期 / 范围', '金额', '状态', '说明'],
    )
    rows(b, c)
      .filter(match)
      .filter(
        (r) =>
          !f.projectId ||
          (c === 'payments' ? b.settlements[r.settlementId]?.projectId : r.projectId) ===
            f.projectId,
      )
      .forEach((r) =>
        out.push([
          r.id,
          b.workers[r.workerId].name,
          r.from ? r.from + ' 至 ' + r.to : r.date,
          (r.amountFen / 100).toFixed(2),
          r.state,
          r.voidReason || r.note || '',
        ]),
      )
  }
  return '\uFEFF' + out.map((r) => r.map(csvCell).join(',')).join('\r\n')
}
export function writeExport(name: string, data: string | ArrayBuffer): string {
  const path = wx.env.USER_DATA_PATH + '/' + name
  wx.getFileSystemManager().writeFileSync(path, data, typeof data === 'string' ? 'utf8' : undefined)
  return path
}
export async function exportBackup(): Promise<string> {
  const repo = repository()
  const state = repo.read()
  const blobs: Record<string, string> = {}
  for (const a of rows(state.book, 'attachments')) {
    const path = await proofPath(a.id)
    check(repository().scope === repo.scope, '账号已切换')
    blobs[a.id] = wx.getFileSystemManager().readFileSync(path, 'base64') as string
  }
  const payload: Backup = {
    format: 'LWB1',
    state: { ...state, files: {}, cloudEnabled: false },
    blobs,
  }
  payload.checksum = checksum(JSON.stringify({ state: payload.state, blobs }))
  return writeExport('门窗记工完整备份-' + uid('backup') + '.lwb', JSON.stringify(payload))
}
export async function readBackup(): Promise<any> {
  const result = await new Promise<any>((resolve, reject) =>
    wx.chooseMessageFile({ count: 1, type: 'file', success: resolve, fail: reject }),
  )
  const file = result.tempFiles[0]
  check(file && file.size <= 200 * 1024 * 1024, '备份文件过大或未选择')
  const text = wx.getFileSystemManager().readFileSync(file.path, 'utf8') as string
  return JSON.parse(text)
}
interface Line {
  left: string
  right?: string
  kind?: 'heading' | 'muted'
}
export function reportLines(b: Workbook, f: Filter): Line[] {
  const s = summary(b, f)
  const person = f.workerId ? b.workers[f.workerId]?.name : '全部工人'
  const project = f.projectId ? b.projects[f.projectId]?.name : '全部工地'
  const out: Line[] = [
    { left: person + ' · ' + project, kind: 'heading' },
    { left: (f.from || '全部日期') + ' 至 ' + (f.to || localDate()), kind: 'muted' },
    { left: '期间应计工资（含补差）', right: money(s.earned) },
    { left: '期间已支付工资', right: money(s.paid) },
    { left: '累计待支付 / 未抵扣借支', right: money(s.due) + ' / ' + money(s.advance) },
    {
      left: '工天 / 工时 / 件数',
      right: quantity(s.days) + ' / ' + quantity(s.hours) + ' / ' + quantity(s.pieces),
    },
    { left: '记工明细', kind: 'heading' },
  ]
  for (const e of filteredEntries(b, f)) {
    out.push(
      { left: e.workDate + '  ' + b.workers[e.workerId].name, right: money(e.amountFen) },
      {
        left:
          (b.projects[e.projectId]?.name || '未分配工地') +
          ' · ' +
          quantity(e.quantity100) +
          ' ' +
          MODE_LABEL[e.mode] +
          ' × ' +
          money(e.rateFen),
        kind: 'muted',
      },
    )
    if (e.overtimeQuantity100 || e.bonusFen || e.subsidyFen || e.deductionFen)
      out.push({
        left:
          '加班 ' +
          quantity(e.overtimeQuantity100) +
          ' 时 × ' +
          money(e.overtimeRateFen) +
          '；奖金 ' +
          money(e.bonusFen) +
          '；补贴 ' +
          money(e.subsidyFen) +
          '；扣款 ' +
          money(e.deductionFen),
        kind: 'muted',
      })
    if (e.tags || e.note)
      out.push({ left: [e.tags, e.note].filter(Boolean).join(' · '), kind: 'muted' })
  }
  for (const c of ['adjustments', 'settlements', 'payments', 'advances'] as const) {
    out.push({
      left: {
        adjustments: '工资补差',
        settlements: '结算单',
        payments: '发薪记录',
        advances: '借支记录',
      }[c],
      kind: 'heading',
    })
    for (const r of rows(b, c)) {
      if (f.workerId && r.workerId !== f.workerId) continue
      if (
        f.projectId &&
        (c === 'payments' ? b.settlements[r.settlementId]?.projectId : r.projectId) !== f.projectId
      )
        continue
      const d = r.workDate || r.date || r.to
      if ((f.from && d < f.from) || (f.to && d > f.to)) continue
      out.push({
        left: d + ' ' + b.workers[r.workerId].name + ' ' + (r.state === 'void' ? '[已作废]' : ''),
        right: money(r.amountFen),
      })
      if (r.note || r.voidReason) out.push({ left: r.voidReason || r.note, kind: 'muted' })
    }
  }
  return out
}
export async function renderReport(
  page: any,
  b: Workbook,
  f: Filter,
): Promise<{ pdf: string; images: string[] }> {
  const canvas: any = await new Promise((resolve, reject) =>
    wx
      .createSelectorQuery()
      .in(page)
      .select('#wb-export-canvas')
      .fields({ node: true, size: true })
      .exec((r) => (r?.[0]?.node ? resolve(r[0].node) : reject(new Error('导出画布未就绪')))),
  )
  const width = 1000,
    height = 1414
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const lines = reportLines(b, f)
  const wrapped: Line[] = []
  for (const line of lines) {
    ctx.font = (line.kind === 'heading' ? 'bold 29px' : '24px') + ' sans-serif'
    const max = line.right ? 600 : 880
    let buf = ''
    for (const ch of line.left) {
      if (ctx.measureText(buf + ch).width > max && buf) {
        wrapped.push({ ...line, left: buf, right: undefined })
        buf = ''
      }
      buf += ch
    }
    wrapped.push({ ...line, left: buf })
  }
  const chunks: Line[][] = []
  let current: Line[] = []
  let used = 0
  for (const line of wrapped) {
    const h = line.kind === 'heading' ? 60 : 40
    if (used + h > 1110 && current.length) {
      chunks.push(current)
      current = []
      used = 0
    }
    current.push(line)
    used += h
  }
  if (current.length) chunks.push(current)
  const images: string[] = []
  const bytes: any[] = []
  for (let index = 0; index < chunks.length; index++) {
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, width, height)
    ctx.fillStyle = '#0e7c66'
    ctx.fillRect(0, 0, width, 12)
    ctx.font = 'bold 38px sans-serif'
    ctx.fillText('门窗利账 · 记工工资报表', 54, 85)
    ctx.fillStyle = '#73847a'
    ctx.font = '20px sans-serif'
    ctx.fillText('本机生成 · ' + localDate() + ' · 仅为记账凭据，不代表实际转账', 54, 125)
    let y = 190
    for (const line of chunks[index]) {
      ctx.font = (line.kind === 'heading' ? 'bold 29px' : '24px') + ' sans-serif'
      ctx.fillStyle = line.kind === 'muted' ? '#73847a' : '#243e31'
      ctx.textAlign = 'left'
      ctx.fillText(line.left, 54, y)
      if (line.right) {
        ctx.textAlign = 'right'
        ctx.fillStyle = '#0e7c66'
        ctx.fillText(line.right, 946, y)
        ctx.textAlign = 'left'
      }
      y += line.kind === 'heading' ? 60 : 40
    }
    ctx.font = '20px sans-serif'
    ctx.fillStyle = '#89988f'
    ctx.fillText(
      '金额单位：人民币元  |  第 ' + (index + 1) + ' / ' + chunks.length + ' 页',
      54,
      1370,
    )
    const result = await new Promise<any>((resolve, reject) =>
      wx.canvasToTempFilePath(
        {
          canvas,
          destWidth: width,
          destHeight: height,
          fileType: 'jpg',
          quality: 0.95,
          success: resolve,
          fail: reject,
        } as any,
        page,
      ),
    )
    images.push(result.tempFilePath)
    const raw = wx.getFileSystemManager().readFileSync(result.tempFilePath) as ArrayBuffer
    bytes.push({ bytes: new Uint8Array(raw), width, height })
  }
  const pdf = writeExport(
    '记工工资报表-' + uid('report') + '.pdf',
    makePdf(bytes).buffer as ArrayBuffer,
  )
  return { pdf, images }
}
