// 线性图标路径集（1.8 描边，24x24），取自设计 theme.jsx。
// 小程序不支持内联 SVG → 用 data-URI 喂给 <image>。

export const ICONS: Record<string, string> = {
  back: 'M15 5l-7 7 7 7',
  chevron: 'M9 6l6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  trash: 'M5 7h14M10 7V5h4v2M6 7l1 13h10l1-13',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  search: 'M11 4a7 7 0 105 12 7 7 0 00-5-12zM21 21l-5-5',
  calendar: 'M7 4v3M17 4v3M4 9h16M5 6h14v14H5z',
  filter: 'M4 6h16M7 12h10M10 18h4',
  user: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 20a7 7 0 0114 0',
  bell: 'M6 9a6 6 0 0112 0c0 5 2 6 2 6H4s2-1 2-6M10 20a2 2 0 004 0',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6l8-3z',
  lock: 'M6 11V8a6 6 0 0112 0v3M5 11h14v9H5z',
  info: 'M12 8h.01M11 12h1v5h1M12 3a9 9 0 100 18 9 9 0 000-18z',
  logout: 'M14 8V6a2 2 0 00-2-2H5v16h7a2 2 0 002-2v-2M9 12h12m0 0l-3-3m3 3l-3 3',
  close: 'M6 6l12 12M18 6L6 18',
  check: 'M5 13l4 4L19 7',
  camera: 'M4 8h3l2-2h6l2 2h3v12H4zM12 17a3.5 3.5 0 100-7 3.5 3.5 0 000 7z',
  up: 'M12 19V5M6 11l6-6 6 6',
  down: 'M12 5v14M6 13l6 6 6-6',
  orders: 'M7 3h7l5 5v13H7zM14 3v5h5M9 13h6M9 17h6',
  profit: 'M4 19h16M7 16V9M12 16V5M17 16v-4',
  labor: 'M12 12a4 4 0 100-8 4 4 0 000 8zM5 21a7 7 0 0114 0M19 8l1.5 1.5M5 8L3.5 9.5',
  trend: 'M3 17l5-6 4 3 6-8M14 6h5v5',
  wechat:
    'M9 4C5.1 4 2 6.7 2 10c0 1.9 1 3.6 2.7 4.7L4 18l3-1.6c.6.1 1.3.2 2 .2M16 9c-3.3 0-6 2.2-6 5s2.7 5 6 5c.6 0 1.2-.1 1.7-.2L21 20l-.6-2.3c1-.8 1.6-1.9 1.6-3.2 0-2.8-2.7-5-6-5z',
  cube: 'M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3zM12 3v18M4 7.5l8 4.5 8-4.5',
  card: 'M3 7h18v10H3zM3 11h18',
  clock: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8v4l3 2',
  tag: 'M3 12V4h8l9 9-8 8-9-9zM7.5 7.5h.01',
  home: 'M4 11.5L12 4l8 7.5M6 10v9.5h12V10',
  phone: 'M5 4h4l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v4a1 1 0 01-1 1A16 16 0 014 5a1 1 0 011-1z',
  key: 'M14 7a3 3 0 11-2.8 4H8v2H6v2H3v-3l5.2-5.2A3 3 0 0114 7zM15 8h.01',
  device: 'M7 3h10v18H7zM10 18h4',
  wallet: 'M3 7h15a2 2 0 012 2v8a2 2 0 01-2 2H4a1 1 0 01-1-1V7zM3 7l1.5-3h11L17 7M17 13h.01',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7zM12 9a3 3 0 100 6 3 3 0 000-6z',
  eyeoff:
    'M4 4l16 16M9.5 9.5a3 3 0 004 4M6.7 6.7C4 8.3 2 12 2 12s3.5 7 10 7c1.7 0 3.2-.4 4.5-1M9.5 5.3A9 9 0 0112 5c6.5 0 10 7 10 7a18 18 0 01-2.7 3.4',
  finger: 'M12 5a6 6 0 00-6 6v3M12 5a6 6 0 016 6M9 21c-.5-1.5-1-3-1-6a4 4 0 018 0M12 11v6M15 15v2',
  download: 'M12 4v11m0 0l-4-4m4 4l4-4M5 20h14',
  message: 'M5 5h14v10H8l-3 3V5z',
  star: 'M12 3l2.6 5.6 6.1.7-4.5 4.2 1.2 6L12 16.9 6.6 19.5l1.2-6L3.3 9.3l6.1-.7L12 3z',
  heart:
    'M12 20s-7-4.5-9.3-8.8C1 8 2.7 5 6 5c2 0 3.2 1.2 4 2.3C10.8 6.2 12 5 14 5c3.3 0 5 3 3.3 6.2C19 15.5 12 20 12 20z',
  doc: 'M7 3h7l5 5v13H7zM14 3v5h5M9 12h6M9 16h4',
  target:
    'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8zM12 11.5a.5.5 0 100 1 .5.5 0 000-1z',
  refresh: 'M4 12a8 8 0 0114-5.3L21 9M21 4v5h-5M20 12a8 8 0 01-14 5.3L3 15M3 20v-5h5',
  crown: 'M4 8l4 4 4-6 4 6 4-4-1.5 11H5.5L4 8zM5 21h14',
  gift: 'M4 11h16v9H4zM4 8h16v3H4zM12 8v12M12 8S10 4 7.5 4 5 6 7 8m5 0s2-4 4.5-4S19 6 17 8',
}

const TOKEN_HEX: Record<string, string> = {
  text: '#15201C',
  muted: '#5C6B64',
  faint: '#94A19A',
  accent: '#0E7C66',
  'accent-text': '#0E7C66',
  loss: '#C8442B',
  white: '#FFFFFF',
  '#fff': '#FFFFFF',
  c1: '#0E7C66',
  c2: '#4C9FBE',
  c3: '#DFA03A',
  c4: '#D2735A',
  c5: '#84A06A',
  c6: '#9488B8',
}

/** token 名或原色 → 具体颜色（data-URI SVG 不支持 CSS 变量） */
export function resolveColor(c?: string): string {
  if (!c) return '#15201C'
  if (c[0] === '#' || c.indexOf('rgb') === 0) return c
  return TOKEN_HEX[c] || c
}

/** 生成图标 data-URI（供 <image src> 使用） */
export function svgIcon(name: string, color = '#15201C', size = 24, stroke = 1.8): string {
  const d = ICONS[name] || ''
  const c = resolveColor(color)
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24"` +
    ` fill="none" stroke="${c}" stroke-width="${stroke}" stroke-linecap="round" stroke-linejoin="round">` +
    `<path d="${d}"/></svg>`
  return 'data:image/svg+xml,' + encodeURIComponent(svg)
}
