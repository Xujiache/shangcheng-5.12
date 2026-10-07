import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { searchTools, TOOL_CATALOG } from '../miniprogram/subpackages/more-tools/utils/catalog'
import { toRmbUppercase } from '../miniprogram/subpackages/more-tools/utils/amount-date'
import { calculateRetirement } from '../miniprogram/subpackages/more-tools/utils/retirement'
import {
  loadAccountRetirementProfile,
  saveAccountRetirementProfile,
} from '../miniprogram/subpackages/more-tools/utils/retirement-storage'
import {
  anglesFromAcceleration,
  calibratedReading,
} from '../miniprogram/subpackages/more-tools/utils/level'
import { lookupLength, nearbyAuspicious } from '../miniprogram/subpackages/more-tools/utils/luban'
import {
  TOOL_SHARE_IDS as MORE_TOOL_SHARE_IDS,
  toolShare as moreToolShare,
  toolShareTimeline as moreToolShareTimeline,
} from '../miniprogram/subpackages/more-tools/utils/tool-share'
import {
  TOOL_SHARE_IDS as TOOL_SHARE_IDS,
  toolShare,
  toolShareTimeline,
} from '../miniprogram/subpackages/tools/utils/tool-share'
import {
  TOOL_SHARE_IDS as FORMAT_SHARE_IDS,
  toolShare as formatShare,
  toolShareTimeline as formatShareTimeline,
} from '../miniprogram/subpackages/format/utils/tool-share'
import {
  TOOL_SHARE_IDS as WORKBOOK_SHARE_IDS,
  toolShare as workbookShare,
  toolShareTimeline as workbookShareTimeline,
} from '../miniprogram/subpackages/workbook/utils/tool-share'
import {
  TOOL_SHARE_IDS as METAL_SHARE_IDS,
  toolShare as metalShare,
  toolShareTimeline as metalShareTimeline,
} from '../miniprogram/subpackages/metal/utils/tool-share'

