import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { IBestButton, IBestEmpty, IBestSearch } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { OrderItem, OrderSummary } from './OrderModels';
import { OrderRepository } from './OrderRepository';
import { OrderProductSummary } from './OrderProductSummary';
import { I18n } from '../../core/i18n/I18n';

interface OrderFilter { value: string; label: string; }

@Component
export struct OrderListPage {
  @Prop @Watch('onInitialStatus') initialStatus: string = '';
  @Prop @Watch('onActivation') activationEpoch: number = 0;
  showBack: boolean = false;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private status: string = '';
  @State private keyword: string = '';
  @State private orders: OrderSummary[] = [];
  @State private page: number = 1;
  @State private total: number = 0;
  @State private loading: boolean = false;
  @State private refreshing: boolean = false;
  @State private errorMessage: string = '';
  private requestEpoch: number = 0;
  private readonly filters: OrderFilter[] = [
    { value: '', label: '' }, { value: 'pending_payment', label: 'pending_payment' },
    { value: 'pending_shipment', label: 'pending_shipment' }, { value: 'shipped', label: 'shipped' },
    { value: 'completed', label: 'completed' }, { value: 'after_sale', label: 'after_sale' },
    { value: 'cancelled', label: 'cancelled' }
  ];

  aboutToAppear(): void { this.status = this.initialStatus; this.reload(); }

  private onInitialStatus(): void {
    if (this.status === this.initialStatus) return;
    this.status = this.initialStatus;
    this.reload();
  }

  private onActivation(): void { this.reload(); }

