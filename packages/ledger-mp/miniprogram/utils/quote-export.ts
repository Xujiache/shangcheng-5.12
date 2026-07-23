/**
 * 报价单导出（纯小程序本地实现）：
 * - 图片：客户展示型分享卡，突出客户、报价合计与产品摘要。
 * - PDF：正式多页报价文件，完整保留尺寸、单价和小计。
 * - 表格：真实 XLSX 工作簿，含报价概览、产品明细、报价说明三张工作表。
 */
// 原生小程序不会自动解析 pnpm workspace 的裸 npm 模块；这里固定使用随源码发布的浏览器构建。
declare const require: (path: string) => any
const XLSX = require('./vendor/xlsx.mini.min.js')

type QuoteSize = { w?: number; h?: number; count?: number; notes?: string[]; note?: string }
type QuoteItem = {
  name?: string
  note?: string
  baseArea?: number
  unitPrice?: number
  qty?: number
  subtotal?: number | null
  sizes?: QuoteSize[]
}

export interface QuoteExportOrder {
  id?: string
  customer?: string
  date?: string
  note?: string
  total?: number
  discount?: number
  recycle?: number
  items?: QuoteItem[]
}

type QuoteRow = {
  name: string
  detail: string
  unitPrice: number
  subtotal: number
}

type QuotePage = { rows: QuoteRow[]; contentHeight: number }

const CANVAS_W = 1000
const PAGE_CONTENT_MAX = 1220

const n = (v: unknown) => {
  const out = Number(v)
  return Number.isFinite(out) && out > 0 ? out : 0
}
const yuan = (v: unknown) => `¥${Math.max(0, Math.round(Number(v) || 0)).toLocaleString('zh-CN')}`
const safeText = (v: unknown) =>
  String(v == null ? '' : v)
    .replace(/[\r\n]+/g, ' ')
    .trim()
const datePart = (v: unknown) => safeText(v || new Date().toISOString().slice(0, 10)).slice(0, 20)

