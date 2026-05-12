/**
 * SVG → base64 data URI（mp-weixin / H5 双端可用）
 *
 * 为什么不用 URL-encoded：
 *   data:image/svg+xml,<encoded> 在 H5 OK，但 mp-weixin（包括较新的微信客户端）
 *   对该形式的解析不稳定，<image> 经常显示不出来。base64 形式所有版本都认。
 *
 * 为什么自实现 base64：
 *   mp-weixin 在多数客户端版本没有全局 btoa；
 *   uni.arrayBufferToBase64 全端都有但需要 ArrayBuffer；
 *   SVG 全是 ASCII，可直接按字符码 → 字节 → base64。
 */

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function asciiToBase64(str: string): string {
  let out = ''
  let i = 0
  const len = str.length
  while (i < len) {
    const c1 = str.charCodeAt(i++) & 0xff
    const c2 = i < len ? str.charCodeAt(i++) & 0xff : NaN
    const c3 = i < len ? str.charCodeAt(i++) & 0xff : NaN

    const e1 = c1 >> 2
    const e2 = ((c1 & 0x3) << 4) | (isNaN(c2) ? 0 : c2 >> 4)
    const e3 = isNaN(c2) ? 64 : (((c2 & 0xf) << 2) | (isNaN(c3) ? 0 : c3 >> 6))
    const e4 = isNaN(c3) ? 64 : c3 & 0x3f

    out += B64_CHARS[e1] + B64_CHARS[e2]
    out += e3 === 64 ? '=' : B64_CHARS[e3]
    out += e4 === 64 ? '=' : B64_CHARS[e4]
  }
  return out
}

/** 把一段 SVG 字符串拼成 mp-weixin / H5 都能识别的 data URI */
export function svgToDataUri(svg: string): string {
  return `data:image/svg+xml;base64,${asciiToBase64(svg)}`
}

/** 24x24 线条图标：fill=none，描边色由调用方指定 */
export function lineIcon(d: string, color: string, strokeWidth = 1.6): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' ` +
    `stroke='${color}' stroke-width='${strokeWidth}' stroke-linecap='round' ` +
    `stroke-linejoin='round'><path d='${d}'/></svg>`
  return svgToDataUri(svg)
}

/** 24x24 填充图标：fill=color，stroke=none */
export function fillIcon(d: string, color: string): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' ` +
    `fill='${color}' stroke='none'><path d='${d}'/></svg>`
  return svgToDataUri(svg)
}
