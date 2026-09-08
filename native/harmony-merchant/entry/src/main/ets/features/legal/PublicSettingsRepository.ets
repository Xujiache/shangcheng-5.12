import { AppConfig } from '../../core/config/AppConfig';
import { ApiClient } from '../../core/network/ApiClient';

export interface PublicSystemSettings {
  customerServiceWechat?: string | null;
  customerServicePhone?: string | null;
  customerServiceHours?: string | null;
  customerServiceEmail?: string | null;
  icp?: string | null;
  siteName?: string | null;
}

export class PublicSettingsRepository {
  static load(): Promise<PublicSystemSettings> {
    return ApiClient.get<PublicSystemSettings>(`${AppConfig.API_PREFIX}/u/system/settings`, false);
  }
}