function fmtArea(v: number) {
  const value = Math.round(v * 100) / 100
  return Number.isInteger(value)
    ? String(value)
    : value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

function itemBillingQty(item: QuoteItem) {
  const sizes = Array.isArray(item.sizes) ? item.sizes : []
  if (!sizes.length) return n(item.qty)
  return sizes.reduce((sum, s) => {
    const area = Math.max((n(s.w) * n(s.h)) / 1_000_000, n(item.baseArea))
    return sum + area * Math.max(1, Math.round(n(s.count) || 1))
  }, 0)
}

function itemSubtotal(item: QuoteItem) {
  if (item.subtotal !== null && item.subtotal !== undefined)
    return Math.max(0, Math.round(Number(item.subtotal) || 0))
  return Math.round(itemBillingQty(item) * n(item.unitPrice))
}

function sizeText(s: QuoteSize) {
  const dimension = `${Math.round(n(s.w))} × ${Math.round(n(s.h))} mm`
  const count = Math.max(1, Math.round(n(s.count) || 1))
  const note = safeText(Array.isArray(s.notes) ? s.notes[0] : s.note)
  return `${dimension} × ${count}${note ? `（${note}）` : ''}`
}

function quoteRows(order: QuoteExportOrder): QuoteRow[] {
  const rows = (Array.isArray(order.items) ? order.items : [])
    .map((item, index) => {
      const sizes = Array.isArray(item.sizes) ? item.sizes.filter((s) => n(s.w) && n(s.h)) : []
      const detail = sizes.length
        ? sizes.map(sizeText).join('；')
        : `数量 ${fmtArea(n(item.qty))} 件${item.note ? ` · ${safeText(item.note)}` : ''}`
      return {
        name: safeText(item.name) || `产品 ${index + 1}`,
        detail,
        unitPrice: Math.round(n(item.unitPrice)),
        subtotal: itemSubtotal(item),
      }
    })
    .filter((row) => row.name || row.subtotal || row.detail)
  return rows.length
    ? rows
    : [
        {
          name: '订单报价',
          detail: '未填写产品明细',
          unitPrice: 0,
          subtotal: Math.max(0, Math.round(Number(order.total) || 0)),
        },
      ]
}

function estimateRowHeight(row: QuoteRow) {
  // Canvas 的规格列约可容纳 27 个汉字；用保守估算提前分页，实际绘制不会截断内容。
  return 76 + Math.max(0, Math.ceil(row.detail.length / 27) - 1) * 28
}

function quotePages(order: QuoteExportOrder): QuotePage[] {
  const pages: QuotePage[] = []
  let rows: QuoteRow[] = []
  let height = 0
  quoteRows(order).forEach((row) => {
    const rowHeight = estimateRowHeight(row)
    if (rows.length && height + rowHeight > PAGE_CONTENT_MAX) {
      pages.push({ rows, contentHeight: height })
      rows = []
      height = 0
    }
    rows.push(row)
    height += rowHeight
  })
  if (rows.length) pages.push({ rows, contentHeight: height })
  return pages
}

function wrap(ctx: any, value: string, maxWidth: number) {
  const lines: string[] = []
  let current = ''
  for (const char of Array.from(value || '—')) {
    const candidate = current + char
    if (current && ctx.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = char
    } else current = candidate
  }
  if (current) lines.push(current)
  return lines.length ? lines : ['—']
}

/** 正式 PDF 版：白底表格与完整字段，便于客户留档、打印。 */
function paintPdfPage(
  canvas: any,
  ctx: any,
  order: QuoteExportOrder,
  page: QuotePage,
  pageIndex: number,
  pageCount: number,
) {
  const pageH = Math.max(720, Math.min(1960, 520 + page.contentHeight))
  canvas.width = CANVAS_W
  canvas.height = pageH

  ctx.fillStyle = '#F4F7F6'
  ctx.fillRect(0, 0, CANVAS_W, pageH)
  ctx.fillStyle = '#138B69'
  ctx.fillRect(0, 0, CANVAS_W, 234)
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '700 30px sans-serif'
  ctx.fillText('门窗利账 · 正式报价', 52, 62)
  ctx.font = '700 52px sans-serif'
  ctx.fillText('客户报价文件', 52, 132)
  ctx.font = '24px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.82)'
  ctx.fillText(`客户：${safeText(order.customer) || '未填写客户'}`, 52, 181)
  ctx.textAlign = 'right'
  ctx.fillText(`日期：${datePart(order.date)}`, 948, 62)
  ctx.font = '20px sans-serif'
  ctx.fillText(`报价编号：${safeText(order.id) || '草稿报价'}`, 948, 99)
  ctx.fillText(`${pageIndex + 1} / ${pageCount}`, 948, 181)
  ctx.textAlign = 'left'

  const cardX = 30
  const cardY = 202
  const cardW = 940
  const cardH = pageH - cardY - 28
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(cardX, cardY, cardW, cardH, 24)
  ctx.fill()

  let y = 254
  ctx.fillStyle = '#EFF7F2'
  ctx.fillRect(54, y, 892, 46)
  ctx.fillStyle = '#557267'
  ctx.font = '600 19px sans-serif'
  ctx.fillText('产品', 72, y + 29)
  ctx.fillText('尺寸 / 规格', 300, y + 29)
  ctx.textAlign = 'right'
  ctx.fillText('单价', 790, y + 29)
  ctx.fillText('小计', 925, y + 29)
  ctx.textAlign = 'left'
  y += 66

  page.rows.forEach((row) => {
    ctx.font = '600 22px sans-serif'
    const detailLines = (() => {
      ctx.font = '18px sans-serif'
      return wrap(ctx, row.detail, 440)
    })()
    const rowH = Math.max(76, 32 + detailLines.length * 27)
    ctx.strokeStyle = '#E4EEE8'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(56, y + rowH)
    ctx.lineTo(944, y + rowH)
    ctx.stroke()
    ctx.fillStyle = '#19271F'
    ctx.font = '600 22px sans-serif'
    ctx.fillText(row.name, 72, y + 31)
    ctx.fillStyle = '#72897E'
    ctx.font = '18px sans-serif'
    detailLines.forEach((line, index) => ctx.fillText(line, 300, y + 26 + index * 27))
    ctx.fillStyle = '#40574C'
    ctx.textAlign = 'right'
    ctx.fillText(yuan(row.unitPrice), 790, y + 31)
    ctx.fillStyle = '#138B69'
    ctx.font = '700 22px sans-serif'
    ctx.fillText(yuan(row.subtotal), 925, y + 31)
    ctx.textAlign = 'left'
    y += rowH
  })

  if (pageIndex === pageCount - 1) {
    const discount = Math.max(0, Math.round(Number(order.discount) || 0))
    const recycle = Math.max(0, Math.round(Number(order.recycle) || 0))
    const total = Math.max(0, Math.round(Number(order.total) || 0))
    const boxY = Math.min(pageH - 192, y + 22)
    ctx.fillStyle = '#EAF7F1'
    ctx.beginPath()
    ctx.roundRect(54, boxY, 892, 126, 16)
    ctx.fill()
    ctx.fillStyle = '#557267'
    ctx.font = '18px sans-serif'
    ctx.fillText(`优惠 ${yuan(discount)}   ·   回收 ${yuan(recycle)}`, 78, boxY + 43)
    ctx.fillStyle = '#138B69'
    ctx.font = '700 34px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(`合计 ${yuan(total)}`, 920, boxY + 88)
    ctx.textAlign = 'left'
  }
  ctx.fillStyle = '#91A69C'
  ctx.font = '16px sans-serif'
  ctx.fillText('本 PDF 为完整报价文件，请以双方确认内容、最终合同为准。', 58, pageH - 32)
}

/** 图片分享版：更像客户可直接转发的报价卡，视觉与 PDF 正式文件刻意区分。 */
function paintImagePage(
  canvas: any,
  ctx: any,
  order: QuoteExportOrder,
  page: QuotePage,
  pageIndex: number,
  pageCount: number,
) {
  const pageH = Math.max(800, Math.min(2020, 610 + Math.round(page.contentHeight * 1.15)))
  canvas.width = CANVAS_W
  canvas.height = pageH
  const bg = ctx.createLinearGradient(0, 0, CANVAS_W, pageH)
  bg.addColorStop(0, '#0C6E5A')
  bg.addColorStop(0.42, '#148A71')
  bg.addColorStop(1, '#E2F1E9')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CANVAS_W, pageH)

  ctx.fillStyle = 'rgba(255,255,255,0.13)'
  ctx.beginPath()
  ctx.arc(890, 74, 170, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.arc(760, 10, 72, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '600 22px sans-serif'
  ctx.fillText('JINGWEI · WINDOW QUOTE', 58, 64)
  ctx.font = '700 52px sans-serif'
  ctx.fillText('客户专属报价', 58, 132)
  ctx.font = '24px sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.86)'
  ctx.fillText(`致：${safeText(order.customer) || '尊敬的客户'}`, 58, 180)
  ctx.textAlign = 'right'
  ctx.fillText(datePart(order.date), 942, 64)
  ctx.font = '18px sans-serif'
  ctx.fillText(`报价编号  ${safeText(order.id) || '待确认'}`, 942, 101)
  ctx.fillText(`第 ${pageIndex + 1} / ${pageCount} 页`, 942, 180)
  ctx.textAlign = 'left'

  const cardY = 224
  ctx.fillStyle = '#FFFFFF'
  ctx.beginPath()
  ctx.roundRect(30, cardY, 940, pageH - cardY - 28, 30)
  ctx.fill()
  ctx.fillStyle = '#EDF8F3'
  ctx.beginPath()
  ctx.roundRect(58, 252, 884, 76, 18)
  ctx.fill()
  ctx.fillStyle = '#176C59'
  ctx.font = '700 21px sans-serif'
  ctx.fillText('产品明细', 82, 298)
  ctx.textAlign = 'right'
  ctx.font = '18px sans-serif'
  ctx.fillText(`共 ${quoteRows(order).length} 项`, 916, 298)
  ctx.textAlign = 'left'

  let y = 352
  page.rows.forEach((row, index) => {
    ctx.font = '18px sans-serif'
    const detailLines = wrap(ctx, row.detail, 590)
    const rowH = Math.max(94, 46 + detailLines.length * 26)
    ctx.fillStyle = index % 2 ? '#FAFDFC' : '#F2F9F5'
    ctx.beginPath()
    ctx.roundRect(58, y, 884, rowH - 10, 16)
    ctx.fill()
    ctx.fillStyle = '#138B69'
    ctx.beginPath()
    ctx.arc(88, y + 35, 18, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText(String(index + 1), 88, y + 41)
    ctx.textAlign = 'left'
    ctx.fillStyle = '#1C3027'
    ctx.font = '700 23px sans-serif'
    ctx.fillText(row.name, 124, y + 35)
    ctx.fillStyle = '#6C877A'
    ctx.font = '18px sans-serif'
    detailLines.forEach((line, lineIndex) => ctx.fillText(line, 124, y + 65 + lineIndex * 26))
    ctx.fillStyle = '#0B7A62'
    ctx.font = '700 28px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(yuan(row.subtotal), 910, y + 43)
    ctx.fillStyle = '#769186'
    ctx.font = '16px sans-serif'
    ctx.fillText(
      `${yuan(row.unitPrice)} / ${row.detail.indexOf('mm') >= 0 ? '㎡' : '件'}`,
      910,
      y + 70,
    )
    ctx.textAlign = 'left'
    y += rowH
  })

  if (pageIndex === pageCount - 1) {
    const total = Math.max(0, Math.round(Number(order.total) || 0))
    const boxY = Math.min(pageH - 202, y + 20)
    const totalBg = ctx.createLinearGradient(58, boxY, 942, boxY + 132)
    totalBg.addColorStop(0, '#0C795F')
    totalBg.addColorStop(1, '#19A982')
    ctx.fillStyle = totalBg
    ctx.beginPath()
    ctx.roundRect(58, boxY, 884, 132, 20)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.78)'
    ctx.font = '20px sans-serif'
    ctx.fillText('报价合计', 84, boxY + 50)
    ctx.fillText(`优惠 ${yuan(order.discount)} · 回收 ${yuan(order.recycle)}`, 84, boxY + 89)
    ctx.fillStyle = '#FFFFFF'
    ctx.font = '700 42px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(yuan(total), 914, boxY + 83)
    ctx.textAlign = 'left'
  }
  ctx.fillStyle = 'rgba(255,255,255,0.78)'
  ctx.font = '16px sans-serif'
  ctx.fillText('门窗利账 · 专业报价，感谢您的信任', 58, pageH - 32)
}

function getCanvas(page: any, selector: string): Promise<any> {
  return new Promise((resolve, reject) => {
    page
      .createSelectorQuery()
      .select(selector)
      .fields({ node: true })
      .exec((result: any[]) =>
        result && result[0]?.node ? resolve(result[0].node) : reject(new Error('报价画布未就绪')),
      )
  })
}

function canvasToJpeg(canvas: any): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.canvasToTempFilePath({
      canvas,
      fileType: 'jpg',
      quality: 0.92,
      success: (result) => resolve(result.tempFilePath),
      fail: reject,
    })
  })
}

