import { MerchantLoginSession } from '../../core/model/AuthModels';

/**
 * Merchant login eligibility is deliberately independent from the UI.
 * A successful credential exchange is not enough to enter the workbench:
 * the account must have a merchant-capable role, a bound merchant, and no
 * non-active merchant application state.
 */
export class MerchantSessionPolicy {
  static hasMerchantRole(role: string): boolean {
    return role === 'factory' || role === 'store' || role === 'merchant' || role === 'super-admin';
  }

  static canEnterWorkbench(session: MerchantLoginSession): boolean {
    if (!MerchantSessionPolicy.hasMerchantRole(session.user.role)) return false;
    if (!session.user.merchantId) return false;
    const application = session.merchantApplication;
    return application === undefined || application === null || application.status === 'active';
  }
}
