import { AppConfig } from '../../core/config/AppConfig';
import { ApiClient } from '../../core/network/ApiClient';
import { LegalAgreementSet } from './LegalModels';

export class LegalRepository {
  static agreements(): Promise<LegalAgreementSet> {
    return ApiClient.get<LegalAgreementSet>(
      `${AppConfig.API_PREFIX}/u/agreements?platform=merchant-harmony`, false);
  }
}
