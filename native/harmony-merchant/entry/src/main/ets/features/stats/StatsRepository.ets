import { AppConfig } from '../../core/config/AppConfig';
import { ApiClient } from '../../core/network/ApiClient';
import { withQuery } from '../../core/network/QueryString';
import { MerchantStats } from './StatsModels';

export class StatsRepository {
  static get(period: string, date: string = ''): Promise<MerchantStats> {
    return ApiClient.get<MerchantStats>(withQuery(`${AppConfig.API_PREFIX}/m/stats`, [
      { name: 'period', value: period },
      { name: 'date', value: date }
    ]));
  }
}
