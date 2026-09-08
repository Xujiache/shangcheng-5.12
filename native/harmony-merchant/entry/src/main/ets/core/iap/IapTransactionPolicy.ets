import { IapVerifyResult } from '../../features/business/BusinessModels';
import { IapProductPolicy } from './IapProductPolicy';

export class IapTransactionPolicy {
  static canFinish(result: IapVerifyResult): boolean {
    if (!result.ok || !result.purchaseToken?.trim() || !result.purchaseOrderId?.trim() ||
      !result.productType?.trim()) return false;
    try {
      IapProductPolicy.normalize(result.productType);
      return true;
    } catch (_) {
      return false;
    }
  }
}
