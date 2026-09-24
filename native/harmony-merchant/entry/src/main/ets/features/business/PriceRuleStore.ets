import { common } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { ShopPriceRule } from './BusinessModels';

export interface CachedPriceRule {
  rule: ShopPriceRule;
  dirty: boolean;
}

export class PriceRuleStore {
  private static readonly NAME: string = 'jingwei_shop_price_rule';

  static async read(context: common.UIAbilityContext): Promise<CachedPriceRule | null> {
    try {
      const store = await preferences.getPreferences(context, PriceRuleStore.NAME);
      const raw = String(await store.get('rule', ''));
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ShopPriceRule;
      if (typeof parsed.guestAllow !== 'boolean' ||
        !['retail', 'hidden'].includes(parsed.customerPrice) ||
        !['wholesale', 'retail'].includes(parsed.agencyPrice) ||
        !['member', 'retail'].includes(parsed.memberPrice)) return null;
      return { rule: parsed, dirty: Boolean(await store.get('dirty', false)) };
    } catch (_) {
      return null;
    }
  }

  static async write(context: common.UIAbilityContext, rule: ShopPriceRule, dirty: boolean): Promise<void> {
    try {
      const store = await preferences.getPreferences(context, PriceRuleStore.NAME);
      await store.put('rule', JSON.stringify(rule));
      await store.put('dirty', dirty);
      await store.flush();
    } catch (_) {
      // 服务端仍是最终来源；私有缓存不可用时不阻断规则提交。
    }
  }
}
