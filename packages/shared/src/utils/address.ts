/**
 * 一键识别地址：从粘贴的文本中解析姓名/手机号/地址
 */
import type { ParsedAddress } from '../types/order'

const PHONE_REGEX = /1[3-9]\d{9}/
const REGION_REGEX = /(.+?(?:省|自治区|特别行政区))?(.+?(?:市|地区|盟|州))?(.+?(?:区|县|市))?/

/** 解析地址文本 */
export function parseAddress(raw: string): ParsedAddress {
  if (!raw) return {}

  const text = raw
    .replace(/[\s,，；;|]+/g, ' ')
    .replace(/收\s*货\s*[:：]?/g, '')
    .replace(/电\s*话\s*[:：]?/g, '')
    .replace(/手\s*机\s*[:：]?/g, '')
    .replace(/姓\s*名\s*[:：]?/g, '')
    .replace(/地\s*址\s*[:：]?/g, '')
    .trim()

  const phoneMatch = text.match(PHONE_REGEX)
  const phone = phoneMatch?.[0]

  // 移除手机号后再解析其余部分
  const rest = phone ? text.replace(phone, ' ').replace(/\s+/g, ' ').trim() : text

  // 用空格切分，第一个 token 大概率是姓名（≤4 字）
  const tokens = rest.split(' ').filter(Boolean)
  let name: string | undefined
  let addressText = rest

  if (tokens.length > 1 && tokens[0].length <= 4 && /^[一-龥a-zA-Z·]+$/.test(tokens[0])) {
    name = tokens[0]
    addressText = tokens.slice(1).join(' ')
  }

  // 提取区域三级
  const regionMatch = addressText.match(REGION_REGEX)
  let region: string | undefined
  let detail: string | undefined
  if (regionMatch) {
    const [, province, city, district] = regionMatch
    region = [province, city, district].filter(Boolean).join(' ')
    detail = addressText.replace(province ?? '', '').replace(city ?? '', '').replace(district ?? '', '').trim()
  } else {
    detail = addressText
  }

  return {
    name,
    phone,
    region: region || undefined,
    detail: detail || undefined,
  }
}
