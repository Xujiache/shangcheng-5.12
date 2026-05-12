/**
 * Faker 实例与扩展
 */
import { Faker, base, en, zh_CN } from '@faker-js/faker'

/** 中文 Faker（推荐主用），英文与基础 locale 用于补齐中文包缺失的数据集 */
export const faker = new Faker({ locale: [zh_CN, en, base] })

/** 设置 seed 以便确定性生成 */
export function seed(value = 42): void {
  faker.seed(value)
}

/** 随机价格（带分） */
export function priceBetween(min: number, max: number): number {
  return Math.round(faker.number.float({ min, max, fractionDigits: 2 }) * 100) / 100
}

/** 随机选 N 个不重复 */
export function pickN<T>(arr: T[], n: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random())
  return shuffled.slice(0, Math.min(n, arr.length))
}

/** 一定概率返回 true */
export function chance(percent: number): boolean {
  return Math.random() * 100 < percent
}

/** 一定概率返回 null */
export function maybe<T>(value: T, nullPercent = 30): T | undefined {
  return chance(nullPercent) ? undefined : value
}

/** 占位图：原型用 placeholder */
export function placeholderImage(w = 400, h = 400): string {
  const id = faker.number.int({ min: 1, max: 100 })
  return `https://picsum.photos/seed/${id}/${w}/${h}`
}

/** 中文人名 */
export function chineseName(): string {
  return faker.person.fullName()
}

/** 中国手机号 */
export function chinaPhone(): string {
  const prefix = faker.helpers.arrayElement([
    '130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
    '150', '151', '152', '155', '156', '157', '158', '159',
    '180', '181', '182', '183', '185', '186', '187', '188', '189',
    '170', '171', '173', '175', '176', '177', '178',
  ])
  return prefix + faker.string.numeric(8)
}

/** 经营品类 */
export const BUSINESS_CATEGORIES = [
  '家具', '灯具', '布艺', '厨卫', '摆件', '建材', '家电', '定制',
]

/** 城市 */
export const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '南京', '苏州', '佛山',
]
