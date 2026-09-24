import { AppConfig } from '../../core/config/AppConfig';
import { ApiClient } from '../../core/network/ApiClient';
import { withQuery } from '../../core/network/QueryString';
import { MerchantStats, MerchantAnalytics, StatsSelection } from './StatsModels';

export class StatsRepository {
  static overview(selection: StatsSelection): Promise<MerchantAnalytics> {
    return ApiClient.get<MerchantAnalytics>(withQuery(`${AppConfig.API_PREFIX}/m/stats/overview`, [
      { name: 'period', value: selection.period },
      { name: 'startDate', value: selection.period === 'custom' ? selection.startDate : '' },
      { name: 'endDate', value: selection.period === 'custom' ? selection.endDate : '' }
    ]));
  }

  static get(period: string, date: string = ''): Promise<MerchantStats> {
    return ApiClient.get<MerchantStats>(withQuery(`${AppConfig.API_PREFIX}/m/stats`, [
      { name: 'period', value: period },
      { name: 'date', value: date }
    ]));
  }
}
