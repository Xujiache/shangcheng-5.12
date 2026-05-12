/**
 * 经纬科技 · 色板
 * 主色：暖橙系（对标天猫橙，提亮原型 #e85d2e）
 * 配套：4 阶文字 / 3 阶背景 / 3 阶边框 / 5 阶状态 / 业务专属
 */

export const colors = {
  /** 品牌色 */
  brand: {
    primary: '#FF4D2D',
    primaryHover: '#FF6E4D',
    primaryActive: '#E63D1F',
    primaryLight: '#FFE9E2',
    primaryGhost: '#FFF5F2',
    secondary: '#FFB84D',
    secondaryHover: '#FFC971',
    gradient: 'linear-gradient(135deg, #FF6E4D 0%, #FF4D2D 100%)',
    gradientDark: 'linear-gradient(135deg, #FF4D2D 0%, #E63D1F 100%)',
  },

  /** 文字色（4 阶）*/
  text: {
    primary: '#1A1A2E',
    secondary: '#4E5969',
    tertiary: '#86909C',
    disabled: '#C9CDD4',
    inverse: '#FFFFFF',
    link: '#165DFF',
    danger: '#F53F3F',
  },

  /** 背景色（3 阶）*/
  bg: {
    page: '#F7F8FA',
    card: '#FFFFFF',
    hover: '#F2F3F5',
    active: '#E5E6EB',
    mask: 'rgba(0,0,0,0.55)',
    spotlight: 'rgba(255,77,45,0.05)',
  },

  /** 边框（3 阶）*/
  border: {
    default: '#E5E6EB',
    light: '#F2F3F5',
    dark: '#C9CDD4',
    focus: '#FF4D2D',
  },

  /** 状态色 */
  status: {
    success: '#00B42A',
    successBg: '#E8FFEA',
    warning: '#FF7D00',
    warningBg: '#FFF7E8',
    error: '#F53F3F',
    errorBg: '#FFECE8',
    info: '#165DFF',
    infoBg: '#E8F3FF',
    highlight: '#FFD43B',
    highlightBg: '#FFFBE6',
  },

  /** 业务色：价格分级、佣金等 */
  business: {
    priceRetail: '#FF4D2D', // 零售价（主红）
    priceWholesale: '#1677FF', // 批发价（信息蓝）
    priceMember: '#722ED1', // 会员价（紫）
    priceOriginal: '#86909C', // 原价（删除线灰）
    commission: '#00B42A', // 佣金（绿）
    vip: '#D4A038', // VIP（金）
    factory: '#FF4D2D', // 厂家 tag
    store: '#FF7D00', // 门店 tag
  },

  /** 阴影色 */
  shadow: {
    sm: 'rgba(0,0,0,0.04)',
    md: 'rgba(0,0,0,0.08)',
    lg: 'rgba(0,0,0,0.12)',
    brand: 'rgba(255,77,45,0.2)',
  },
} as const

export type Colors = typeof colors
