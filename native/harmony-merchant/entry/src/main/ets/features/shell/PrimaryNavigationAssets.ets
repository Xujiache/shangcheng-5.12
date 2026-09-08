export function primaryNavigationIcon(index: number): Resource {
  if (index === 0) {
    return $r('app.media.commerce_home_lite');
  }
  if (index === 1) {
    return $r('app.media.commerce_products_lite');
  }
  if (index === 2) {
    return $r('app.media.commerce_orders_lite');
  }
  if (index === 3) {
    return $r('app.media.commerce_analytics_lite');
  }
  return $r('app.media.commerce_profile_lite');
}
