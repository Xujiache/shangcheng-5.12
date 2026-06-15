/**
 * 门窗利账 · 运行配置
 *
 * API_BASE：后端基址（不含 /api/v1，request 工具会补 /api/v1/l/*）。
 * - 默认连统一后端 https://ewsn.top（与商城其它端一致）。
 * - 本地调试后端：改成 'http://localhost:3000'，并在微信开发者工具
 *   勾选「不校验合法域名」（project.config 已设 urlCheck:false）。
 */
export const API_BASE = 'https://ewsn.top'

/** access token 在本地存储的键名 */
export const TOKEN_KEY = 'ledger_token'

/**
 * 应用版本号（与发版号同步）
 * - release/trial 环境优先用 wx.getAccountInfoSync().miniProgram.version
 * - develop 环境该值为空，回退到此常量
 */
export const VERSION = '1.0.2'