  private async reload(): Promise<void> {
    this.page = 1; await this.load(false);
  }

  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedStatus = this.status;
    const requestedKeyword = this.keyword.trim();
    const requestedPage = this.page;
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await OrderRepository.list(requestedStatus, requestedKeyword, requestedPage);
      if (epoch !== this.requestEpoch) return;
      this.orders = append ? this.orders.concat(result.list) : result.list;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        if (append && this.page === requestedPage) this.page = Math.max(1, requestedPage - 1);
        this.errorMessage = error instanceof ApiError ? error.message : 'i18n:orders-load';
      }
    } finally {
      if (epoch === this.requestEpoch) {
        this.loading = false;
        this.refreshing = false;
      }
    }
  }

  private async loadMore(): Promise<void> {
    if (this.loading || this.orders.length >= this.total) return;
    this.page += 1; await this.load(true);
  }

  private statusLabel(status: string): string {
    if (status === '') return I18n.text(this.language, '全部', 'All');
    if (status === 'pending_payment') return I18n.text(this.language, '待付款', 'To pay');
    if (status === 'pending_shipment') return I18n.text(this.language, '待发货', 'To ship');
    if (status === 'shipped') return I18n.text(this.language, '已发货', 'Shipped');
    if (status === 'completed') return I18n.text(this.language, '已完成', 'Completed');
    if (status === 'after_sale') return I18n.text(this.language, '售后中', 'After-sales');
    if (status === 'cancelled') return I18n.text(this.language, '已取消', 'Cancelled');
    return status;
  }

  @Builder
  private orderCard(item: OrderSummary) {
    Column({ space: 11 }) {
      Row() {
        Text(I18n.text(this.language, `订单 ${item.no}`, `Order ${item.no}`)).fontSize(12).layoutWeight(1)
          .fontColor(DesignTokens.muted(this.darkMode)).maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(this.statusLabel(item.status)).constraintSize({ maxWidth: '38%' }).fontSize(12)
          .fontColor(DesignTokens.brand(this.darkMode)).maxLines(2).textAlign(TextAlign.End);
      }.width('100%');
      if (item.items && item.items.length > 0) {
        ForEach(item.items.slice(0, 2), (orderItem: OrderItem) => {
          OrderProductSummary({ item: orderItem });
        }, (orderItem: OrderItem) => orderItem.id);
      }
      if (item.items && item.items.length > 2) {
        Text(I18n.text(this.language, `还有 ${item.items.length - 2} 种商品`, `${item.items.length - 2} more products`))
          .width('100%').fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }
      Divider().color(DesignTokens.border(this.darkMode));
      Column({ space: 5 }) {
        Text(item.address?.name || I18n.text(this.language, '客户', 'Customer')).width('100%').maxLines(1)
          .textOverflow({ overflow: TextOverflow.Ellipsis }).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
        Text(I18n.text(this.language, `共 ${(item.items || []).reduce((sum: number, product: OrderItem) => sum + product.quantity, 0)} 件商品`,
          `${(item.items || []).reduce((sum: number, product: OrderItem) => sum + product.quantity, 0)} items`))
          .width('100%').fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        Text(I18n.text(this.language, `实付 ¥${item.payAmount.toFixed(2)}`, `Paid ¥${item.payAmount.toFixed(2)}`)).width('100%')
          .wordBreak(WordBreak.BREAK_ALL).fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
      }.width('100%');
      if (item.status === 'pending_shipment') {
        Row() {
          Blank();
          IBestButton({ text: I18n.text(this.language, '立即发货', 'Ship now'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => AppRouter.push('OrderDetail', new IdRouteParams(item.id, 'ship')) });
        }.width('100%').onClick((): void => { /* Consume this tap without blocking parent scrolling. */ });
      } else if (item.status === 'shipped') {
        Row() { Blank(); IBestButton({ text: I18n.text(this.language, '查看物流', 'View tracking'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('OrderDetail', new IdRouteParams(item.id)) }); }.width('100%').onClick((): void => { /* Consume this tap without blocking parent scrolling. */ });
      } else if (item.status === 'after_sale') {
        Row() { Blank(); IBestButton({ text: I18n.text(this.language, '处理售后', 'Handle request'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('AfterSale') }); }.width('100%').onClick((): void => { /* Consume this tap without blocking parent scrolling. */ });
      }
    }
    .width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
    .onClick(() => AppRouter.push('OrderDetail', new IdRouteParams(item.id)));
  }

  build() {
    Column() {
      Row() {
        if (this.showBack) {
          Column() { MerchantIcon({ name: 'arrow-left', color: DesignTokens.text(this.darkMode), iconSize: 25 }); }
            .width(34).height(38).justifyContent(FlexAlign.Center).onClick(() => AppRouter.back());
        }
        Column({ space: 2 }) {
          Text(I18n.text(this.language, '订单', 'Orders')).fontSize(26).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Text(I18n.text(this.language, `共 ${this.total} 单`, `${this.total} total`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.alignItems(HorizontalAlign.Start);
        Blank();
        IBestButton({ text: I18n.text(this.language, '售后', 'After-sales'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('AfterSale') });
      }.width('100%').padding({ top: this.safeTop + 12, left: 16, right: 16, bottom: 10 });
      IBestSearch({
        value: $keyword, placeholder: I18n.text(this.language, '搜索订单号或客户', 'Search order number or customer'), isRound: true,
        outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode), showRightButton: true,
        rightButtonText: I18n.text(this.language, '搜索', 'Search'), onSearch: () => this.reload(), onRightButtonClick: () => this.reload(), onClear: () => this.reload()
      });
      Scroll() {
        Row({ space: 8 }) {
          ForEach(this.filters, (filter: OrderFilter) => {
            Text(this.statusLabel(filter.value)).fontSize(13)
              .fontColor(this.status === filter.value ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode))
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .border({ width: { bottom: 2 }, color: this.status === filter.value ? DesignTokens.brand(this.darkMode) : Color.Transparent })
              .onClick(() => { this.status = filter.value; this.reload(); });
          }, (filter: OrderFilter) => filter.value);
        }.padding({ left: 16, right: 16, top: 4, bottom: 10 });
      }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);
      if (this.errorMessage && this.orders.length === 0) {
        Column({ space: 12 }) {
          IBestEmpty({ description: I18n.state(this.language, this.errorMessage), emptyImage: 'network' });
          IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.reload() });
        }.layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (!this.loading && this.orders.length === 0) {
        Column() { IBestEmpty({ description: I18n.text(this.language, '暂无订单', 'No orders') }); }.layoutWeight(1).justifyContent(FlexAlign.Center);
      } else {
        if (this.errorMessage) {
          Text(I18n.state(this.language, this.errorMessage)).width('100%').fontSize(12)
            .fontColor(DesignTokens.muted(this.darkMode)).padding(12).onClick(() => this.reload());
        }
        Refresh({ refreshing: $$this.refreshing }) {
          List({ space: 10 }) {
            ForEach(this.orders, (item: OrderSummary) => { ListItem() { this.orderCard(item); } }, (item: OrderSummary) => item.id);
            if (this.loading) ListItem() { Row() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }.height(56).justifyContent(FlexAlign.Center); }
          }.padding({
            left: this.windowWidth >= 720 ? 24 : 16,
            right: this.windowWidth >= 720 ? 24 : 16,
            bottom: this.windowWidth >= 720 ? 28 : PrimaryNavigationMetrics.contentInset(this.safeBottom)
          }).lanes(this.windowWidth >= 720 ? 2 : 1, 12).onReachEnd(() => this.loadMore());
        }.layoutWeight(1).onRefreshing(() => { this.refreshing = true; this.reload(); });
      }
    }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
  }
}
