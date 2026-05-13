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
 *
 * 为什么要 resolveColor：
 *   SVG 在 data URI 沙箱里渲染，外层 CSS 变量进不去。
 *   调用方传 color="var(--brand-primary)" 时，SVG 拿到的是字面量字符串，
 *   渲染失败。这里维护一份 token 镜像，把 var(--xxx) 解析成真实 hex。
 *   tokens 源在 packages/shared/src/tokens/tokens.css。
 */

const TOKEN_COLORS: Record<string, string> = {
  'brand-primary': '#ff4d2d',
  'brand-primary-hover': '#ff6e4d',
  'brand-primary-active': '#e63d1f',
  'brand-secondary': '#ffb84d',
  'text-primary': '#1a1a2e',
  'text-secondary': '#4e5969',
  'text-tertiary': '#86909c',
  'text-disabled': '#c9cdd4',
  'text-inverse': '#ffffff',
  'text-link': '#165dff',
  'text-danger': '#f53f3f',
  'border-default': '#e5e6eb',
  'border-light': '#f2f3f5',
  'border-dark': '#c9cdd4',
  'status-success': '#00b42a',
  'status-warning': '#ff7d00',
  'status-error': '#f53f3f',
  'status-info': '#165dff',
  'status-highlight': '#ffd43b',
  'price-retail': '#ff4d2d',
  'price-wholesale': '#1677ff',
  'price-member': '#722ed1',
  'color-commission': '#00b42a',
  'color-vip': '#d4a038',
}

/** 把 "var(--brand-primary)" 解析成 "#ff4d2d"；非 var 形态原样返回 */
export function resolveColor(color: string): string {
  if (!color) return '#1F2329'
  const m = color.match(/^var\(\s*--([\w-]+)\s*(?:,\s*([^)]+))?\)$/)
  if (!m) return color
  const tokenName = m[1]
  const fallback = m[2]?.trim()
  return TOKEN_COLORS[tokenName] || fallback || '#1F2329'
}

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
  const c = resolveColor(color)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' ` +
    `stroke='${c}' stroke-width='${strokeWidth}' stroke-linecap='round' ` +
    `stroke-linejoin='round'><path d='${d}'/></svg>`
  return svgToDataUri(svg)
}

/** 24x24 填充图标：fill=color，stroke=none */
export function fillIcon(d: string, color: string): string {
  const c = resolveColor(color)
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' ` +
    `fill='${c}' stroke='none'><path d='${d}'/></svg>`
  return svgToDataUri(svg)
}
