import { IBestIcon } from '@ibestservices/ibest-ui';

/**
 * Compile-time whitelist for every semantic icon owned by the merchant app.
 * IBestIcon deliberately renders unknown string values as text, so feature
 * pages must use this wrapper instead of passing arbitrary icon names.
 */
export type MerchantIconName =
  'wap-home-o' |
  'goods-collect-o' |
  'orders-o' |
  'bar-chart-o' |
  'manager-o' |
  'friends-o' |
  'chat-o' |
  'coupon-o' |
  'shop-o' |
  'cluster-o' |
  'gold-coin-o' |
  'filter-o' |
  'cross' |
  'tosend' |
  'refund-o' |
  'warning-o' |
  'add-o' |
  'phone-o' |
  'service-o' |
  'records-o' |
  'more-o' |
  'photo-o' |
  'location-o' |
  'photograph' |
  'aim' |
  'edit' |
  'delete-o' |
  'arrow-left' |
  'arrow' |
  'success' |
  'info-o' |
  'star' |
  'fire-o' |
  'setting-o' |
  'share-o' |
  'upgrade' |
  'vip-card-o' |
  'apps-o' |
  'brush-o' |
  'eye-o' |
  'shield-o' |
  'description-o' |
  'user-o' |
  'arrow-down' |
  'checked' |
  'replay' |
  'question-o' |
  'envelop-o';

@Component
export struct MerchantIcon {
  @Prop @Require name: MerchantIconName;
  @Prop @Require color: ResourceColor;
  @Prop iconSize: number = 22;

  build() {
    IBestIcon({
      name: this.name,
      color: this.color,
      iconSize: this.iconSize
    });
  }
}
