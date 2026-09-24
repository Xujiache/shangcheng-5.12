import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';

export interface MerchantApplyState {
  phone: string;
  justApplied: boolean;
}

export class MerchantApplyStateStore {
  private static readonly STORE_NAME: string = 'jingwei_merchant_apply_state';

  static async save(context: common.UIAbilityContext, phone: string): Promise<void> {
    try {
      const store = await preferences.getPreferences(context, MerchantApplyStateStore.STORE_NAME);
      await store.put('phone', phone);
      await store.put('justApplied', true);
      await store.flush();
    } catch (_) {
      // 申请已由服务端事务提交；本地提示状态写入失败不能反向伪造成申请失败。
    }
  }

  static async take(context: common.UIAbilityContext): Promise<MerchantApplyState> {
    try {
      const store = await preferences.getPreferences(context, MerchantApplyStateStore.STORE_NAME);
      const state: MerchantApplyState = {
        phone: String(await store.get('phone', '')),
        justApplied: Boolean(await store.get('justApplied', false))
      };
      if (state.phone || state.justApplied) {
        await store.put('phone', '');
        await store.put('justApplied', false);
        await store.flush();
      }
      return state;
    } catch (_) {
      return { phone: '', justApplied: false };
    }
  }
}
