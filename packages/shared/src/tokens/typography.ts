/**
 * 字体系统
 */

export const typography = {
  fontFamily: {
    base: '"HarmonyOS Sans SC", -apple-system, BlinkMacSystemFont, "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"JetBrains Mono", "Fira Code", "Source Code Pro", Consolas, "Courier New", monospace',
    number: 'Inter, "HarmonyOS Sans SC", -apple-system, BlinkMacSystemFont, sans-serif',
  },
  fontSize: {
    xs: '10px',
    sm: '12px',
    base: '14px',
    md: '15px',
    lg: '16px',
    xl: '18px',
    '2xl': '20px',
    '3xl': '24px',
    '4xl': '28px',
    '5xl': '32px',
    '6xl': '40px',
  },
  lineHeight: {
    xs: '14px',
    sm: '18px',
    base: '22px',
    md: '24px',
    lg: '26px',
    xl: '28px',
    '2xl': '30px',
    '3xl': '34px',
    '4xl': '40px',
    '5xl': '44px',
    '6xl': '54px',
    tight: 1.2,
    normal: 1.5,
    loose: 1.7,
  },
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tight: '-0.5px',
    normal: '0',
    wide: '0.5px',
    wider: '1px',
  },
} as const

export type Typography = typeof typography
