import { MotionPage } from '../../utils/page-transition'
import { changelogApi } from '../../api/index'

MotionPage({
  data: {
    loading: true,
    list: [] as any[],
  },
  onLoad() {
    this.load()
  },
  load() {
    changelogApi
      .list()
      .then((rows: any) => {
        const list = (Array.isArray(rows) ? rows : []).map((r: any) => ({
          version: r.version,
          title: r.title,
          lines: String(r.content || '')
            .split('\n')
            .filter((x: string) => x.trim()),
        }))
        this.setData({ loading: false, list })
      })
      .catch(() => this.setData({ loading: false }))
  },
})
