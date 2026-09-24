import { SecondaryBackHandler } from '../../core/ui/SecondaryPolicy';
import { FilterRouteParams } from '../../core/navigation/RouteParams';
import { OrderListPage } from '../order/OrderListPage';
import { ProductListPage } from '../product/ProductListPage';

@Builder
export function FilteredOrdersBuilder(_: string, raw: Object) {
  NavDestination() { OrderListPage({ initialStatus: (raw as FilterRouteParams)?.status || '', showBack: true }); }
    .hideTitleBar(true);
}

@Builder
export function FilteredProductsBuilder(_: string, raw: Object) {
  FilteredProductsRoute({ status: (raw as FilterRouteParams)?.status || '' });
}

@Component
struct FilteredProductsRoute {
  status: string = '';
  private backHandler: SecondaryBackHandler = new SecondaryBackHandler();
  build() {
    NavDestination() { ProductListPage({ initialStatus: this.status, showBack: true, backHandler: this.backHandler }); }
      .hideTitleBar(true).onBackPressed((): boolean => this.backHandler.closeOverlay());
  }
}
