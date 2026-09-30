import { MotionPage } from '../../../utils/page-transition'
import { request } from '../../../utils/request'
import { reportToolEvent } from '../../../utils/tool-events'

type Station = { id: string; name: string; province: string; city: string; latitude: number; longitude: number }
type Point = { time: string; height: number; type?: 'H' | 'L' }
type Forecast = { station: Station; date: string; lunar: string; updatedAt: string; events: Point[]; hourly: Point[]; attribution: string; sourceUrl: string }
type Alert = { id: string; title: string; source: string; issuedAt: string; expiresAt: string; description: string }
const SAVED_KEY = 'ledger_tide_station_ids_v1'
let searchTimer = 0
let refreshTimer = 0
const dayKey = (date: Date) => new Date(date.getTime() + 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
const shortTime = (value: string) => value ? value.slice(11, 16) : '--:--'
const metres = (value: number) => Number.isFinite(value) ? `${value.toFixed(2)} m` : '—'

function dates() {
  const now = new Date()
  const base = new Date(`${dayKey(now).slice(0, 4)}-${dayKey(now).slice(4, 6)}-${dayKey(now).slice(6, 8)}T00:00:00+08:00`)
  return Array.from({ length: 10 }, (_, index) => {
    const time = new Date(base.getTime() + index * 86400_000)
    const key = dayKey(time)
    return { key, label: index === 0 ? '今天' : index === 1 ? '明天' : `周${'日一二三四五六'[new Date(time.getTime() + 8 * 3600_000).getUTCDay()]}`,
      month: key.slice(4, 6), day: key.slice(6, 8) }
  })
}

function summary(forecast: Forecast) {
  const now = Date.now()
  const isToday = forecast.date === dayKey(new Date())
  const extrema = forecast.events.filter(point => point.type === 'H' || point.type === 'L').sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
  const next = isToday ? extrema.find(point => new Date(point.time).getTime() > now) : extrema[0]
  const high = extrema.filter(point => point.type === 'H').map(point => point.height)
  const heights = extrema.map(point => point.height)
  const range = heights.length > 1 ? Math.max(...heights) - Math.min(...heights) : NaN
  const hourly = forecast.hourly
  let current = NaN
  let rate = NaN
  for (let i = 0; i < hourly.length - 1; i++) {
    const a = new Date(hourly[i].time).getTime()
    const b = new Date(hourly[i + 1].time).getTime()
    if (a <= now && now <= b && b > a) {
      const ratio = (now - a) / (b - a)
      current = hourly[i].height + ratio * (hourly[i + 1].height - hourly[i].height)
      rate = (hourly[i + 1].height - hourly[i].height) * 100 / ((b - a) / 3600_000)
      break
    }
  }
  const countdown = next ? Math.max(0, Math.ceil((new Date(next.time).getTime() - now) / 60_000)) : 0
  const primary = isToday ? current : high.length ? Math.max(...high) : NaN
  return {
    isToday,
    hasNext: !!next,
    primaryValue: Number.isFinite(primary) ? primary.toFixed(2) : '—',
    direction: isToday && Number.isFinite(rate) && Math.abs(rate) >= .5 ? (rate > 0 ? '涨潮' : '落潮') : '',
    lowHigh: heights.length ? `${Math.min(...heights).toFixed(2)} / ${Math.max(...heights).toFixed(2)}` : '—',
    range: metres(range),
    primaryLabel: isToday ? '当前估算潮位' : '所选日最高潮位',
    rangeLabel: isToday ? '今日潮差' : '所选日潮差',
    rateLabel: isToday ? '当前涨落速率' : '当日高低潮',
    rateText: isToday ? (Number.isFinite(rate) ? `${rate >= 0 ? '涨' : '落'} ${Math.abs(rate).toFixed(0)} cm/时` : '—') : `${extrema.length} 次`,
    nextLabel: next ? (isToday ? `距下次${next.type === 'H' ? '满潮' : '低潮'}` : `首个${next.type === 'H' ? '满潮' : '低潮'}`) : isToday ? '今日潮时已结束' : '当天暂无潮时',
    nextTime: next ? (isToday ? `${Math.floor(countdown / 60)}小时${countdown % 60}分` : shortTime(next.time)) : '',
    nextEvent: next ? `${isToday ? shortTime(next.time) + ' · ' : ''}${metres(next.height)}` : '',
    events: extrema.map(point => ({ ...point, isNext: point === next, label: point.type === 'H' ? '满潮' : '低潮', clock: shortTime(point.time), heightText: metres(point.height) })),
  }
}

MotionPage({
  data: {
    query: '', stations: [] as Station[], station: null as Station | null,
    searchOpen: false, searching: false, loading: false, error: '', searchError: '',
    searchSequence: 0,
    savedIds: [] as string[], savedStations: [] as Station[],
    days: dates(), selectedDate: dayKey(new Date()),
    forecast: null as Forecast | null,
    info: null as ReturnType<typeof summary> | null,
    alerts: [] as Alert[], alertAttributions: [] as string[], alertsError: '', alertsOpen: false,
    selectedPoint: '' as string,
    selectedHour: -1,
    chartImage: '', chartRevision: 0, chartError: '',
    isSaved: false, dateText: '', updatedText: '',
    tipsOpen: false,
  },
  onLoad(options: { stationId?: string; date?: string }) {
    reportToolEvent('tide', 'open')
    try {
      const ids = wx.getStorageSync(SAVED_KEY)
      if (Array.isArray(ids)) this.setData({ savedIds: ids.filter((id: unknown) => typeof id === 'string').slice(0, 12) })
    } catch { /* 本地收藏不可读时仍可搜索 */ }
    if (options.date && this.data.days.some(day => day.key === options.date)) this.setData({ selectedDate: options.date })
    if (options.stationId) this.resolveStation(options.stationId)
    else if (this.data.savedIds.length) this.resolveStation(this.data.savedIds[0])
    else this.setData({ searchOpen: true })
    this.loadSavedStations()
  },
  onShow() {
    clearInterval(refreshTimer)
    this.refreshTime()
    refreshTimer = setInterval(() => {
      this.refreshTime()
    }, 60_000)
  },
  onHide() { clearInterval(refreshTimer) },
  onUnload() {
    clearTimeout(searchTimer); clearInterval(refreshTimer)
    this.data.chartRevision++
    if (this.data.chartImage) wx.getFileSystemManager().unlink({ filePath: this.data.chartImage, fail: () => {} })
  },
  refreshTime() {
    const currentDays = dates()
    if (currentDays[0].key !== this.data.days[0].key) {
      this.setData({ days: currentDays, selectedDate: currentDays[0].key, forecast: null, info: null, selectedPoint: '', selectedHour: -1 })
      if (this.data.station) this.loadForecast()
    } else if (this.data.forecast) this.setData({ info: summary(this.data.forecast) }, () => this.drawChart())
  },
  onShareAppMessage() {
    const station = this.data.station
    return { title: station ? `${station.name}潮汐表 · 量窗助手` : '潮汐表 · 量窗助手',
      path: station ? `/subpackages/more-tools/tide/index?stationId=${station.id}&date=${this.data.selectedDate}` : '/subpackages/more-tools/tide/index' }
  },
  async resolveStation(id: string) {
    try {
      const result = await request<{ stations: Station[] }>({ url: '/l/tides/stations', params: { q: id }, auth: false, silent: true })
      const station = result.stations.find(item => item.id === id)
      if (station) this.selectStation(station)
      else this.setData({ searchOpen: true, error: '收藏的潮位站已不可用，请重新选择' })
    } catch (error: any) { this.setData({ searchOpen: true, error: error.message || '暂时无法读取潮位站' }) }
  },
  async loadSavedStations() {
    const stations: Station[] = []
    for (const id of this.data.savedIds) {
      try {
        const result = await request<{ stations: Station[] }>({ url: '/l/tides/stations', params: { q: id }, auth: false, silent: true })
        const station = result.stations.find(item => item.id === id)
        if (station) stations.push(station)
      } catch { /* 收藏列表降级为空 */ }
    }
    this.setData({ savedStations: stations })
  },
  openSearch() { this.setData({ searchOpen: true, searchError: '' }) },
  closeSearch() { this.setData({ searchOpen: false }, () => this.drawChart()) },
  clearSearch() {
    clearTimeout(searchTimer)
    this.setData({ query: '', stations: [], searching: false, searchError: '', searchSequence: this.data.searchSequence + 1 })
  },
  confirmSearch() {
    clearTimeout(searchTimer)
    if (this.data.query) this.search(this.data.query)
  },
  onSearchInput(event: any) {
    const query = String(event.detail.value || '').trim()
    this.setData({ query, searchError: '' })
    clearTimeout(searchTimer)
    if (!query) { this.setData({ stations: [], searching: false, searchSequence: this.data.searchSequence + 1 }); return }
    searchTimer = setTimeout(() => this.search(query), 320)
  },
  searchPreset(event: any) {
    clearTimeout(searchTimer)
    const query = String(event.currentTarget.dataset.query)
    this.setData({ query, searchOpen: true })
    this.search(query)
  },
  async search(query: string) {
    const requestId = this.data.searchSequence + 1
    this.setData({ searching: true, searchSequence: requestId })
    try {
      const result = await request<{ stations: Station[] }>({ url: '/l/tides/stations', params: { q: query }, auth: false, silent: true })
      if (requestId !== this.data.searchSequence) return
      this.setData({ stations: result.stations, searchError: result.stations.length ? '' : '没有找到潮位站。可换一个港口名称，内陆地区可能没有潮汐数据。' })
    } catch (error: any) {
      if (requestId === this.data.searchSequence) this.setData({ stations: [], searchError: error.message || '站点搜索失败' })
    } finally { if (requestId === this.data.searchSequence) this.setData({ searching: false }) }
  },
  locate() {
    wx.getLocation({ type: 'gcj02', success: async position => {
      this.setData({ searchOpen: true, searching: true, query: '', stations: [], searchError: '' })
      try {
        const result = await request<{ stations: Station[] }>({ url: '/l/tides/nearby', params: { lat: position.latitude, lon: position.longitude }, auth: false, silent: true })
        this.setData({ stations: result.stations, searchError: result.stations.length ? '' : '附近 50 公里没有潮位站。可搜索港口名称。' })
      } catch (error: any) { this.setData({ searchError: error.message || '附近站点查询失败' }) }
      finally { this.setData({ searching: false }) }
    }, fail: () => wx.showToast({ title: '无法获取位置，请搜索港口', icon: 'none' }) })
  },
  chooseStation(event: any) {
    const station = this.data.stations.find(item => item.id === event.currentTarget.dataset.id) ||
      this.data.savedStations.find(item => item.id === event.currentTarget.dataset.id)
    if (station) this.selectStation(station)
    else this.resolveStation(String(event.currentTarget.dataset.id))
  },
  selectStation(station: Station) {
    this.setData({ station, searchOpen: false, searchSequence: this.data.searchSequence + 1,
      forecast: null, info: null, selectedPoint: '', selectedHour: -1, error: '', isSaved: this.data.savedIds.includes(station.id) })
    this.loadForecast()
    this.loadAlerts(station)
  },
  chooseDate(event: any) {
    const selectedDate = String(event.currentTarget.dataset.date)
    if (selectedDate === this.data.selectedDate || !this.data.days.some(day => day.key === selectedDate)) return
    this.setData({ selectedDate, forecast: null, info: null, selectedPoint: '', selectedHour: -1 })
    this.loadForecast()
  },
  showTomorrow() {
    const tomorrow = this.data.days[1]
    if (tomorrow) this.chooseDate({ currentTarget: { dataset: { date: tomorrow.key } } })
  },
  async loadForecast() {
    const station = this.data.station
    if (!station) return
    const date = this.data.selectedDate
    this.setData({ loading: true, error: '' })
    try {
      const forecast = await request<Forecast>({ url: '/l/tides/forecast', params: { stationId: station.id, date }, auth: false, silent: true })
      if (this.data.station?.id !== station.id || this.data.selectedDate !== date) return
      const info = summary(forecast)
      if (this.data.chartImage) wx.getFileSystemManager().unlink({ filePath: this.data.chartImage, fail: () => {} })
      this.setData({ forecast, info, chartImage: '', error: forecast.hourly.length ? '' : '该站当天暂无逐小时潮位预报',
        dateText: `${Number(date.slice(4, 6))}月${Number(date.slice(6, 8))}日${forecast.lunar ? ' · 农历' + forecast.lunar : ''}`,
        updatedText: forecast.updatedAt ? forecast.updatedAt.slice(5, 16).replace('T', ' ') : '未知',
      }, () => this.drawChart())
      reportToolEvent('tide', 'success')
    } catch (error: any) {
      if (this.data.station?.id === station.id && this.data.selectedDate === date) {
        this.setData({ error: error.message || '潮汐预报加载失败' })
        reportToolEvent('tide', 'failure')
      }
    }
    finally { if (this.data.station?.id === station.id && this.data.selectedDate === date) this.setData({ loading: false }) }
  },
  async loadAlerts(station: Station) {
    this.setData({ alerts: [], alertAttributions: [], alertsError: '', alertsOpen: false })
    try {
      const result = await request<{ alerts: Alert[]; attributions: string[] }>({ url: '/l/tides/alerts', params: { lat: station.latitude, lon: station.longitude }, auth: false, silent: true })
      if (this.data.station?.id === station.id) this.setData({ alerts: result.alerts, alertAttributions: result.attributions })
    } catch { if (this.data.station?.id === station.id) this.setData({ alertsError: '预警暂不可用，请查看当地气象台最新信息' }) }
  },
  toggleAlerts() { this.setData({ alertsOpen: !this.data.alertsOpen }) },
  showAlerts() {
    if (!this.data.alerts.length) return
    this.setData({ alertsOpen: true })
    wx.pageScrollTo({ scrollTop: 0, duration: 250 })
  },
  toggleSaved() {
    const station = this.data.station
    if (!station) return
    const ids = this.data.savedIds.includes(station.id)
      ? this.data.savedIds.filter(id => id !== station.id)
      : [station.id, ...this.data.savedIds].slice(0, 12)
    try { wx.setStorageSync(SAVED_KEY, ids); this.setData({ savedIds: ids, isSaved: ids.includes(station.id) }); this.loadSavedStations(); wx.showToast({ title: ids.includes(station.id) ? '已收藏' : '已取消收藏', icon: 'none' }) }
    catch { wx.showToast({ title: '收藏保存失败', icon: 'none' }) }
  },
  toggleTips() { this.setData({ tipsOpen: !this.data.tipsOpen }) },
  copySchedule() {
    if (!this.data.forecast || !this.data.info) return
    const lines = this.data.info.events.map(item => `${item.label} ${item.clock} ${item.heightText}`)
    wx.setClipboardData({ data: `${this.data.station?.name} ${this.data.selectedDate}\n${lines.join('\n')}\n数据：和风天气 QWeather` })
  },
  copySourceLink() {
    wx.setClipboardData({ data: this.data.forecast?.sourceUrl || 'https://www.qweather.com' })
  },
  drawChart() {
    const forecast = this.data.forecast
    if (!forecast || forecast.hourly.length < 2) return
    const revision = this.data.chartRevision + 1
    this.setData({ chartRevision: revision, chartError: '' })
    const points = [...forecast.hourly, ...forecast.events].sort((a, b) => Date.parse(a.time) - Date.parse(b.time))
    wx.createSelectorQuery().in(this).select('#tideChart').fields({ size: true }).exec(result => {
      const target = result[0]
      if (!target?.width || !target.height || this.data.forecast !== forecast || this.data.chartRevision !== revision) return
      const ratio = wx.getWindowInfo().pixelRatio || 1
      // 使用普通 image 展示，避免原生画布与滚动、弹层发生图层冲突。
      const canvas = wx.createOffscreenCanvas({ type: '2d', width: target.width * ratio, height: target.height * ratio })
      const ctx = canvas.getContext('2d')
      ctx.scale(ratio, ratio)
      const w = target.width, h = target.height, left = 28, right = 18, top = 23, bottom = 24
      const start = Date.parse(`${forecast.date.slice(0, 4)}-${forecast.date.slice(4, 6)}-${forecast.date.slice(6, 8)}T00:00:00+08:00`)
      const values = points.map(point => point.height)
      const rawMin = Math.min(...values), rawMax = Math.max(...values)
      const step = Math.max(.5, Math.ceil((rawMax - rawMin) / 3 * 2) / 2)
      const min = Math.floor((rawMin - step * .15) / step) * step
      const max = Math.ceil((rawMax + step * .15) / step) * step
      const x = (time: string | number) => left + (typeof time === 'number' ? time : Date.parse(time) - start) / 86400_000 * (w - left - right)
      const y = (value: number) => top + (max - value) / (max - min) * (h - top - bottom)
      ctx.font = '10px sans-serif'; ctx.fillStyle = '#82918a'; ctx.textAlign = 'right'
      ctx.strokeStyle = '#edf1ee'; ctx.lineWidth = 1
      for (let value = min; value <= max + step / 2; value += step) {
        const gy = y(value)
        ctx.beginPath(); ctx.moveTo(left, gy); ctx.lineTo(w - right, gy); ctx.stroke()
        ctx.fillText(value.toFixed(1), left - 7, gy + 3)
      }
      ctx.textAlign = 'center'
      for (let hour = 0; hour <= 24; hour += 6) {
        ctx.fillText(`${String(hour).padStart(2, '0')}:00`, x(hour * 3600_000), h - 5)
      }
      const gradient = ctx.createLinearGradient(0, top, 0, h - bottom)
      gradient.addColorStop(0, 'rgba(14,124,102,.16)'); gradient.addColorStop(1, 'rgba(14,124,102,.02)')
      ctx.beginPath(); ctx.moveTo(x(points[0].time), h - bottom)
      points.forEach(point => ctx.lineTo(x(point.time), y(point.height)))
      ctx.lineTo(x(points[points.length - 1].time), h - bottom); ctx.closePath(); ctx.fillStyle = gradient; ctx.fill()
      ctx.beginPath(); points.forEach((point, index) => index ? ctx.lineTo(x(point.time), y(point.height)) : ctx.moveTo(x(point.time), y(point.height)))
      ctx.strokeStyle = '#0e7c66'; ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.stroke()
      const dot = (px: number, py: number, color: string, radius = 3) => {
        ctx.beginPath(); ctx.arc(px, py, radius, 0, Math.PI * 2); ctx.fillStyle = color; ctx.fill()
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
      }
      forecast.events.forEach(point => {
        const px = x(point.time), py = y(point.height)
        dot(px, py, point.type === 'H' ? '#0e7c66' : '#d49a40')
        ctx.fillStyle = '#5c6b64'; ctx.textAlign = 'center'
        ctx.fillText(shortTime(point.time), Math.max(left + 17, Math.min(w - right - 17, px)), py + (point.type === 'H' ? -11 : 17))
      })
      const selected = forecast.hourly[this.data.selectedHour]
      const now = Date.now()
      const before = forecast.hourly.findIndex((point, i) => i < forecast.hourly.length - 1 && Date.parse(point.time) <= now && now <= Date.parse(forecast.hourly[i + 1].time))
      if (selected || before >= 0) {
        const a = selected || forecast.hourly[before], b = selected || forecast.hourly[before + 1]
        const time = selected ? Date.parse(selected.time) : now
        const height = selected ? selected.height : a.height + (b.height - a.height) * (now - Date.parse(a.time)) / (Date.parse(b.time) - Date.parse(a.time))
        const px = x(time - start), py = y(height)
        ctx.beginPath(); ctx.setLineDash([3, 3]); ctx.moveTo(px, top); ctx.lineTo(px, h - bottom)
        ctx.strokeStyle = '#9bb9ad'; ctx.lineWidth = 1; ctx.stroke(); ctx.setLineDash([])
        dot(px, py, '#0e7c66', 4)
        ctx.fillStyle = '#0e7c66'; ctx.textAlign = 'center'
        ctx.fillText(selected ? shortTime(selected.time) : '现在', Math.max(left + 17, Math.min(w - right - 17, px)), 12)
      }
      wx.canvasToTempFilePath({ canvas, fileType: 'png',
        success: result => {
          const fs = wx.getFileSystemManager()
          if (this.data.forecast !== forecast || this.data.chartRevision !== revision) {
            fs.unlink({ filePath: result.tempFilePath, fail: () => {} }); return
          }
          const previous = this.data.chartImage
          this.setData({ chartImage: result.tempFilePath }, () => {
            if (previous && previous !== result.tempFilePath) fs.unlink({ filePath: previous, fail: () => {} })
          })
        },
        fail: () => {
          if (this.data.forecast === forecast && this.data.chartRevision === revision) this.setData({ chartError: '曲线暂时无法绘制，请重新加载' })
        },
      })
    })
  },
  chartTouch(event: any) {
    const forecast = this.data.forecast
    const touch = event.touches?.[0]
    if (!forecast?.hourly.length || !touch) return
    wx.createSelectorQuery().in(this).select('#tideChart').boundingClientRect(rect => {
      if (!rect || this.data.forecast !== forecast) return
      const start = Date.parse(`${forecast.date.slice(0, 4)}-${forecast.date.slice(4, 6)}-${forecast.date.slice(6, 8)}T00:00:00+08:00`)
      const time = start + Math.max(0, Math.min(1, (touch.clientX - rect.left - 28) / (rect.width - 46))) * 86400_000
      const index = forecast.hourly.reduce((best, point, i) => Math.abs(Date.parse(point.time) - time) < Math.abs(Date.parse(forecast.hourly[best].time) - time) ? i : best, 0)
      if (index === this.data.selectedHour) return
      this.setData({ selectedHour: index, selectedPoint: `${shortTime(forecast.hourly[index].time)} · ${metres(forecast.hourly[index].height)}` }, () => this.drawChart())
    }).exec()
  },
})
