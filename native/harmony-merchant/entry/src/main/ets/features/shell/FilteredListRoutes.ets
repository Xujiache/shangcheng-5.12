import { FilterRouteParams } from '../../core/navigation/RouteParams';
import { OrderListPage } from '../order/OrderListPage';
import { ProductListPage } from '../product/ProductListPage';

@Builder
export function FilteredOrdersBuilder(_: string, raw: Object) {
  NavDestination() { OrderListPage({ initialStatus: (raw as FilterRouteParams).status, showBack: true }); }
    .hideTitleBar(true);
}

@Builder
export function FilteredProductsBuilder(_: string, raw: Object) {
  NavDestination() { ProductListPage({ initialStatus: (raw as FilterRouteParams).status, showBack: true }); }
    .hideTitleBar(true);
}
