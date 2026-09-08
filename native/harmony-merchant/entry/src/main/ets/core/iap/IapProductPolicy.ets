export type HarmonyIapProductType = 'subscription' | 'consumable';

export class IapProductPolicy {
  static normalize(value: string): HarmonyIapProductType {
    if (value === 'subscription' || value === 'consumable') return value;
    throw new Error('Unsupported Huawei IAP product type');
  }
}
