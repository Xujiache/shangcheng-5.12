import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const now = '2026-09-30T05:30:00+08:00'
class TestDate extends Date {
  constructor(value: string | number = now) {
    super(value)
  }
  static now() {
    return Date.parse(now)
  }
}
let page: any
let definition: any
const app = { globalData: { privacyAuthorizationHandler: null as any } }
const privacyCalls: any[] = []
const locationCalls: any[] = []
const requests: any[] = []
let writes = 0
const pendingRequest = (options: any) =>
  new Promise<any>((resolve, reject) => {
    requests.push({ options, resolve, reject })
  })
let clipboard = ''
const labels: string[] = []
const coordinates: number[] = []
const exportsPending: any[] = []
const removedFiles: string[] = []
let deferExport = false
const ctx: any = new Proxy(
  {},
  {
    get: (_, key) => {
      if (key === 'createLinearGradient') return () => ({ addColorStop() {} })
      if (key === 'fillText')
        return (text: string, x: number, y: number) => {
          labels.push(text)
          coordinates.push(x, y)
        }
      return (...args: unknown[]) =>
        args.forEach((arg) => {
          if (typeof arg === 'number') coordinates.push(arg)
        })
    },
  },
)
const canvas = { getContext: () => ctx }
const query = () => {
  let rectCallback: any
  const chain: any = {
    in: () => chain,
    select: () => chain,
    fields: () => chain,
    boundingClientRect: (callback: any) => {
      rectCallback = callback
      return chain
    },
    exec: (callback?: any) => {
      rectCallback?.({ left: 0, width: 310 })
      callback?.([{ node: canvas, width: 310, height: 192 }])
    },
  }
  return chain
}
const source = readFileSync(
  new URL('../miniprogram/subpackages/more-tools/tide/index.ts', import.meta.url),
  'utf8',
)
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText
vm.runInNewContext(output, {
  exports: {},
  getApp: () => app,
  Date: TestDate,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  require: (id: string) => {
    if (id.endsWith('page-transition'))
      return {
        MotionPage: (value: any) => {
          definition = value
          page = {
            ...definition,
            data: structuredClone(definition.data),
            setData(values: any, callback?: () => void) {
              writes++
              Object.assign(this.data, values)
              callback?.()
            },
          }
        },
      }
    if (id.endsWith('tool-events')) return { reportToolEvent() {} }
    if (id.endsWith('tool-share'))
      return {
        toolShare: (id: string, query?: Record<string, string>) => {
          const search = Object.entries(query || {})
            .map(([key, value]) => `${key}=${value}`)
            .join('&')
          return {
            title: id,
            path: `/subpackages/more-tools/tide/index${search ? '?' + search : ''}`,
            imageUrl: '/assets/share/tide.png',
          }
        },
        toolShareTimeline: (id: string, query?: Record<string, string>) => ({
          title: id,
          query: Object.entries(query || {})
            .map(([key, value]) => `${key}=${value}`)
            .join('&'),
          imageUrl: '/assets/share/tide.png',
        }),
      }
    if (id.endsWith('request')) return { request: pendingRequest }
    throw Error(id)
  },
  wx: {
    getPrivacySetting: (options: any) => privacyCalls.push(options),
    getLocation: (options: any) => locationCalls.push(options),
    createSelectorQuery: query,
    createOffscreenCanvas: () => canvas,
    canvasToTempFilePath: (value: any) => {
      if (deferExport) exportsPending.push(value)
      else value.success({ tempFilePath: '/test-chart.png' })
    },
    getFileSystemManager: () => ({ unlink: (value: any) => removedFiles.push(value.filePath) }),
    getWindowInfo: () => ({ pixelRatio: 2 }),
    setClipboardData: (value: any) => {
      clipboard = value.data
    },
    openSetting: () => {},
  },
})
const date = '20260930'
const time = (clock: string) => `2026-09-30T${clock}:00+08:00`
const forecast = {
  date,
  station: { id: 'P2717', name: '青岛' },
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    time: time(`${String(hour).padStart(2, '0')}:00`),
    height: 1 + hour / 10,
  })),
  events: [
    { time: time('00:57'), height: 0.76, type: 'L' },
    { time: time('06:01'), height: 4.51, type: 'H' },
    { time: time('13:15'), height: 0.41, type: 'L' },
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
page.loadForecast = () => {
  reloads++
}
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
assert.equal(
  page.data.chartImage,
  '/latest-chart.png',
  'Late exports must not replace the current curve',
)
assert(removedFiles.includes('/test-chart.png') && removedFiles.includes('/stale-chart.png'))
page.onUnload()
assert(removedFiles.includes('/latest-chart.png'), 'Unloading must clean the final image')
const freshPage = () => {
  privacyCalls.length = 0
  locationCalls.length = 0
  requests.length = 0
  app.globalData.privacyAuthorizationHandler = null
  page = {
    ...definition,
    data: structuredClone(definition.data),
    setData(values: any, callback?: () => void) {
      writes++
      Object.assign(this.data, values)
      callback?.()
    },
  }
  page.onShow()
  return page
}
const settle = async () => {
  await Promise.resolve()
  await Promise.resolve()
}
const station = (id: string) => ({
  id,
  name: id,
  province: '山东',
  city: '青岛',
  latitude: 36.07,
  longitude: 120.38,
})
const allowLocation = () => privacyCalls.at(-1).success({ needAuthorization: false })
const position = () => locationCalls.at(-1).success({ latitude: 36.07, longitude: 120.38 })

async function verifyLocation() {
  freshPage()
  page.locate()
  page.locate()
  assert.equal(privacyCalls.length, 1, 'Repeated taps must share one pending location attempt')
  privacyCalls[0].success({ needAuthorization: true })
  assert.equal(page.data.privacyRequired, true)
  assert.equal(locationCalls.length, 0, 'Location must wait for privacy agreement')
  page.onPrivacyAgree()
  allowLocation()
  assert.equal(locationCalls.length, 1)
  position()
  assert.equal(requests.length, 1)
  assert.equal(requests[0].options.url, '/l/tides/nearby')
  assert.equal(requests[0].options.params.lat, 36.07)
  assert.equal(requests[0].options.params.lon, 120.38)
  requests[0].resolve({ stations: [station('nearby')] })
  await settle()
  assert.equal(page.data.stations[0].id, 'nearby')
  assert.equal(page.data.locating, false)
  page.onHide()

  freshPage()
  page.locate()
  allowLocation()
  let agreement: any
  app.globalData.privacyAuthorizationHandler((result: any) => {
    agreement = result
    if (result.event === 'agree') position()
  }, {})
  page.onPrivacyAgree()
  assert.equal(agreement.event, 'agree')
  assert.equal(agreement.buttonId, 'tide-privacy-agree')
  assert.equal(
    locationCalls.length,
    1,
    'Runtime privacy resume must not start a duplicate getLocation',
  )
  assert.equal(requests.length, 1)
  requests[0].resolve({ stations: [] })
  await settle()
  page.onHide()

  freshPage()
  page.locate()
  allowLocation()
  locationCalls[0].fail({ errMsg: 'getLocation:fail auth deny' })
  assert.equal(page.data.locationPermission, true)
  assert.equal(page.data.locating, false)
  page.onLocationSettings({ detail: { authSetting: { 'scope.userLocation': false } } })
  assert.equal(privacyCalls.length, 1, 'Denied settings must not retry')
  page.onLocationSettings({ detail: { authSetting: { 'scope.userLocation': true } } })
  assert.equal(privacyCalls.length, 2, 'Granted location setting must retry')
  allowLocation()
  locationCalls.at(-1).fail({ errMsg: 'getLocation:fail system location unavailable' })
  assert.equal(page.data.locationPermission, false)
  page.locate()
  allowLocation()
  position()
  requests[0].reject(Error('upstream failed'))
  await settle()
  assert.equal(page.data.locating, false, 'Failed nearby requests must release the tap lock')
  page.locate()
  allowLocation()
  position()
  requests[1].resolve({ stations: [] })
  await settle()
  page.onHide()

  for (const cancel of ['closeSearch', 'onHide', 'onUnload']) {
    freshPage()
    page.locate()
    allowLocation()
    let cancellation: any
    app.globalData.privacyAuthorizationHandler((result: any) => {
      cancellation = result
    }, {})
    page[cancel]()
    assert.equal(
      cancellation.event,
      'disagree',
      `${cancel} must resolve pending privacy as disagree`,
    )
    const previousWrites = writes
    locationCalls[0].success({ latitude: 36.07, longitude: 120.38 })
    await settle()
    assert.equal(
      requests.length,
      0,
      `${cancel} must prevent stale location from requesting nearby stations`,
    )
    assert.equal(writes, previousWrites, `${cancel} must ignore stale location callbacks`)
    if (cancel === 'closeSearch') page.onHide()
  }

  freshPage()
  page.locate()
  allowLocation()
  position()
  const searching = page.search('青岛')
  requests[1].resolve({ stations: [station('search')] })
  await searching
  requests[0].resolve({ stations: [station('stale-nearby')] })
  await settle()
  assert.equal(page.data.stations[0].id, 'search', 'Late nearby result must not replace a search')
  page.onHide()

  freshPage()
  const staleSearch = page.search('青岛')
  page.locate()
  allowLocation()
  position()
  requests[1].resolve({ stations: [station('nearby')] })
  await settle()
  requests[0].resolve({ stations: [station('stale-search')] })
  await staleSearch
  assert.equal(
    page.data.stations[0].id,
    'nearby',
    'Late search result must not replace nearby results',
  )
  page.onHide()

  freshPage()
  page.locate()
  page.onUnload()
  const previousWrites = writes
  privacyCalls[0].success({ needAuthorization: false })
  assert.equal(locationCalls.length, 0, 'Unloaded page must ignore privacy setting callbacks')
  assert.equal(writes, previousWrites)

  freshPage()
  page.locate()
  allowLocation()
  position()
  page.onUnload()
  const unloadedWrites = writes
  requests[0].resolve({ stations: [station('late')] })
  await settle()
  assert.equal(
    writes,
    unloadedWrites,
    'Unloaded page must ignore nearby response and finally callbacks',
  )

  freshPage()
  const otherHandler = () => {}
  app.globalData.privacyAuthorizationHandler = otherHandler
  page.onHide()
  assert.equal(
    app.globalData.privacyAuthorizationHandler,
    otherHandler,
    'Hiding tide must not clear another page privacy handler',
  )
  console.log(
    'tide summary, chart, copy, share, privacy, permissions, retry and location races verified',
  )
}
verifyLocation().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
