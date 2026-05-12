/**
 * 阴影系统
 */

export const shadow = {
  none: 'none',
  xs: '0 1px 2px 0 rgba(0,0,0,0.04)',
  sm: '0 2px 4px 0 rgba(0,0,0,0.06)',
  base: '0 4px 8px 0 rgba(0,0,0,0.08)',
  md: '0 6px 16px 0 rgba(0,0,0,0.08)',
  lg: '0 12px 24px 0 rgba(0,0,0,0.12)',
  xl: '0 20px 40px 0 rgba(0,0,0,0.16)',
  inner: 'inset 0 2px 4px 0 rgba(0,0,0,0.06)',
  brand: '0 6px 16px 0 rgba(255,77,45,0.25)',
  brandLg: '0 12px 28px 0 rgba(255,77,45,0.35)',
} as const

export type Shadow = typeof shadow
