import { AAID, pushService } from '@kit.PushKit';
import { AppConfig } from '../config/AppConfig';
import { EmptyResult } from '../model/ApiModels';
import { ApiClient } from '../network/ApiClient';
import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { notificationManager } from '@kit.NotificationKit';

export interface PushPreferences {
  orders: boolean;
  refunds: boolean;
  chat: boolean;
}

interface RegisterPushRequest {
  token: string;
  deviceId: string;
  locale: string;
}

interface UnregisterPushRequest {
  token: string;
  deviceId: string;
}

export class HarmonyPushClient {
  private static token: string = '';
  private static deviceId: string = '';
  private static localeRevision: number = 0;

  static async syncCurrent(context?: common.UIAbilityContext, locale?: string): Promise<void> {
    try {
      if (context) await HarmonyPushClient.requestPermissionOnce(context);
      const values = await Promise.all([pushService.getToken(), AAID.getAAID()]);
      HarmonyPushClient.token = values[0];
      HarmonyPushClient.deviceId = values[1];
      const request: RegisterPushRequest = {
        token: values[0],
        deviceId: values[1],
        locale: locale || AppStorage.get<string>('language') || 'zh-CN'
      };
      await ApiClient.put<EmptyResult>(`${AppConfig.API_PREFIX}/m/push/devices/current`, request);
    } catch (_) {
      // Push Kit 尚未在 AGC 开通或当前设备暂不支持时，业务页面仍必须正常启动。
    }
  }

  static async updateToken(token: string): Promise<void> {
    if (!token) return;
    try {
      HarmonyPushClient.token = token;
      if (!HarmonyPushClient.deviceId) HarmonyPushClient.deviceId = await AAID.getAAID();
      const request: RegisterPushRequest = {
        token,
        deviceId: HarmonyPushClient.deviceId,
        locale: AppStorage.get<string>('language') || 'zh-CN'
      };
      await ApiClient.put<EmptyResult>(`${AppConfig.API_PREFIX}/m/push/devices/current`, request);
    } catch (_) {
      // 下次进入主工作台会重新完整同步，不清理会话。
    }
  }

  /**
   * Updates only the locale attached to an already registered device.
   * A language toggle must never request notification permission, query
   * PushKit tokens, or wait for AAID. A later authenticated sync will carry
   * the latest AppStorage locale when registration is not ready yet.
   */
  static async updateLocale(locale: string): Promise<void> {
    const revision = ++HarmonyPushClient.localeRevision;
    await new Promise<void>((resolve) => {
      setTimeout((): void => resolve(), 250);
    });
    if (revision !== HarmonyPushClient.localeRevision) return;
    if (!HarmonyPushClient.token || !HarmonyPushClient.deviceId) return;
    const request: RegisterPushRequest = {
      token: HarmonyPushClient.token,
      deviceId: HarmonyPushClient.deviceId,
      locale
    };
    try {
      await ApiClient.put<EmptyResult>(`${AppConfig.API_PREFIX}/m/push/devices/current`, request);
    } catch (_) {
      // Locale sync is opportunistic and must never affect the settings UI.
    }
  }

  static async unregisterCurrent(): Promise<void> {
    if (!HarmonyPushClient.token && !HarmonyPushClient.deviceId) return;
    const request: UnregisterPushRequest = {
      token: HarmonyPushClient.token,
      deviceId: HarmonyPushClient.deviceId
    };
    try {
      await ApiClient.delete<EmptyResult>(`${AppConfig.API_PREFIX}/m/push/devices/current`, request);
    } catch (_) {
    }
  }

  static getPreferences(): Promise<PushPreferences> {
    return ApiClient.get<PushPreferences>(`${AppConfig.API_PREFIX}/m/push/preferences`);
  }

  static setPreferences(preferences: PushPreferences): Promise<PushPreferences> {
    return ApiClient.put<PushPreferences>(`${AppConfig.API_PREFIX}/m/push/preferences`, preferences);
  }

  private static async requestPermissionOnce(context: common.UIAbilityContext): Promise<boolean> {
    try {
      if (await notificationManager.isNotificationEnabled()) return true;
      const store = await preferences.getPreferences(context, 'jingwei_push_preferences');
      const asked = Boolean(await store.get('notificationPermissionAsked', false));
      if (asked) return false;
      await store.put('notificationPermissionAsked', true);
      await store.flush();
      await notificationManager.requestEnableNotification(context);
      return await notificationManager.isNotificationEnabled();
    } catch (_) {
      return false;
    }
  }
}