async function renderImages(
  page: any,
  selector: string,
  order: QuoteExportOrder,
  painter: typeof paintPdfPage,
): Promise<string[]> {
  const canvas = await getCanvas(page, selector)
  const ctx = canvas.getContext('2d')
  const pages = quotePages(order)
  const paths: string[] = []
  for (let index = 0; index < pages.length; index++) {
    painter(canvas, ctx, order, pages[index], index, pages.length)
    paths.push(await canvasToJpeg(canvas))
  }
  return paths
}

/** 图片分享版：客户展示卡视觉，多页时逐页保存相册。 */
export function renderQuoteImages(page: any, selector: string, order: QuoteExportOrder) {
  return renderImages(page, selector, order, paintImagePage)
}

function detailRows(order: QuoteExportOrder) {
  const rows: any[][] = []
  ;(Array.isArray(order.items) ? order.items : []).forEach((item, itemIndex) => {
    const name = safeText(item.name) || `产品 ${itemIndex + 1}`
    const sizes = Array.isArray(item.sizes)
      ? item.sizes.filter((size) => n(size.w) && n(size.h))
      : []
    if (!sizes.length) {
      rows.push([
        itemIndex + 1,
        name,
        '—',
        '—',
        Math.max(1, Math.round(n(item.qty) || 1)),
        n(item.baseArea),
        itemBillingQty(item),
        Math.round(n(item.unitPrice)),
        itemSubtotal(item),
        safeText(item.note) || '—',
      ])
      return
    }
    sizes.forEach((size, sizeIndex) => {
      const count = Math.max(1, Math.round(n(size.count) || 1))
      const rawArea = (n(size.w) * n(size.h)) / 1_000_000
      rows.push([
        itemIndex + 1,
        sizeIndex === 0 ? name : '',
        Math.round(n(size.w)),
        Math.round(n(size.h)),
        count,
        n(item.baseArea),
        Math.max(rawArea, n(item.baseArea)) * count,
        Math.round(n(item.unitPrice)),
        sizeIndex === 0 ? itemSubtotal(item) : '',
        safeText(Array.isArray(size.notes) ? size.notes[0] : size.note) || '—',
      ])
    })
  })
  return rows.length
    ? rows
    : [
        [
          1,
          '订单报价',
          '—',
          '—',
          1,
          0,
          0,
          0,
          Math.max(0, Math.round(Number(order.total) || 0)),
          '未填写产品明细',
        ],
      ]
}

