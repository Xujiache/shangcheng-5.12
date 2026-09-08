import { common } from '@kit.AbilityKit';
import { I18n } from '../i18n/I18n';

export class PhoneService {
  static async dial(context: common.UIAbilityContext, phone: string): Promise<void> {
    const normalized = phone.replace(/[^0-9+]/g, '');
    if (!normalized) throw new Error(I18n.current('没有可拨打的电话号码', 'No valid phone number is available'));
    try {
      await context.startAbility({
        action: 'ohos.want.action.dial',
        uri: `tel:${normalized}`
      });
    } catch (error) {
      throw error instanceof Error
        ? error
        : new Error(I18n.current('无法打开系统拨号界面', 'Unable to open the system dialer'));
    }
  }
}
