import { common } from '@kit.AbilityKit';
import { iap } from '@kit.IAPKit';
import { IapPrepareResult } from '../../features/business/BusinessModels';
import { I18n } from '../i18n/I18n';
import { IapProductPolicy } from './IapProductPolicy';

export interface HuaweiOwnedPurchase {
  productType: string;
  purchaseData: string;
}

export class HuaweiIapService {
  private static nativeType(productType: string): iap.ProductType {
    return IapProductPolicy.normalize(productType) === 'consumable'
      ? iap.ProductType.CONSUMABLE
      : iap.ProductType.AUTORENEWABLE;
  }

  static async purchase(context: common.UIAbilityContext, prepared: IapPrepareResult): Promise<string> {
    try {
      await iap.queryEnvironmentStatus(context);
      const parameter: iap.PurchaseParameter = {
        productId: prepared.productId,
        productType: HuaweiIapService.nativeType(prepared.productType),
        developerPayload: prepared.developerPayload,
        applicationUserName: prepared.orderNo
      };
      const result = await iap.createPurchase(context, parameter);
      return result.purchaseData;
    } catch (error) {
      throw HuaweiIapService.error(error,
        I18n.current('无法发起华为支付', 'Unable to start Huawei payment'));
    }
  }

  static async finish(
    context: common.UIAbilityContext,
    productType: string,
    purchaseToken: string,
    purchaseOrderId: string
  ): Promise<void> {
    if (!purchaseToken || !purchaseOrderId) {
      throw new Error(I18n.current('服务端未返回华为交易确认信息', 'The server did not return Huawei transaction confirmation data'));
    }
    const parameter: iap.FinishPurchaseParameter = {
      productType: HuaweiIapService.nativeType(productType),
      purchaseToken,
      purchaseOrderId
    };
    try {
      await iap.finishPurchase(context, parameter);
    } catch (error) {
      throw HuaweiIapService.error(error,
        I18n.current('华为交易确认失败', 'Huawei transaction confirmation failed'));
    }
  }

  static async restore(context: common.UIAbilityContext): Promise<HuaweiOwnedPurchase[]> {
    try {
      await iap.queryEnvironmentStatus(context);
      const purchases: HuaweiOwnedPurchase[] = [];
      await HuaweiIapService.collect(
        context,
        'subscription',
        iap.ProductType.AUTORENEWABLE,
        iap.PurchaseQueryType.CURRENT_ENTITLEMENT,
        purchases
      );
      await HuaweiIapService.collect(
        context,
        'consumable',
        iap.ProductType.CONSUMABLE,
        iap.PurchaseQueryType.UNFINISHED,
        purchases
      );
      return purchases;
    } catch (error) {
      throw HuaweiIapService.error(error,
        I18n.current('恢复华为购买记录失败', 'Failed to restore Huawei purchases'));
    }
  }

  static async manageSubscriptions(context: common.UIAbilityContext): Promise<void> {
    try {
      await iap.queryEnvironmentStatus(context);
      const parameter: iap.UIWindowParameter = {
        windowScreenMode: iap.WindowScreenMode.FULLSCREEN
      };
      await iap.showManagedSubscriptions(context, parameter);
    } catch (error) {
      throw HuaweiIapService.error(error,
        I18n.current('无法打开订阅管理', 'Unable to open subscription management'));
    }
  }

  private static async collect(
    context: common.UIAbilityContext,
    productType: string,
    nativeType: iap.ProductType,
    queryType: iap.PurchaseQueryType,
    target: HuaweiOwnedPurchase[]
  ): Promise<void> {
    let continuationToken: string | undefined = undefined;
    let page: number = 0;
    do {
      const parameter: iap.QueryPurchasesParameter = {
        productType: nativeType,
        queryType,
        continuationToken
      };
      let result: iap.QueryPurchaseResult;
      try {
        result = await iap.queryPurchases(context, parameter);
      } catch (error) {
        throw HuaweiIapService.error(error,
          I18n.current('查询华为购买记录失败', 'Failed to query Huawei purchases'));
      }
      result.purchaseDataList.forEach((purchaseData: string) => {
        target.push({ productType, purchaseData });
      });
      continuationToken = result.continuationToken;
      page += 1;
    } while (continuationToken && page < 20);
  }

  private static error(error: Object | undefined, fallback: string): Error {
    return error instanceof Error ? error : new Error(fallback);
  }
}