function styleSheet(sheet: any, widths: number[], merges: string[] = []) {
  sheet['!cols'] = widths.map((wch) => ({ wch }))
  if (merges.length) sheet['!merges'] = merges.map((ref) => XLSX.utils.decode_range(ref))
  return sheet
}

function stem(order: QuoteExportOrder) {
  const customer = (safeText(order.customer) || '客户').replace(/[\\/:*?"<>|]/g, '_').slice(0, 16)
  return `报价单_${customer}_${datePart(order.date).replace(/[^\d]/g, '') || '今日'}`
}

function writeFile(path: string, data: string | ArrayBuffer, encoding?: any): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().writeFile({
      filePath: path,
      data,
      encoding,
      success: () => resolve(),
      fail: reject,
    } as any)
  })
}

function readBase64(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath: path,
      encoding: 'base64',
      success: (res: any) => resolve(String(res.data)),
      fail: reject,
    } as any)
  })
}

function imageInfo(path: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) =>
    wx.getImageInfo({ src: path, success: resolve, fail: reject }),
  )
}

function ascii(value: string) {
  const out = new Uint8Array(value.length)
  for (let i = 0; i < value.length; i++) out[i] = value.charCodeAt(i) & 0xff
  return out
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((sum, part) => sum + part.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  parts.forEach((part) => {
    out.set(part, offset)
    offset += part.length
  })
  return out
}

function object(id: number, body: Uint8Array | string) {
  const content = typeof body === 'string' ? ascii(body) : body
  return concat([ascii(`${id} 0 obj\n`), content, ascii('\nendobj\n')])
}

/** 将 Canvas JPEG 页封装为 PDF，文字已在图片中渲染，中文不会因缺字体而乱码。 */
function makePdf(images: Array<{ bytes: Uint8Array; width: number; height: number }>) {
  const pageIds = images.map((_, index) => 3 + index * 3)
  const objects: Uint8Array[] = []
  objects.push(object(1, '<< /Type /Catalog /Pages 2 0 R >>'))
  objects.push(
    object(
      2,
      `<< /Type /Pages /Kids [${pageIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${images.length} >>`,
    ),
  )
  images.forEach((image, index) => {
    const pageId = pageIds[index]
    const imageId = pageId + 1
    const contentId = pageId + 2
    const pageWidth = 595
    const pageHeight = Math.max(420, Math.round((image.height / image.width) * pageWidth))
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im${index} Do\nQ\n`
    objects.push(
      object(
        pageId,
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im${index} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`,
      ),
    )
    objects.push(
      object(
        imageId,
        concat([
          ascii(
            `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`,
          ),
          image.bytes,
          ascii('\nendstream'),
        ]),
      ),
    )
    objects.push(object(contentId, `<< /Length ${content.length} >>\nstream\n${content}endstream`))
  })
  const header = ascii('%PDF-1.4\n')
  const offsets: number[] = []
  let offset = header.length
  objects.forEach((entry) => {
    offsets.push(offset)
    offset += entry.length
  })
  const xrefAt = offset
  const xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((n) => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF`
  return concat([header, ...objects, ascii(xref)])
}

export async function createQuotePdf(page: any, selector: string, order: QuoteExportOrder) {
  const imagePaths = await renderImages(page, selector, order, paintPdfPage)
  const images = await Promise.all(
    imagePaths.map(async (path) => {
      const [base64, info] = await Promise.all([readBase64(path), imageInfo(path)])
      return {
        bytes: new Uint8Array(wx.base64ToArrayBuffer(base64)),
        width: info.width,
        height: info.height,
      }
    }),
  )
  const path = `${wx.env.USER_DATA_PATH}/${stem(order)}.pdf`
  const pdf = makePdf(images)
  await writeFile(path, pdf.buffer)
  return path
}

export async function createQuoteSheet(order: QuoteExportOrder) {
  const workbook = XLSX.utils.book_new()
  workbook.Props = {
    Title: '门窗利账客户报价单',
    Subject: '门窗产品报价',
    Author: '门窗利账',
    CreatedDate: new Date(),
  }
  const total = Math.max(0, Math.round(Number(order.total) || 0))
  const overview = XLSX.utils.aoa_to_sheet([
    ['门窗利账｜客户报价单'],
    [],
    [
      '客户名称',
      safeText(order.customer) || '未填写客户',
      '报价编号',
      safeText(order.id) || '待确认',
    ],
    ['报价日期', datePart(order.date), '产品项数', quoteRows(order).length],
    [],
    ['报价摘要', '金额（元）'],
    ['产品明细合计', quoteRows(order).reduce((sum, row) => sum + row.subtotal, 0)],
    ['优惠', Math.max(0, Math.round(Number(order.discount) || 0))],
    ['回收', Math.max(0, Math.round(Number(order.recycle) || 0))],
    ['报价合计', total],
    [],
    ['订单备注', safeText(order.note) || '—'],
  ])
  styleSheet(overview, [18, 28, 18, 28], ['A1:D1', 'B12:D12'])
  const detail = XLSX.utils.aoa_to_sheet([
    [
      '序号',
      '产品名称',
      '宽（mm）',
      '高（mm）',
      '数量',
      '起算面积（㎡）',
      '计费面积（㎡）',
      '单价（元）',
      '小计（元）',
      '备注',
    ],
    ...detailRows(order),
  ])
  styleSheet(detail, [8, 20, 12, 12, 10, 16, 16, 14, 14, 24])
  const terms = XLSX.utils.aoa_to_sheet([
    ['报价说明'],
    ['1. 本工作簿由门窗利账自动生成，产品尺寸、数量与金额请以双方最终确认内容为准。'],
    ['2. “计费面积”已按每项设置的起算面积和尺寸数量计算。'],
    ['3. 优惠、回收及报价合计已在“报价概览”工作表中汇总。'],
    ['4. 请妥善保存本文件，便于后续报价核对和订单沟通。'],
  ])
  styleSheet(terms, [96])
  XLSX.utils.book_append_sheet(workbook, overview, '报价概览')
  XLSX.utils.book_append_sheet(workbook, detail, '产品明细')
  XLSX.utils.book_append_sheet(workbook, terms, '报价说明')
  const data = XLSX.write(workbook, {
    bookType: 'xlsx',
    type: 'array',
    compression: true,
  }) as ArrayBuffer
  const path = `${wx.env.USER_DATA_PATH}/${stem(order)}.xlsx`
  await writeFile(path, data)
  return path
}

/** 优先直接发文件；旧基础库回退到文件预览页，用户可从右上角转发。 */
export async function shareOrOpenFile(path: string, fileName: string) {
  const shareFile = (wx as any).shareFileMessage
  // 开发者工具对 shareFileMessage 会长时间超时；直接预览即可验证 XLSX/PDF 是否生成成功。
  const platform = (() => {
    try {
      return wx.getSystemInfoSync().platform
    } catch {
      return ''
    }
  })()
  if (platform !== 'devtools' && typeof shareFile === 'function') {
    try {
      await new Promise<void>((resolve, reject) =>
        shareFile({ filePath: path, fileName, success: resolve, fail: reject }),
      )
      return 'shared' as const
    } catch {
      // 部分微信版本不支持直接文件分享，回退文件预览。
    }
  }
  await new Promise<void>((resolve, reject) => {
    wx.openDocument({ filePath: path, showMenu: true, success: resolve, fail: reject } as any)
  })
  return 'opened' as const
}

export async function showQuoteImageShare(path: string) {
  const showShareImageMenu = (wx as any).showShareImageMenu
  if (typeof showShareImageMenu !== 'function') return false
  await new Promise<void>((resolve, reject) =>
    showShareImageMenu({ path, success: resolve, fail: reject }),
  )
  return true
}
