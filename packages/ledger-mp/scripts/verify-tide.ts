import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const now = '2026-09-30T05:30:00+08:00'
class TestDate extends Date {
  constructor(value: string | number = now) { super(value) }
  static now() { return Date.parse(now) }
}
let page: any
let clipboard = ''
const labels: string[] = []
const coordinates: number[] = []
const exportsPending: any[] = []
const removedFiles: string[] = []
let deferExport = false
const ctx: any = new Proxy({}, { get: (_, key) => {
  if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
  if (key === 'fillText') return (text: string, x: number, y: number) => { labels.push(text); coordinates.push(x, y) }
  return (...args: unknown[]) => args.forEach(arg => { if (typeof arg === 'number') coordinates.push(arg) })
} })
const canvas = { getContext: () => ctx }
const query = () => {
  let rectCallback: any
  const chain: any = {
    in: () => chain, select: () => chain, fields: () => chain,
    boundingClientRect: (callback: any) => { rectCallback = callback; return chain },
    exec: (callback?: any) => { rectCallback?.({ left: 0, width: 310 }); callback?.([{ node: canvas, width: 310, height: 192 }]) },
  }
  return chain
}
const source = readFileSync(new URL('../miniprogram/subpackages/more-tools/tide/index.ts', import.meta.url), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
vm.runInNewContext(output, {
  exports: {}, Date: TestDate, setTimeout, clearTimeout, setInterval, clearInterval,
  require: (id: string) => {
    if (id.endsWith('page-transition')) return { MotionPage: (definition: any) => {
      page = { ...definition, data: structuredClone(definition.data), setData(values: any, callback?: () => void) { Object.assign(this.data, values); callback?.() } }
    } }
    if (id.endsWith('tool-events')) return { reportToolEvent() {} }
    if (id.endsWith('request')) return { request: async () => { throw Error('Unexpected network request') } }
    throw Error(id)
  },
  wx: { createSelectorQuery: query, createOffscreenCanvas: () => canvas, canvasToTempFilePath: (value: any) => {
    if (deferExport) exportsPending.push(value)
    else value.success({ tempFilePath: '/test-chart.png' })
  }, getFileSystemManager: () => ({ unlink: (value: any) => removedFiles.push(value.filePath) }),
    getWindowInfo: () => ({ pixelRatio: 2 }), setClipboardData: (value: any) => { clipboard = value.data } },
})
const date = '20260930'
const time = (clock: string) => `2026-09-30T${clock}:00+08:00`
const forecast = {
  date, station: { id: 'P2717', name: '青岛' },
  hourly: Array.from({ length: 24 }, (_, hour) => ({ time: time(`${String(hour).padStart(2, '0')}:00`), height: 1 + hour / 10 })),
  events: [
    { time: time('00:57'), height: .76, type: 'L' },
    { time: time('06:01'), height: 4.51, type: 'H' },
    { time: time('13:15'), height: .41, type: 'L' },
    { time: time('18:37'), height: 4.54, type: 'H' },
  ],
}
page.data.station = forecast.station
page.data.forecast = forecast
page.refreshTime()
assert.equal(page.data.info.primaryValue, '1.55')
assert.equal(page.data.info.direction, '涨潮')
assert.equal(page.data.info.nextTime, '0小时31分')
assert.equal(page.data.info.range, '4.13 m')
assert.equal(page.data.info.events.filter((event: any) => event.isNext).length, 1)
assert.equal(page.data.info.events[1].isNext, true)
assert.equal(page.data.days[2].label, '周五')
assert(labels.includes('06:01') && labels.includes('13:15') && labels.includes('现在'))
assert(coordinates.every(Number.isFinite), 'Chart coordinates must be finite')

page.chartTouch({ touches: [{ clientX: 28 + (310 - 40) / 2 }] })
assert.equal(page.data.selectedHour, 12)
assert.equal(page.data.selectedPoint, '12:00 · 2.20 m')
page.chartTouch({ touches: [{ clientX: 999 }] })
assert.equal(page.data.selectedHour, 23)
page.copySchedule()
assert(clipboard.includes('青岛 20260930') && clipboard.includes('满潮 06:01 4.51 m'))
assert(page.onShareAppMessage().path.includes('stationId=P2717&date=20260930'))

let reloads = 0
page.loadForecast = () => { reloads++ }
page.chooseDate({ currentTarget: { dataset: { date } } })
assert.equal(reloads, 0, 'Tapping the active date must not reload')
page.showTomorrow()
assert.equal(page.data.selectedDate, '20261001')
assert.equal(page.data.selectedPoint, '')
assert.equal(page.data.selectedHour, -1)
assert.equal(reloads, 1)
page.data.forecast = { ...forecast, date: '20261001' }
page.refreshTime()
assert.equal(page.data.info.isToday, false)
assert.equal(page.data.info.primaryLabel, '所选日最高潮位')
assert.equal(page.data.info.primaryValue, '4.54')
assert.equal(page.data.info.direction, '')
assert.equal(page.data.info.nextTime, '00:57')
page.data.forecast = { ...forecast, hourly: [], events: [] }
page.refreshTime()
assert.equal(page.data.info.primaryValue, '—')
assert.equal(page.data.info.range, '—')
assert.equal(page.data.info.hasNext, false)
page.data.forecast = forecast
deferExport = true
page.drawChart()
page.drawChart()
exportsPending[1].success({ tempFilePath: '/latest-chart.png' })
exportsPending[0].success({ tempFilePath: '/stale-chart.png' })
assert.equal(page.data.chartImage, '/latest-chart.png', 'Late exports must not replace the current curve')
assert(removedFiles.includes('/test-chart.png') && removedFiles.includes('/stale-chart.png'))
page.onUnload()
assert(removedFiles.includes('/latest-chart.png'), 'Unloading must clean the final image')
console.log('tide summary, chart interaction, date reset, copy and share verified')
