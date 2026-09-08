import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { PushPreferences } from './HarmonyPushClient';

export class PushPreferenceStore {
  private static readonly STORE_NAME: string = 'jingwei_push_alert_preferences';

  static async read(
    context: common.UIAbilityContext,
    storeName: string = PushPreferenceStore.STORE_NAME
  ): Promise<PushPreferences> {
    try {
      const store = await preferences.getPreferences(context, storeName);
      return {
        orders: Boolean(await store.get('orders', true)),
        refunds: Boolean(await store.get('refunds', true)),
        chat: Boolean(await store.get('chat', true))
      };
    } catch (_) {
      return { orders: true, refunds: true, chat: true };
    }
  }

  static async write(
    context: common.UIAbilityContext,
    value: PushPreferences,
    storeName: string = PushPreferenceStore.STORE_NAME
  ): Promise<void> {
    try {
      const store = await preferences.getPreferences(context, storeName);
      await store.put('orders', value.orders);
      await store.put('refunds', value.refunds);
      await store.put('chat', value.chat);
      await store.flush();
    } catch (_) {
      // 服务端偏好仍是最终来源；本地缓存失败不反向伪造成远端保存失败。
    }
  }
}
