// 分享封面生成：离屏 canvas 画一张品牌化 5:4 卡片，导出临时文件路径供 onShareAppMessage.imageUrl 使用。
// 不依赖图片资源（全部矢量绘制），微信卡片推荐比例 5:4。

interface CoverOpts {
  title: string
  subtitle?: string
  code?: string
}

const W = 750
const H = 600

function roundRect(ctx: any, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

// 逐字符按宽度折行（中文无空格）
function wrapText(ctx: any, text: string, maxWidth: number, maxLines: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const ch of text) {
    const test = line + ch
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line)
      line = ch
      if (lines.length === maxLines - 1) break
    } else {
      line = test
    }
  }
  if (line) lines.push(line)
  return lines.slice(0, maxLines)
}

// 等距小立方体（呼应 lz-icon 'cube' 品牌标记）
function drawCube(ctx: any, cx: number, cy: number, s: number) {
  const h = s / 2
  // 顶面
  ctx.fillStyle = 'rgba(255,255,255,0.98)'
  ctx.beginPath()
  ctx.moveTo(cx, cy - h)
  ctx.lineTo(cx + h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx - h, cy - h / 2)
  ctx.closePath()
  ctx.fill()
  // 左面
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.beginPath()
  ctx.moveTo(cx - h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx, cy + h)
  ctx.lineTo(cx - h, cy + h / 2)
  ctx.closePath()
  ctx.fill()
  // 右面
  ctx.fillStyle = 'rgba(255,255,255,0.86)'
  ctx.beginPath()
  ctx.moveTo(cx + h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx, cy + h)
  ctx.lineTo(cx + h, cy + h / 2)
  ctx.closePath()
  ctx.fill()
}

export function drawShareCover(canvas: any, opts: CoverOpts): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      canvas.width = W
      canvas.height = H
      const ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))

      // 背景：主色斜向渐变
      const g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, '#0E7C66')
      g.addColorStop(1, '#16A985')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      // 柔光装饰圆
      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.arc(W - 70, 120, 170, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(40, H - 30, 130, 0, Math.PI * 2)
      ctx.fill()

      // 品牌行：立方体 + 名称
      drawCube(ctx, 78, 92, 60)
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('门窗利账', 128, 96)

      // 主标题（自动折行，最多 2 行）
      ctx.textBaseline = 'top'
      ctx.font = 'bold 56px sans-serif'
      const titleLines = wrapText(ctx, opts.title, W - 120, 2)
      let y = 220
      for (const l of titleLines) {
        ctx.fillText(l, 60, y)
        y += 72
      }

      // 副标题
      if (opts.subtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '30px sans-serif'
        ctx.fillText(opts.subtitle, 60, y + 6)
      }

      // 邀请码胶囊
      if (opts.code) {
        const pw = 420
        const ph = 92
        const px = 60
        const py = H - 150
        roundRect(ctx, px, py, pw, ph, 20)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fill()
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '28px sans-serif'
        ctx.fillText('邀请码', px + 28, py + ph / 2)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 44px sans-serif'
        ctx.fillText(opts.code, px + 138, py + ph / 2 + 2)
      }

      wx.canvasToTempFilePath({
        canvas,
        x: 0,
        y: 0,
        width: W,
        height: H,
        destWidth: W,
        destHeight: H,
        fileType: 'jpg',
        quality: 0.92,
        success: (r: any) => resolve(r.tempFilePath),
        fail: reject,
      })
    } catch (e) {
      reject(e)
    }
  })
}

// 在页面内取 selector 对应的离屏 canvas 节点并生成封面，失败返回空串（分享回退默认截图）
export function makeShareCover(ctx: any, selector: string, opts: CoverOpts): Promise<string> {
  return new Promise((resolve) => {
    try {
      ctx
        .createSelectorQuery()
        .select(selector)
        .fields({ node: true })
        .exec((res: any) => {
          const node = res && res[0] && res[0].node
          if (!node) return resolve('')
          drawShareCover(node, opts)
            .then(resolve)
            .catch(() => resolve(''))
        })
    } catch (e) {
      resolve('')
    }
  })
}