const coverVersion = 'comic-hd-v1'
const coverBaseUrl = `https://ewsn.top/ledger-share/${coverVersion}`
const expectedShareIds = [
  'more-tools',
  'rmb',
  'retire',
  'level',
  'glass',
  'glass-weight',
  'luban',
  'tide',
  'triangle',
  'arc',
  'cut',
  'format',
  'work-log',
  'metal',
  'metal-calc',
]
const coverManifest = JSON.parse(
  readFileSync(
    path.resolve(process.cwd(), `../../deploy/ledger-share/${coverVersion}/manifest.json`),
    'utf8',
  ),
) as {
  version: string
  baseUrl: string
  covers: {
    id: string
    file: string
    url: string
    width: number
    height: number
    bytes: number
    sha256: string
  }[]
}
assert.equal(
  coverManifest.version,
  coverVersion,
  'Share manifest version must match the cover URLs',
)
assert.equal(
  coverManifest.baseUrl,
  coverBaseUrl,
  'Share manifest must use the approved HTTPS domain and version path',
)
assert(Array.isArray(coverManifest.covers), 'Share manifest must contain a covers array')
assert.deepEqual(
  coverManifest.covers.map((cover) => cover.id).sort(),
  [...expectedShareIds].sort(),
  'Share manifest must list each of the 15 tools once',
)
assert.equal(
  new Set(coverManifest.covers.map((cover) => cover.url)).size,
  expectedShareIds.length,
  'Manifest cover URLs must be unique',
)
const shareGroups = [
  {
    packageName: 'more-tools',
    ids: MORE_TOOL_SHARE_IDS,
    share: moreToolShare,
    timeline: moreToolShareTimeline,
  },
  { packageName: 'tools', ids: TOOL_SHARE_IDS, share: toolShare, timeline: toolShareTimeline },
  {
    packageName: 'format',
    ids: FORMAT_SHARE_IDS,
    share: formatShare,
    timeline: formatShareTimeline,
  },
  {
    packageName: 'workbook',
    ids: WORKBOOK_SHARE_IDS,
    share: workbookShare,
    timeline: workbookShareTimeline,
  },
  { packageName: 'metal', ids: METAL_SHARE_IDS, share: metalShare, timeline: metalShareTimeline },
]
const shareResults = shareGroups.flatMap((group) =>
  group.ids.map((id) => ({ id, group, result: group.share(id) })),
)
assert.deepEqual(
  shareResults.map((item) => item.id).sort(),
  [...expectedShareIds].sort(),
  'Share configuration must list each of the 15 tools once',
)
assert.equal(
  new Set(shareResults.map((item) => item.result.imageUrl)).size,
  shareResults.length,
  'Each tool needs a distinct share cover',
)
assert.equal(
  new Set(shareResults.map((item) => item.result.title)).size,
  shareResults.length,
  'Each tool needs a distinct share title',
)
for (const { id, group, result } of shareResults) {
  assert(
    result.path.startsWith(`/subpackages/${group.packageName}/`),
    `Share route must stay in its subpackage: ${result.path}`,
  )
  const coverUrl = new URL(result.imageUrl)
  assert.equal(coverUrl.protocol, 'https:', `Share cover must use HTTPS: ${result.imageUrl}`)
  assert.equal(
    coverUrl.origin,
    'https://ewsn.top',
    `Share cover must use the approved domain: ${result.imageUrl}`,
  )
  assert.equal(
    coverUrl.pathname,
    `/ledger-share/${coverVersion}/${id}.jpg`,
    `Share cover must use the versioned tool path: ${result.imageUrl}`,
  )
  assert.equal(
    result.imageUrl,
    `${coverBaseUrl}/${id}.jpg`,
    `Share cover must have a canonical URL without credentials, query or fragment: ${result.imageUrl}`,
  )
  const manifestCover = coverManifest.covers.find((cover) => cover.id === id)
  assert(manifestCover, `Missing tool in share manifest: ${id}`)
  assert.equal(manifestCover.file, `${id}.jpg`, `Manifest filename must match tool: ${id}`)
  assert.equal(
    manifestCover.url,
    result.imageUrl,
    `Manifest URL must match share configuration: ${id}`,
  )
  assert(
    Number.isInteger(manifestCover.width) && manifestCover.width > 0,
    `Manifest width must be a positive integer: ${id}`,
  )
  assert(
    Number.isInteger(manifestCover.height) && manifestCover.height > 0,
    `Manifest height must be a positive integer: ${id}`,
  )
  assert(
    Number.isInteger(manifestCover.bytes) && manifestCover.bytes > 0,
    `Manifest bytes must be a positive integer: ${id}`,
  )
  assert.match(
    manifestCover.sha256,
    /^[0-9a-f]{64}$/,
    `Manifest sha256 must be lowercase hex: ${id}`,
  )
  const timeline = group.timeline(id)
  assert.deepEqual(timeline, { title: result.title, query: '', imageUrl: result.imageUrl })
  const query = {
    label: '尺寸 & 金额',
    zero: 0,
    flag: false,
    empty: '',
    missing: undefined,
    nil: null,
  }
  const encodedQuery = 'label=%E5%B0%BA%E5%AF%B8%20%26%20%E9%87%91%E9%A2%9D&zero=0&flag=false'
  assert.deepEqual(group.share(id, query), { ...result, path: `${result.path}?${encodedQuery}` })
  assert.deepEqual(group.timeline(id, query), { ...timeline, query: encodedQuery })
}
const tideShare = moreToolShare('tide', { stationId: 'P2717', date: '20261001' })
assert.match(tideShare.path, /stationId=P2717&date=20261001/)
assert.match(
  moreToolShareTimeline('tide', { stationId: 'P2717', date: '20261001' }).query,
  /stationId=P2717&date=20261001/,
)
const metalPathShare = metalShare('metal-calc', { category: 'aluminium sheet' })
assert.match(metalPathShare.path, /category=aluminium%20sheet/)
assert.match(
  metalShareTimeline('metal-calc', { category: 'aluminium sheet' }).query,
  /category=aluminium%20sheet/,
)

