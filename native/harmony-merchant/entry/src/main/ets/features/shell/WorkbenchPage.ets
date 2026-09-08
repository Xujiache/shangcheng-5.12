import { PrimaryNavigationMetrics } from './PrimaryNavigationMetrics';
import { IBestButton, IBestSkeleton, IBestTag } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { FilterRouteParams, IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { BusinessRepository } from '../business/BusinessRepository';
import { MembershipInfo, MerchantProfile, PlazaProduct } from '../business/BusinessModels';
import { DashboardTrendPoint, DashboardWorkbench } from './WorkbenchModels';
import { WorkbenchRepository } from './WorkbenchRepository';
import { PrimaryTabCoordinator } from './PrimaryTabCoordinator';
import { I18n } from '../../core/i18n/I18n';
import { OfflineCacheStore } from '../../core/storage/OfflineCacheStore';
import { SessionStore } from '../../core/storage/SessionStore';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';

interface WorkbenchTool {
  key: string;
  name: string;
  route: string;
  image: Resource;
  filter: string;
}

@Component
export struct WorkbenchPage {
  @Prop @Watch('onActivation') activationEpoch: number = 0;
  @Prop @Watch('onActiveChanged') isActive: boolean = true;
  @StorageProp('appForeground') @Watch('onForegroundChanged') private appForeground: boolean = true;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private loading: boolean = true;
  @State private errorMessage: string = '';
  @State private paidAmount: number = 0;
  @State private paidOrders: number = 0;
  @State private paidCustomers: number = 0;
  @State private paidAmountPct: number | null = null;
  @State private paidOrdersPct: number | null = null;
  @State private paidCustomersPct: number | null = null;
  @State private pendingShipment: number = 0;
  @State private pendingRefund: number = 0;
  @State private unreadMessages: number = 0;
  @State private rejectedProducts: number = 0;
  @State private pendingStoreAuth: number = 0;
  @State private updatedAt: string = '';
  @State private trend: DashboardTrendPoint[] = [];
  @State private profile: MerchantProfile | null = null;
  @State private membership: MembershipInfo | null = null;
  @State private plazaProducts: PlazaProduct[] = [];
  @State private plazaLoading: boolean = true;
  @State private homeFlags: Record<string, boolean> = {};
  @State private usingOfflineCache: boolean = false;
  @State private offlineCachedAt: number = 0;
  @State private refreshing: boolean = false;
  private refreshInFlight: boolean = false;
  private lastRefreshAt: number = 0;
  private refreshTimer: number = -1;

  private readonly tools: WorkbenchTool[] = [
    { key: 'order', name: 'order', route: 'FilteredOrders', image: $r('app.media.commerce_orders_lite'), filter: '' },
    { key: 'product', name: 'product', route: 'FilteredProducts', image: $r('app.media.commerce_products_lite'), filter: '' },
    { key: 'customer', name: 'customer', route: 'Customers', image: $r('app.media.commerce_customers_lite'), filter: '' },
    { key: 'stats', name: 'stats', route: 'StatsFull', image: $r('app.media.commerce_analytics_lite'), filter: '' },
    { key: 'chat', name: 'chat', route: 'ChatSessions', image: $r('app.media.commerce_service_lite'), filter: '' },
    { key: 'marketing', name: 'marketing', route: 'Marketing', image: $r('app.media.commerce_marketing_lite'), filter: '' },
    { key: 'store', name: 'store', route: 'Stores', image: $r('app.media.commerce_store_lite'), filter: '' },
    { key: 'staff', name: 'staff', route: 'Staffs', image: $r('app.media.commerce_staff_lite'), filter: '' },
    { key: 'agency', name: 'agency', route: 'AgencyProducts', image: $r('app.media.commerce_agency_lite'), filter: '' },
    { key: 'price-rule', name: 'price', route: 'PriceRule', image: $r('app.media.commerce_pricing_lite'), filter: '' }
  ];

  private toolLabel(key: string): string {
    if (key === 'order') return I18n.text(this.language, '订单', 'Orders');
    if (key === 'product') return I18n.text(this.language, '商品', 'Products');
    if (key === 'customer') return I18n.text(this.language, '客户', 'Customers');
    if (key === 'stats') return I18n.text(this.language, '数据', 'Analytics');
    if (key === 'chat') return I18n.text(this.language, '客服', 'Messages');
    if (key === 'marketing') return I18n.text(this.language, '营销', 'Marketing');
    if (key === 'store') return I18n.text(this.language, '门店', 'Stores');
    if (key === 'staff') return I18n.text(this.language, '员工', 'Staff');
    if (key === 'agency') return I18n.text(this.language, '代理', 'Agency');
    return I18n.text(this.language, '价格', 'Pricing');
  }

  aboutToAppear(): void {
    if (this.isActive) this.refreshAll();
    this.startRefreshTimer();
  }

  aboutToDisappear(): void {
    this.stopRefreshTimer();
  }

  private onActivation(): void { if (this.isActive) this.refreshAll(); }

  private onActiveChanged(): void {
    if (this.isActive) this.refreshAll();
  }

  private onForegroundChanged(): void {
    if (this.appForeground && this.isActive) this.refreshAll();
  }

  private startRefreshTimer(): void {
    if (this.refreshTimer >= 0) return;
    this.refreshTimer = setInterval((): void => {
      if (this.isActive && this.appForeground) this.refreshAll();
    }, 60 * 1000);
  }

  private stopRefreshTimer(): void {
    if (this.refreshTimer < 0) return;
    clearInterval(this.refreshTimer);
    this.refreshTimer = -1;
  }

  private async refreshAll(fromPull: boolean = false): Promise<void> {
    if (this.refreshInFlight) return;
    const now = Date.now();
    if (!fromPull && now - this.lastRefreshAt < 1500) return;
    this.refreshInFlight = true;
    this.lastRefreshAt = now;
    if (fromPull) this.refreshing = true;
    try {
      await Promise.all([
        this.loadDashboard(), this.loadProfile(), this.loadMembership(), this.loadPlaza(), this.loadFeatureFlags()
      ]);
    } finally {
      this.refreshing = false;
      this.refreshInFlight = false;
    }
  }

  private async loadDashboard(): Promise<void> {
    this.loading = !this.updatedAt;
    this.errorMessage = '';
    try {
      const value = (await WorkbenchRepository.loadDashboard()).workbench;
      this.applyDashboard(value, false, 0);
      OfflineCacheStore.put(this.dashboardCacheKey(), value).catch((): void => {});
    } catch (error) {
      if (!this.updatedAt) {
        try {
          const cached = await OfflineCacheStore.get<DashboardWorkbench>(this.dashboardCacheKey());
          if (cached) {
            this.applyDashboard(cached.value, true, cached.updatedAt);
          } else {
            this.errorMessage = error instanceof ApiError ? error.message : 'i18n:dashboard-load';
          }
        } catch (_) {
          this.errorMessage = error instanceof ApiError ? error.message : 'i18n:dashboard-load';
        }
      }
    } finally {
      this.loading = false;
    }
  }

  private dashboardCacheKey(): string {
    return `workbench-v1:${SessionStore.shared().user?.merchantId || 'merchant'}`;
  }

  private applyDashboard(value: DashboardWorkbench, offline: boolean, cachedAt: number): void {
    this.paidAmount = value.overview.paidAmount;
    this.paidOrders = value.overview.paidOrders;
    this.paidCustomers = value.overview.paidCustomers;
    this.paidAmountPct = value.overview.versusYesterday?.paidAmountPct ?? null;
    this.paidOrdersPct = value.overview.versusYesterday?.paidOrdersPct ?? null;
    this.paidCustomersPct = value.overview.versusYesterday?.paidCustomersPct ?? null;
    this.pendingShipment = value.actions.pendingShipment;
    this.pendingRefund = value.actions.pendingRefund;
    this.unreadMessages = value.actions.unreadMessages;
    this.rejectedProducts = value.actions.rejectedProducts;
    this.pendingStoreAuth = value.actions.pendingStoreAuth;
    this.trend = value.trend7d || [];
    this.updatedAt = value.updatedAt;
    this.usingOfflineCache = offline;
    this.offlineCachedAt = cachedAt;
  }

  private updateLabel(): string {
    if (this.usingOfflineCache) {
      const time = this.offlineCachedAt > 0 ? new Date(this.offlineCachedAt).toTimeString().slice(0, 5) : '--:--';
      return I18n.text(this.language, `离线缓存 ${time}`, `Offline cache ${time}`);
    }
    return this.updatedAt
      ? I18n.text(this.language, `${this.updatedAt.slice(11, 16)} 更新`, `Updated ${this.updatedAt.slice(11, 16)}`)
      : '';
  }

  private async loadProfile(): Promise<void> {
    try { this.profile = await BusinessRepository.profile(); } catch (_) { /* 核心数据可独立展示 */ }
  }

  private async loadMembership(): Promise<void> {
    try { this.membership = await BusinessRepository.membership(); } catch (_) { this.membership = null; }
  }

  private async loadPlaza(): Promise<void> {
    this.plazaLoading = this.plazaProducts.length === 0;
    try {
      const page = await BusinessRepository.plazaProducts('', 1);
      this.plazaProducts = page.list.slice(0, 3);
    } catch (_) {
      // 保留最后一次成功的推荐，弱网刷新不制造闪空。
    } finally {
      this.plazaLoading = false;
    }
  }

  private async loadFeatureFlags(): Promise<void> {
    try { this.homeFlags = (await WorkbenchRepository.loadFeatureFlags()).homeEntry; } catch (_) { /* 默认全部启用 */ }
  }

  private shopName(): string { return this.profile?.shopName || I18n.text(this.language, '经纬科技 · 商家版', 'Jingwei Merchant'); }
  private merchantType(): string {
    return this.profile?.type === 'factory'
      ? I18n.text(this.language, '厂家', 'Factory')
      : this.profile?.type === 'store'
        ? I18n.text(this.language, '门店', 'Store')
        : I18n.text(this.language, '商家', 'Merchant');
  }

  private membershipLabel(): string {
    if (!this.membership) return I18n.text(this.language, '未开通会员', 'No active membership');
    if (this.membership.status === 'expired') return I18n.text(this.language, '会员已到期', 'Membership expired');
    if (this.membership.status === 'cancelled') return I18n.text(this.language, '会员已取消', 'Membership cancelled');
    const days = Math.max(0, Math.ceil((new Date(this.membership.endAt).getTime() - Date.now()) / 86400000));
    const name = this.membership.plan?.name || I18n.text(this.language, '会员', 'Membership');
    return I18n.text(this.language, `${name} · ${days}天`, `${name} · ${days} days`);
  }

  private comparison(value: number | null): string {
    if (value === null) return I18n.text(this.language, '较昨日 --', 'vs yesterday --');
    if (value === 0) return I18n.text(this.language, '较昨日持平', 'No change vs yesterday');
    return I18n.text(this.language,
      `较昨日 ${value > 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}%`,
      `${value > 0 ? '↑' : '↓'} ${Math.abs(value).toFixed(1)}% vs yesterday`);
  }

  private comparisonColor(value: number | null): ResourceColor {
    if (value === null || value === 0) return DesignTokens.muted(this.darkMode);
    return value > 0 ? DesignTokens.success(this.darkMode) : DesignTokens.danger(this.darkMode);
  }

  private count(value: number): string { return value > 99 ? '99+' : `${value}`; }
  private trendTotal(): number { return this.trend.reduce((sum: number, item: DashboardTrendPoint): number => sum + item.paidAmount, 0); }
  private trendMax(): number {
    let max = 1;
    this.trend.forEach((item: DashboardTrendPoint): void => { if (item.paidAmount > max) max = item.paidAmount; });
    return max;
  }

  private openTool(item: WorkbenchTool): void {
    if (item.route === 'FilteredOrders') {
      PrimaryTabCoordinator.open('order', item.filter);
    } else if (item.route === 'FilteredProducts') {
      PrimaryTabCoordinator.open('product', item.filter);
    } else if (item.route === 'StatsFull') {
      PrimaryTabCoordinator.open('stats');
    } else {
      AppRouter.push(item.route);
    }
  }

  private openAction(route: string, filter: string): void {
    if (route === 'FilteredOrders') PrimaryTabCoordinator.open('order', filter);
    else if (route === 'FilteredProducts') PrimaryTabCoordinator.open('product', filter);
    else AppRouter.push(route, filter ? new FilterRouteParams(filter) : undefined);
  }

  @Builder
  private secondaryMetric(title: string, value: string, comparison: number | null) {
    Column({ space: 5 }) {
      Text(title).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      Text(value).fontSize(21).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).maxLines(1);
      Text(this.comparison(comparison)).fontSize(10).fontColor(this.comparisonColor(comparison)).maxLines(1);
    }.layoutWeight(1).alignItems(HorizontalAlign.Start);
  }

  @Builder
  private action(title: string, count: number, image: Resource, color: string, route: string, filter: string = '') {
    Column({ space: 7 }) {
      Stack({ alignContent: Alignment.Center }) {
        Column() {
          Image(image).width(40).height(40).objectFit(ImageFit.Contain);
        }.width(42).height(42).borderRadius(14).backgroundColor(DesignTokens.subtle(this.darkMode))
          .justifyContent(FlexAlign.Center);
        if (count > 0) {
          Text(this.count(count)).fontSize(9).fontWeight(FontWeight.Medium).fontColor(Color.White)
            .textAlign(TextAlign.Center).padding({ left: 5, right: 5, top: 2, bottom: 2 })
            .borderRadius(9).backgroundColor(color).position({ x: 34, y: 0 });
        }
      }.width(54).height(46);
      Text(title).fontSize(12).fontColor(DesignTokens.text(this.darkMode));
    }.layoutWeight(1).onClick(() => this.openAction(route, filter));
  }

  @Builder
  private identityHeader() {
    Row({ space: 11 }) {
      if (this.profile?.avatar) {
        Image(this.profile.avatar).width(48).height(48).borderRadius(14).objectFit(ImageFit.Cover);
      } else {
        Column() { Text(this.shopName().slice(0, 1)).fontSize(20).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode)); }
          .width(48).height(48).borderRadius(14).backgroundColor(DesignTokens.brandTint(this.darkMode)).justifyContent(FlexAlign.Center);
      }
      Column({ space: 5 }) {
        Row({ space: 7 }) {
          Text(this.shopName()).fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode))
            .maxLines(1).layoutWeight(1);
          IBestTag({ text: this.merchantType(), plain: true, color: DesignTokens.brand(this.darkMode) });
        }.width('100%');
        Text(this.membershipLabel()).fontSize(11).fontColor(DesignTokens.brand(this.darkMode))
          .onClick(() => AppRouter.push('Membership'));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      Stack({ alignContent: Alignment.TopEnd }) {
        Column() {
          Image($r('app.media.commerce_message_lite')).width(34).height(34).objectFit(ImageFit.Contain);
        }
          .width(46).height(46).borderRadius(23).backgroundColor(DesignTokens.card(this.darkMode)).justifyContent(FlexAlign.Center);
        if (this.unreadMessages > 0) {
          Text(this.count(this.unreadMessages)).fontSize(9).fontColor(Color.White).textAlign(TextAlign.Center)
            .width(this.unreadMessages > 99 ? 28 : 20).height(18).borderRadius(9).backgroundColor(DesignTokens.danger(this.darkMode));
        }
      }.onClick(() => AppRouter.push('ChatSessions'));
    }.width('100%');
  }

  @Builder
  private dashboardSkeleton() {
    Column({ space: 12 }) {
      Column() { IBestSkeleton({ rows: 3, animated: true, radius: 8 }); }
        .width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode))
        .borderRadius(DesignTokens.RADIUS_LARGE);
      Column() { IBestSkeleton({ rows: 2, animated: true, radius: 8 }); }
        .width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode))
        .borderRadius(DesignTokens.RADIUS_LARGE);
    }.width('100%');
  }

  @Builder
  private businessCard() {
    Column({ space: 12 }) {
      Row() {
        Text(I18n.text(this.language, '今日经营', 'Today')).fontSize(16).fontWeight(FontWeight.Bold)
          .fontColor(DesignTokens.text(this.darkMode));
        Blank();
        Text(this.updateLabel()).fontSize(10)
          .fontColor(this.usingOfflineCache ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
      }.width('100%');
      Row({ space: 18 }) {
        Column({ space: 4 }) {
          Text(I18n.text(this.language, '实付成交额', 'Paid sales')).fontSize(11)
            .fontColor(DesignTokens.muted(this.darkMode));
          Text(`¥${this.paidAmount.toFixed(2)}`).fontSize(27).fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.text(this.darkMode)).maxLines(1);
          Text(this.comparison(this.paidAmountPct)).fontSize(9)
            .fontColor(this.comparisonColor(this.paidAmountPct)).maxLines(1);
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        this.secondaryMetric(I18n.text(this.language, '实付订单', 'Paid orders'), `${this.paidOrders}`, this.paidOrdersPct);
        this.secondaryMetric(I18n.text(this.language, '成交客户', 'Customers'), `${this.paidCustomers}`, this.paidCustomersPct);
      }.width('100%').alignItems(VerticalAlign.Bottom);
      Divider().color(DesignTokens.border(this.darkMode));
      Row() {
        this.action(I18n.text(this.language, '待发货', 'To ship'), this.pendingShipment, $r('app.media.commerce_shipment_lite'),
          DesignTokens.brand(this.darkMode), 'FilteredOrders', 'pending_shipment');
        this.action(I18n.text(this.language, '待退款', 'Refunds'), this.pendingRefund, $r('app.media.commerce_refund_lite'),
          DesignTokens.danger(this.darkMode), 'AfterSale', 'pending');
        this.action(I18n.text(this.language, '未读消息', 'Unread'), this.unreadMessages, $r('app.media.commerce_unread_lite'),
          DesignTokens.brand(this.darkMode), 'ChatSessions', 'unread');
        this.action(I18n.text(this.language, '商品驳回', 'Rejected'), this.rejectedProducts, $r('app.media.commerce_rejected_lite'),
          DesignTokens.brand(this.darkMode), 'FilteredProducts', 'rejected');
        this.action(I18n.text(this.language, '门店申请', 'Stores'), this.pendingStoreAuth, $r('app.media.commerce_store_apply_lite'),
          DesignTokens.success(this.darkMode), 'Stores', 'pending');
      }.width('100%');
    }
    .width('100%').padding({ left: 14, right: 14, top: 14, bottom: 12 })
    .backgroundColor(DesignTokens.card(this.darkMode))
    .borderRadius(DesignTokens.RADIUS_LARGE)
    .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  private visibleTools(): WorkbenchTool[] {
    return this.tools.filter((item: WorkbenchTool): boolean => this.homeFlags[item.key] !== false);
  }

  @Builder
  private toolItem(tool: WorkbenchTool) {
    Column({ space: 4 }) {
      Image(tool.image).width(46).height(46).objectFit(ImageFit.Contain);
      Text(this.toolLabel(tool.name)).fontSize(11).fontColor(DesignTokens.text(this.darkMode)).maxLines(1);
    }.width('20%').height(69).justifyContent(FlexAlign.Center).onClick(() => this.openTool(tool));
  }

  @Builder
  private toolRow(items: WorkbenchTool[]) {
    Row() {
      ForEach(items, (tool: WorkbenchTool) => { this.toolItem(tool); }, (tool: WorkbenchTool) => tool.key);
    }.width('100%');
  }

  @Builder
  private toolsCard() {
    Column({ space: 2 }) {
      this.toolRow(this.visibleTools().slice(0, 5));
      if (this.visibleTools().length > 5) this.toolRow(this.visibleTools().slice(5, 10));
    }.width('100%').padding({ left: 5, right: 5, top: 5, bottom: 5 })
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private trendCard() {
    Column({ space: 12 }) {
      Row() {
        Column({ space: 3 }) {
          Text(I18n.text(this.language, '近七日成交', 'Paid sales, last 7 days')).fontSize(17).fontWeight(FontWeight.Medium);
          Text(I18n.text(this.language, `合计 ¥${this.trendTotal().toFixed(2)}`, `Total ¥${this.trendTotal().toFixed(2)}`)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Text(I18n.text(this.language, '查看数据 ›', 'View analytics ›')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).onClick(() => AppRouter.push('StatsFull'));
      }.width('100%');
      if (this.trend.length === 0) {
        Text(I18n.text(this.language, '暂无实付趋势', 'No paid-sales trend yet')).height(90).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      } else {
        Row({ space: 7 }) {
          ForEach(this.trend, (item: DashboardTrendPoint) => {
            Column({ space: 5 }) {
              Blank();
              Column().width('68%').height(Math.max(4, 86 * item.paidAmount / this.trendMax()))
                .backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius({ topLeft: 4, topRight: 4 });
              Text(item.date.slice(5)).fontSize(8).fontColor(DesignTokens.muted(this.darkMode));
            }.layoutWeight(1).height(112).justifyContent(FlexAlign.End);
          }, (item: DashboardTrendPoint) => item.date);
        }.width('100%');
      }
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private plazaCard() {
    Column({ space: 12 }) {
      Row() {
        Column({ space: 3 }) {
          Text(I18n.text(this.language, '选品机会', 'Sourcing opportunities')).fontSize(17).fontWeight(FontWeight.Medium);
          Text(I18n.text(this.language, '厂家直供，快速扩充商品', 'Factory-direct products to grow your catalog')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Text(I18n.text(this.language, '进入广场 ›', 'Open plaza ›')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).onClick(() => AppRouter.push('Plaza'));
      }.width('100%');
      if (this.plazaLoading) {
        Row() { LoadingProgress().width(25).height(25).color(DesignTokens.brand(this.darkMode)); }.height(92).justifyContent(FlexAlign.Center);
      } else if (this.plazaProducts.length === 0) {
        Text(I18n.text(this.language, '当前暂无推荐，点击进入选品广场浏览全部货源', 'No recommendations yet. Open the sourcing plaza to browse all products.')).fontSize(12)
          .fontColor(DesignTokens.muted(this.darkMode)).height(58).onClick(() => AppRouter.push('Plaza'));
      } else {
        Row({ space: 10 }) {
          ForEach(this.plazaProducts, (item: PlazaProduct) => {
            Column({ space: 5 }) {
              ResilientRemoteImage({
                thumbnailUrl: item.productImageThumb || '', originalUrl: item.productImage,
                widthValue: 96, heightValue: 74, radius: 9
              });
              Text(item.productName).fontSize(11).maxLines(1).width('100%');
              Text(I18n.text(this.language, `¥${item.startPrice.toFixed(2)}起`, `From ¥${item.startPrice.toFixed(2)}`)).fontSize(11).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
            }.layoutWeight(1).alignItems(HorizontalAlign.Start)
              .onClick(() => AppRouter.push('FactoryDetail', new IdRouteParams(item.factoryId)));
          }, (item: PlazaProduct) => item.productId);
        }.width('100%');
      }
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    Refresh({ refreshing: $$this.refreshing }) {
      Scroll() {
        Column({ space: 10 }) {
        this.identityHeader();
        if (this.loading) {
          this.dashboardSkeleton();
        } else if (this.errorMessage) {
          Column({ space: 12 }) {
            Text(I18n.state(this.language, this.errorMessage)).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
            IBestButton({ text: I18n.text(this.language, '重新加载', 'Reload'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.loadDashboard() });
          }.height(154).width('100%').justifyContent(FlexAlign.Center)
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
            .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
        } else {
          this.businessCard();
        }

        Row() {
          Text(I18n.text(this.language, '常用工具', 'Tools')).fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
        }.width('100%');
        this.toolsCard();

        if (this.updatedAt) this.trendCard();
        this.plazaCard();
        }.width('100%').padding({
        top: this.safeTop + 14,
        left: this.windowWidth >= 720 ? 24 : 16,
        right: this.windowWidth >= 720 ? 24 : 16,
        bottom: this.windowWidth >= 720 ? 28 : PrimaryNavigationMetrics.contentInset(this.safeBottom)
        });
      }.width('100%').height('100%').align(Alignment.Top)
        .backgroundColor(DesignTokens.page(this.darkMode)).scrollBar(BarState.Off);
    }.width('100%').height('100%').onRefreshing(() => this.refreshAll(true));
  }
}
