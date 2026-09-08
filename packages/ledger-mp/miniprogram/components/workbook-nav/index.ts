import { navigation } from '../../utils/page-transition'
Component({
  properties: { active: { type: String, value: 'overview' } },
  data: {
    items: [
      { id: 'overview', icon: 'home', name: '总览', url: '/pages/work-log/index' },
      { id: 'records', icon: 'calendar', name: '记工', url: '/subpackages/workbook/records/index' },
      { id: 'people', icon: 'labor', name: '档案', url: '/subpackages/workbook/people/index' },
      { id: 'finance', icon: 'wallet', name: '结算', url: '/subpackages/workbook/finance/index' },
      { id: 'reports', icon: 'profit', name: '报表', url: '/subpackages/workbook/reports/index' },
    ],
  },
  methods: {
    go(e: any) {
      const item = this.data.items[Number(e.currentTarget.dataset.index)]
      if (item.id !== this.properties.active) navigation.redirectTo({ url: item.url })
    },
  },
})
