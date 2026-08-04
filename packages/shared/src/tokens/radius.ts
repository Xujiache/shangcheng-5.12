/**
 * 圆角系统
 */

export const radius = {
  none: '0',
  xs: '2px',
  sm: '4px',
  md: '6px',
  base: '8px',
  lg: '12px',
  xl: '16px',
  '2xl': '20px',
  '3xl': '24px',
  pill: '999px',
  full: '50%',
} as const

export type Radius = typeof radius
