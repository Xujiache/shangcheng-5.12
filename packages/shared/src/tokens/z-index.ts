/**
 * 层级（z-index）
 */

export const zIndex = {
  base: 0,
  dropdown: 100,
  sticky: 200,
  fixed: 300,
  modal: 1000,
  popover: 1100,
  tooltip: 1200,
  toast: 1300,
  max: 9999,
} as const

export type ZIndex = typeof zIndex
