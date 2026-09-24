import { ApiClient } from '../../core/network/ApiClient';
import { AppConfig } from '../../core/config/AppConfig';
import { DashboardResponse, MerchantFeatureFlags } from './WorkbenchModels';

export class WorkbenchRepository {
  static loadDashboard(): Promise<DashboardResponse> {
    return ApiClient.get<DashboardResponse>(`${AppConfig.API_PREFIX}/m/dashboard`);
  }

  static loadFeatureFlags(): Promise<MerchantFeatureFlags> {
    return ApiClient.get<MerchantFeatureFlags>(`${AppConfig.API_PREFIX}/m/feature-flags`);
  }
}
