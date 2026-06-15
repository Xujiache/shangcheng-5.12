// 分享封面生成：离屏 canvas 画一张品牌化 5:4 卡片，导出临时文件路径供 onShareAppMessage.imageUrl 使用。
// 用 .js（CommonJS）而非 .ts：微信开发者工具不会即时编译会话中新增的 .ts 工具模块，
// 直接提供已编译的 .js 可免编译加载（类型见同目录 share-cover.d.ts）。
var W = 750
var H = 600

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function wrapText(ctx, text, maxWidth, maxLines) {
  var lines = []
  var line = ''
  for (var i = 0; i < text.length; i++) {
    var ch = text[i]
    var test = line + ch
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

function drawCube(ctx, cx, cy, s) {
  var h = s / 2
  ctx.fillStyle = 'rgba(255,255,255,0.98)'
  ctx.beginPath()
  ctx.moveTo(cx, cy - h)
  ctx.lineTo(cx + h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx - h, cy - h / 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.72)'
  ctx.beginPath()
  ctx.moveTo(cx - h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx, cy + h)
  ctx.lineTo(cx - h, cy + h / 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.86)'
  ctx.beginPath()
  ctx.moveTo(cx + h, cy - h / 2)
  ctx.lineTo(cx, cy)
  ctx.lineTo(cx, cy + h)
  ctx.lineTo(cx + h, cy + h / 2)
  ctx.closePath()
  ctx.fill()
}

function drawShareCover(canvas, opts) {
  return new Promise(function (resolve, reject) {
    try {
      canvas.width = W
      canvas.height = H
      var ctx = canvas.getContext('2d')
      if (!ctx) return reject(new Error('no ctx'))

      var g = ctx.createLinearGradient(0, 0, W, H)
      g.addColorStop(0, '#0E7C66')
      g.addColorStop(1, '#16A985')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)

      ctx.fillStyle = 'rgba(255,255,255,0.08)'
      ctx.beginPath()
      ctx.arc(W - 70, 120, 170, 0, Math.PI * 2)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(40, H - 30, 130, 0, Math.PI * 2)
      ctx.fill()

      drawCube(ctx, 78, 92, 60)
      ctx.fillStyle = '#ffffff'
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 36px sans-serif'
      ctx.fillText('门窗利账', 128, 96)

      ctx.textBaseline = 'top'
      ctx.font = 'bold 56px sans-serif'
      var titleLines = wrapText(ctx, opts.title, W - 120, 2)
      var y = 220
      for (var i = 0; i < titleLines.length; i++) {
        ctx.fillText(titleLines[i], 60, y)
        y += 72
      }

      if (opts.subtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)'
        ctx.font = '30px sans-serif'
        ctx.fillText(opts.subtitle, 60, y + 6)
      }

      if (opts.code) {
        var pw = 420
        var ph = 92
        var px = 60
        var py = H - 150
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
        canvas: canvas,
        x: 0,
        y: 0,
        width: W,
        height: H,
        destWidth: W,
        destHeight: H,
        fileType: 'jpg',
        quality: 0.92,
        success: function (r) {
          resolve(r.tempFilePath)
        },
        fail: reject,
      })
    } catch (e) {
      reject(e)
    }
  })
}

function makeShareCover(ctx, selector, opts) {
  return new Promise(function (resolve) {
    try {
      ctx
        .createSelectorQuery()
        .select(selector)
        .fields({ node: true })
        .exec(function (res) {
          var node = res && res[0] && res[0].node
          if (!node) return resolve('')
          drawShareCover(node, opts)
            .then(resolve)
            .catch(function () {
              resolve('')
            })
        })
    } catch (e) {
      resolve('')
    }
  })
}

module.exports = { drawShareCover: drawShareCover, makeShareCover: makeShareCover }