assert.equal(
  searchTools('玻璃')
    .map((tool) => tool.id)
    .join(','),
  'glass,glass-weight',
)
assert.equal(searchTools('').length, TOOL_CATALOG.length)
const others = searchTools('').filter((tool) => tool.group === 'other')
const glassIndex = others.findIndex((tool) => tool.id === 'glass')
assert.equal(others[glassIndex + 1].id, 'glass-weight')
assert.equal(
  Math.floor(glassIndex / 5),
  Math.floor((glassIndex + 1) / 5),
  'Both glass entries must be adjacent in the five-column grid',
)
assert.equal(
  searchTools('潮汐')
    .map((tool) => tool.id)
    .join(','),
  'tide',
)
assert.deepEqual(toRmbUppercase('0'), { ok: true, normalized: '0', uppercase: '零元整' })
assert.equal(
  toRmbUppercase('100010001.01').ok && toRmbUppercase('100010001.01').uppercase,
  '壹亿零壹万零壹元零壹分',
)
assert.equal(toRmbUppercase('999999999999.99').ok, true)
assert.equal(toRmbUppercase('1.234').ok, false)
assert.equal(toRmbUppercase('-1').ok, false)

const today = '2026-09-28'
for (const [category, birthMonth] of [
  ['male', '1965-01'],
  ['female55', '1970-01'],
  ['female50', '1975-01'],
] as const) {
  const result = calculateRetirement({ category, birthMonth, workType: 'standard' }, today)
  assert.equal(result.ok && result.status === 'calculated' && result.retirementMonth, '2025-02')
}
assert.equal(
  calculateRetirement({ category: 'male', birthMonth: '1975-01', workType: 'standard' }, today)
    .status,
  'calculated',
)
assert.equal(
  calculateRetirement({ category: 'unknown', birthMonth: '1975-01', workType: 'standard' }, today)
    .status,
  'needs-review',
)
assert.equal(
  calculateRetirement({ category: 'male', birthMonth: '1975-01', workType: 'special' }, today)
    .status,
  'needs-review',
)

const saved = new Map<string, unknown>()
const storage = {
  get: (key: string) => saved.get(key),
  set: (key: string, value: unknown) => {
    saved.set(key, value)
  },
  remove: (key: string) => {
    saved.delete(key)
  },
}
assert.equal(
  saveAccountRetirementProfile(
    storage,
    'alice',
    { category: 'female50', birthMonth: '1975-01', workType: 'standard' },
    today,
  ).ok,
  true,
)
assert.equal(loadAccountRetirementProfile(storage, 'alice', today).profile?.birthMonth, '1975-01')
assert.equal(loadAccountRetirementProfile(storage, 'bob', today).profile, null)

assert.equal(anglesFromAcceleration({ x: 0, y: 0, z: 1 })?.flatDeg, 0)
assert.equal(
  calibratedReading({ x: 0.2, y: 0.1, z: 0.97 }, { x: 0.2, y: 0.1, z: 0.97 })?.flatDeg,
  0,
)
const ruler = lookupLength(1975, 'mm', 'yang')
assert.equal(ruler.ok && ruler.group.name, '官')
assert.equal(ruler.ok && ruler.item.name, '富贵')
assert.equal(lookupLength(0).ok, false)
const nearby = nearbyAuspicious(1975, 'yang', { toleranceMm: 30, requireBoth: true })
assert.equal(
  nearby.ok &&
    nearby.items?.every((item) => item.yang.group.auspicious && item.yin.group.auspicious),
  true,
)
console.log('more tools logic verified')
