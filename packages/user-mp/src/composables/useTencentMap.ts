/**
 * 腾讯位置服务（地图 / 导航 / POI / 静态图）
 *
 * 使用：
 *   const map = useTencentMap()
 *   map.staticImageUrl({ center, markers, size, zoom })  // 拼接静态地图 PNG URL
 *   map.openNavigation({ lat, lng, name, address })       // 调起导航（mp-weixin 用 uni.openLocation；H5 跳腾讯地图）
 *   map.openMarker({ lat, lng, name, address })           // 在地图里查看一个点
 *
 * key 由 .env.production 注入 `VITE_TENCENT_MAP_KEY`
 */

const KEY = (import.meta.env.VITE_TENCENT_MAP_KEY as string) || ''
const APP = '经纬科技商城'

export interface MapPoint {
  lat: number
  lng: number
  name?: string
  address?: string
}

export interface StaticMapOpts {
  center: { lat: number; lng: number }
  zoom?: number
  size?: { w: number; h: number }
  markers?: MapPoint[]
}

export function useTencentMap() {
  /** 拼接腾讯静态地图 PNG URL — 直接当 image src 用 */
  function staticImageUrl(opts: StaticMapOpts): string {
    const { center, zoom = 14, size = { w: 600, h: 400 }, markers = [] } = opts
    const base = 'https://apis.map.qq.com/ws/staticmap/v2/'
    // 小程序没有 URLSearchParams，手写一份
    const parts: string[] = []
    const enc = encodeURIComponent
    parts.push(`key=${enc(KEY)}`)
    parts.push(`size=${enc(`${size.w}*${size.h}`)}`)
    parts.push(`center=${enc(`${center.lat},${center.lng}`)}`)
    parts.push(`zoom=${enc(String(zoom))}`)
    parts.push(`scale=2`)
    if (markers.length) {
      // 腾讯静态图 markers 语法： size:large|color:0xFF4D2D|lat,lng|lat,lng...
      const m =
        ['size:large', 'color:0xFF4D2D'].join('|') +
        '|' +
        markers.map((p) => `${p.lat},${p.lng}`).join('|')
      parts.push(`markers=${enc(m)}`)
    }
    return `${base}?${parts.join('&')}`
  }

  /** 调起导航 */
  function openNavigation(p: MapPoint) {
    // #ifdef MP-WEIXIN
    uni.openLocation({
      latitude: p.lat,
      longitude: p.lng,
      name: p.name || '门店',
      address: p.address || '',
      fail: () => uni.showToast({ title: '打开地图失败', icon: 'none' }),
    })
    return
    // #endif

    // H5：跳到腾讯地图路线规划页（用户选驾车/公交/步行）
    const url =
      `https://apis.map.qq.com/uri/v1/routeplan?type=drive` +
      `&to=${encodeURIComponent(p.name || '目的地')}` +
      `&tocoord=${p.lat},${p.lng}` +
      `&policy=1&referer=${encodeURIComponent(APP)}`
    try {
      // @ts-ignore — H5 端 window 可用
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank')
        return
      }
    } catch {
      /* fall through */
    }
    uni.showToast({ title: '请在腾讯地图打开', icon: 'none' })
  }

  /** 在地图里查看一个点（marker 模式，不强制规划路线） */
  function openMarker(p: MapPoint) {
    // #ifdef MP-WEIXIN
    uni.openLocation({
      latitude: p.lat,
      longitude: p.lng,
      name: p.name || '位置',
      address: p.address || '',
    })
    return
    // #endif

    const url =
      `https://apis.map.qq.com/uri/v1/marker?` +
      `marker=coord:${p.lat},${p.lng};title:${encodeURIComponent(p.name || '位置')};addr:${encodeURIComponent(p.address || '')}` +
      `&referer=${encodeURIComponent(APP)}`
    try {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.open) {
        window.open(url, '_blank')
      }
    } catch {
      /* noop */
    }
  }

  /** POI 搜索（关键词搜地点）— 用 HTTP 接口（webservice api） */
  async function searchPlaces(keyword: string, region = '全国'): Promise<MapPoint[]> {
    if (!KEY || !keyword.trim()) return []
    const url =
      `https://apis.map.qq.com/ws/place/v1/search?key=${KEY}` +
      `&keyword=${encodeURIComponent(keyword)}` +
      `&boundary=region(${encodeURIComponent(region)},0)` +
      `&page_size=10`
    // uni.request 在 H5/mp-weixin 都可用，避免 fetch 在小程序不存在
    return new Promise((resolve) => {
      uni.request({
        url,
        method: 'GET',
        success: (res) => {
          const data: any = res.data
          if (data?.status !== 0) return resolve([])
          resolve(
            (data.data || []).map((d: any) => ({
              lat: d.location?.lat,
              lng: d.location?.lng,
              name: d.title,
              address: d.address,
            })),
          )
        },
        fail: () => resolve([]),
      })
    })
  }

  return { staticImageUrl, openNavigation, openMarker, searchPlaces, KEY, APP }
}
