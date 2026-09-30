import { Injectable, ServiceUnavailableException, BadGatewayException, BadRequestException } from '@nestjs/common'

type Poi = { id: string; name: string; country: string; adm1: string; adm2: string; lat: string; lon: string; type: string }
type TidePoint = { fxTime: string; height: string; type?: 'H' | 'L' }

/** QWeather GeoAPI is queried live; its station list must not be copied into a local index. */
@Injectable()
export class TideService {
  private get config() {
    const host = process.env.QWEATHER_API_HOST || ''
    const key = process.env.QWEATHER_API_KEY || ''
    if (!/^(?:[a-z0-9-]+\.)+qweatherapi\.com$/.test(host) || !key) {
      throw new ServiceUnavailableException('潮汐数据源尚未配置')
    }
    return { host, key }
  }

  private async get(path: string, params: Record<string, string> = {}): Promise<any> {
    const { host, key } = this.config
    const url = new URL(`https://${host}${path}`)
    Object.entries(params).forEach(([name, value]) => url.searchParams.set(name, value))
    let response: Response
    try {
      response = await fetch(url, {
        headers: { 'X-QW-Api-Key': key, 'Accept': 'application/json' },
        signal: AbortSignal.timeout(8000),
      })
    } catch {
      throw new BadGatewayException('潮汐数据源暂时无法连接')
    }
    const body = await response.json().catch(() => null)
    if (response.status === 400 && path.startsWith('/geo/v2/poi/') &&
      body?.error?.type?.endsWith('#no-such-location')) return { code: '200', poi: [] }
    if (!response.ok) throw new BadGatewayException(`潮汐数据源请求失败 (${response.status})`)
    const valid = path.startsWith('/weatheralert/')
      ? body?.metadata && Array.isArray(body.alerts)
      : body?.code === '200'
    if (!valid) throw new BadGatewayException(`潮汐数据源返回异常 (${body?.code || 'invalid'})`)
    return body
  }

  private stations(body: any) {
    return ((Array.isArray(body.poi) ? body.poi : []) as Poi[])
      .filter(poi => /^(中国|中国香港|中国澳门|中国台湾|香港|澳门|台湾)$/.test(poi.country) && poi.type === 'TSTA')
      .map(poi => ({ id: poi.id, name: poi.name, province: poi.adm1, city: poi.adm2,
        latitude: Number(poi.lat), longitude: Number(poi.lon) }))
      .filter(poi => Number.isFinite(poi.latitude) && Number.isFinite(poi.longitude))
  }

  async search(query: string) {
    if (typeof query !== 'string') throw new BadRequestException('港口或地区名称无效')
    const term = query.trim()
    if (!term || term.length > 40) throw new BadRequestException('请输入 1 至 40 字的港口或地区名称')
    return { stations: this.stations(await this.get('/geo/v2/poi/lookup', {
      location: term, type: 'TSTA', number: '20', lang: 'zh',
    })) }
  }

  async nearby(latitude: number, longitude: number) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < 3 || latitude > 54 || longitude < 73 || longitude > 135) {
      throw new BadRequestException('位置不在中国范围内')
    }
    return { stations: this.stations(await this.get('/geo/v2/poi/range', {
      location: `${longitude.toFixed(2)},${latitude.toFixed(2)}`,
      type: 'TSTA', radius: '50', number: '20', lang: 'zh',
    })) }
  }

  async forecast(stationId: string, date: string) {
    if (typeof stationId !== 'string' || typeof date !== 'string') throw new BadRequestException('潮位站或日期无效')
    if (!/^P[A-Za-z0-9]{3,20}$/.test(stationId)) throw new BadRequestException('潮位站编号无效')
    if (!/^\d{8}$/.test(date)) throw new BadRequestException('日期格式无效')
    const day = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+08:00`)
    const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '')
    const start = new Date(`${today.slice(0, 4)}-${today.slice(4, 6)}-${today.slice(6, 8)}T00:00:00+08:00`)
    if (!Number.isFinite(day.getTime()) || new Date(day.getTime() + 8 * 3600_000).toISOString().slice(0, 10).replace(/-/g, '') !== date ||
      day < start || day.getTime() >= start.getTime() + 10 * 86400_000) {
      throw new BadRequestException('只能查询今天起 10 天内的潮汐')
    }
    const stationResult = await this.search(stationId)
    const station = stationResult.stations.find(item => item.id === stationId)
    if (!station) throw new BadRequestException('未找到中国潮位站')
    const body = await this.get('/v7/ocean/tide', { location: stationId, date })
    const parse = (point: TidePoint) => ({ time: point.fxTime, height: Number(point.height),
      ...(point.type ? { type: point.type } : {}) })
    const lunarParts = new Intl.DateTimeFormat('zh-CN-u-ca-chinese', {
      month: 'long', day: 'numeric', timeZone: 'Asia/Shanghai',
    }).formatToParts(day)
    const month = lunarParts.find(part => part.type === 'month')?.value || ''
    const lunarDay = Number(lunarParts.find(part => part.type === 'day')?.value)
    const lunarName = lunarDay <= 10 ? `初${'一二三四五六七八九十'[lunarDay - 1]}`
      : lunarDay < 20 ? `十${'一二三四五六七八九'[lunarDay - 11]}`
      : lunarDay === 20 ? '二十' : lunarDay < 30 ? `廿${'一二三四五六七八九'[lunarDay - 21]}` : '三十'
    return {
      station, date, lunar: month && lunarDay ? `${month}${lunarName}` : '', updatedAt: body.updateTime,
      events: ((body.tideTable || []) as TidePoint[]).map(parse).filter(point => Number.isFinite(point.height)),
      hourly: ((body.tideHourly || []) as TidePoint[]).map(parse).filter(point => Number.isFinite(point.height)),
      attribution: '潮汐数据：和风天气 QWeather',
      sourceUrl: body.fxLink || 'https://www.qweather.com',
    }
  }

  async alerts(latitude: number, longitude: number) {
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < 3 || latitude > 54 || longitude < 73 || longitude > 135) {
      throw new BadRequestException('位置不在中国范围内')
    }
    const body = await this.get(`/weatheralert/v1/current/${latitude}/${longitude}`, { lang: 'zh' })
    return { alerts: (Array.isArray(body.alerts) ? body.alerts : []).map((alert: any) => ({
      id: alert.id, title: alert.headline, severity: alert.severity,
      source: alert.senderName, issuedAt: alert.issuedTime, expiresAt: alert.expireTime,
      description: alert.description,
    })), attributions: Array.isArray(body.metadata.attributions) ? body.metadata.attributions : [] }
  }
}
