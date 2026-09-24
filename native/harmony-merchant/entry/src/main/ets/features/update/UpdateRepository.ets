import { AppConfig } from '../../core/config/AppConfig';
import { ApiClient } from '../../core/network/ApiClient';
import { HarmonyRelease } from './UpdateModels';

export class UpdateRepository {
  static latest(): Promise<HarmonyRelease | null> {
    return ApiClient.get<HarmonyRelease | null>(
      `${AppConfig.API_PREFIX}/m/app/latest?platform=merchant-harmony`,
      false
    );
  }
}
