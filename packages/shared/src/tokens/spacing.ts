/**
 * 间距系统 · 8px 基线
 */

export const spacing = {
  0: '0',
  1: '2px',
  2: '4px',
  3: '6px',
  4: '8px',
  5: '10px',
  6: '12px',
  7: '14px',
  8: '16px',
  10: '20px',
  12: '24px',
  14: '28px',
  16: '32px',
  20: '40px',
  24: '48px',
  32: '64px',
  40: '80px',
  48: '96px',
  56: '112px',
  64: '128px',
} as const

export type Spacing = typeof spacing
