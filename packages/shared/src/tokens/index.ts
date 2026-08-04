export { colors } from './colors'
export type { Colors } from './colors'

export { spacing } from './spacing'
export type { Spacing } from './spacing'

export { typography } from './typography'
export type { Typography } from './typography'

export { radius } from './radius'
export type { Radius } from './radius'

export { shadow } from './shadow'
export type { Shadow } from './shadow'

export { zIndex } from './z-index'
export type { ZIndex } from './z-index'

import { colors } from './colors'
import { spacing } from './spacing'
import { typography } from './typography'
import { radius } from './radius'
import { shadow } from './shadow'
import { zIndex } from './z-index'

/** 全部 tokens 一次性 import */
export const tokens = {
  colors,
  spacing,
  typography,
  radius,
  shadow,
  zIndex,
} as const

export type Tokens = typeof tokens
