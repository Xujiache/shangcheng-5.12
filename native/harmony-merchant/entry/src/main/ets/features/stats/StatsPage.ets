import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { SessionStore } from '../../core/storage/SessionStore';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { MerchantAnalytics, StatsSelection } from './StatsModels';
import { StatsRepository } from './StatsRepository';
import { StatsPolicy, StatsRequests } from './StatsPolicy';
import { StatsDatePanel } from './StatsDatePanel';
import { StatsMetric, StatsRanking } from './StatsCards';
import { StatsTrendChart } from './StatsTrendChart';

@Builder
export function StatsFullBuilder(_: string) {
  NavDestination() { StatsPage({ showBack: true }); }.hideTitleBar(true);
}

@Component
export struct StatsPage {
  @Prop @Watch('onActivation') activationEpoch: number = 0;
  showBack: boolean = false;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageProp('sessionEpoch') @Watch('onSession') private sessionEpoch: number = 0;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private selection: StatsSelection = new StatsSelection();
  @State private calendarSelection: StatsSelection = new StatsSelection();
  @State private calendarVisible: boolean = false;
  @State private sheetMode: string = 'dates';
  @State private data: MerchantAnalytics | null = null;
  @State private loading: boolean = false;
  @State private errorKind: string = '';
  private requests: StatsRequests = new StatsRequests();
  private scroller: Scroller = new Scroller();
  private owner: string = '';
  private disposed: boolean = false;
  private displayKey: string = '';
  private loadEpoch: number = 0;
  private reloadPending: boolean = false;
  private readonly periods: string[] = ['today', 'week', 'month', 'year'];

  aboutToAppear(): void { this.disposed = false; this.owner = SessionStore.shared().user?.id || ''; this.load(); }
  aboutToDisappear(): void { this.disposed = true; this.requests.invalidate(); this.calendarVisible = false; }
  private current(epoch: number): boolean {
    return !this.disposed && this.loadEpoch === epoch && this.requests.current(epoch) && this.owner === (SessionStore.shared().user?.id || '');
  }
  private onSession(): void {
    this.requests.invalidate(); this.calendarVisible = false; this.data = null; this.displayKey = ''; this.loading = false;
    this.errorKind = ''; this.selection = new StatsSelection(); this.owner = SessionStore.shared().user?.id || '';
    if (this.owner && !this.disposed) this.load();
  }
  private onActivation(): void { if (this.calendarVisible) this.reloadPending = true; else this.load(); }
  private async load(): Promise<void> {
    if (this.disposed) return;
    const requested = StatsPolicy.resolve(this.selection);
    const key = `${this.owner}:${StatsPolicy.key(requested)}`;
    const epoch = this.requests.begin(key);
    if (!epoch) return;
    this.loadEpoch = epoch; this.loading = true; this.errorKind = ''; this.reloadPending = false;
    if (this.displayKey !== key) this.data = null;
    try {
      const raw = await StatsRepository.overview(requested);
      if (!this.current(epoch)) return;
      const result = StatsPolicy.verify(raw);
      if (result.period !== requested.period || result.startDate !== requested.startDate || result.endDate !== requested.endDate) throw new Error('stats-contract');
      this.data = result; this.displayKey = key;
    } catch (error) {
      if (this.current(epoch)) this.errorKind = error instanceof ApiError && (error.code === 404 || error.code === 1002) ? 'unavailable'
        : error instanceof Error && error.message === 'stats-contract' ? 'contract' : 'network';
    } finally { this.requests.finish(epoch); if (this.current(epoch)) this.loading = false; }
  }
  private selectPeriod(period: string): void {
    if (this.selection.period === period) return;
    this.selection = new StatsSelection(period); this.load();
  }
  private openCalendar(): void {
    this.calendarSelection = StatsPolicy.resolve(this.selection); this.sheetMode = 'dates'; this.calendarVisible = true;
  }
  private selectRange(selection: StatsSelection): void {
    if (StatsPolicy.rangeError(selection.startDate, selection.endDate)) return;
    const unchanged = StatsPolicy.key(this.selection) === StatsPolicy.key(selection);
    this.selection = new StatsSelection('custom', selection.startDate, selection.endDate); this.calendarVisible = false;
    if (!unchanged || this.reloadPending) this.load();
  }
  private closeSheet(): void { this.calendarVisible = false; if (this.reloadPending) this.load(); }
  private periodLabel(value: string): string {
    if (value === 'today') return I18n.text(this.language, '今日', 'Today');
    if (value === 'week') return I18n.text(this.language, '本周', 'Week');
    if (value === 'month') return I18n.text(this.language, '本月', 'Month');
    return I18n.text(this.language, '本年', 'Year');
  }
  private rangeLabel(): string {
    const range = this.data || StatsPolicy.resolve(this.selection);
    return range.startDate === range.endDate ? range.startDate : `${range.startDate} – ${range.endDate}`;
  }
  private errorText(): string {
    if (this.errorKind === 'unavailable') return I18n.text(this.language, '新版统计服务暂未就绪，请稍后重试。', 'The updated analytics service is not available yet. Please try later.');
    if (this.errorKind === 'contract') return I18n.text(this.language, '统计数据校验失败，请重试或联系支持。', 'Analytics could not be verified. Retry or contact support.');
    return I18n.text(this.language, '数据更新失败，请检查网络后重试。', 'Unable to update analytics. Check your connection and retry.');
  }

  @Builder private dateFilter() {
    Column({ space: 4 }) {
      Row({ space: 4 }) {
        ForEach(this.periods, (period: string) => {
          Button(this.periodLabel(period), { type: ButtonType.Normal }).height(44).layoutWeight(1).fontSize(14).borderRadius(10)
            .fontWeight(this.selection.period === period ? FontWeight.Medium : FontWeight.Regular)
            .fontColor(this.selection.period === period ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode))
            .backgroundColor(this.selection.period === period ? DesignTokens.brandTint(this.darkMode) : Color.Transparent)
            .accessibilitySelected(this.selection.period === period).onClick(() => this.selectPeriod(period));
        }, (period: string) => `${period}:${this.language}`);
      }.width('100%');
      Row({ space: 6 }) {
        Text(this.rangeLabel()).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
        Button(I18n.text(this.language, '自定义', 'Custom'), { type: ButtonType.Normal }).height(44).fontSize(13).padding({ left: 10, right: 10 }).borderRadius(10)
          .fontColor(this.selection.period === 'custom' ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode))
          .backgroundColor(this.selection.period === 'custom' ? DesignTokens.brandTint(this.darkMode) : Color.Transparent)
          .accessibilitySelected(this.selection.period === 'custom').onClick(() => this.openCalendar());
      }.width('100%');
    }.width('100%').padding({ left: 8, right: 8, top: 6, bottom: 2 }).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
  @Builder private overview() {
    if (this.data) Column({ space: 14 }) {
      Row({ space: 14 }) {
        StatsMetric({ zh: '实付成交额', en: 'Paid sales', value: StatsPolicy.money(this.data.paidAmount), highlight: true }).layoutWeight(1);
        StatsMetric({ zh: '实付订单', en: 'Paid orders', value: `${this.data.paidOrderCount}` }).layoutWeight(1);
      }.width('100%');
      Divider().color(DesignTokens.border(this.darkMode));
      Row({ space: 14 }) {
        StatsMetric({ zh: '客单价', en: 'Avg. order value', value: StatsPolicy.money(this.data.avgOrderValue) }).layoutWeight(1);
        StatsMetric({ zh: '已完成退款', en: 'Completed refunds', value: StatsPolicy.money(this.data.refundAmount) }).layoutWeight(1);
      }.width('100%');
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
  @Builder private skeleton() {
    Column({ space: 12 }) {
      Column().height(162).width('100%').borderRadius(16).backgroundColor(DesignTokens.subtle(this.darkMode));
      Column().height(226).width('100%').borderRadius(16).backgroundColor(DesignTokens.subtle(this.darkMode));
      Text(I18n.text(this.language, '正在读取经营数据…', 'Loading analytics…')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
    }.width('100%');
  }
  @Builder private sheet() {
    if (this.sheetMode === 'dates') StatsDatePanel({ selection: this.calendarSelection, onApply: (selection: StatsSelection) => this.selectRange(selection), onClose: () => this.closeSheet() });
    else Column({ space: 14 }) {
      Text(I18n.text(this.language, '统计口径', 'About these figures')).fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).width('100%');
      Scroll() {
        Column({ space: 16 }) {
          Text(I18n.text(this.language, '成交额与订单数按付款时间统计；已退款订单的原付款仍计入成交，不代表利润或可提现余额。', 'Sales and order counts use payment time. Refunded orders remain in gross paid sales. This is not profit or withdrawable balance.')).fontSize(14).lineHeight(22).fontColor(DesignTokens.text(this.darkMode)).width('100%');
          Text(I18n.text(this.language, '退款按实际完成时间单独统计；申请、同意和处理中不算完成，跨期退款计入完成期间。', 'Refunds use completion time and are shown separately. Requested, approved or processing refunds are excluded; cross-period refunds count when completed.')).fontSize(14).lineHeight(22).fontColor(DesignTokens.text(this.darkMode)).width('100%');
          Text(I18n.text(this.language, '销量是付款订单购买件数，不扣减无法确认的退货件数。品类按商品当前分类，缺失归为未分类。', 'Units are purchased quantities from paid orders, without inferred returned quantities. Categories use current product classification; missing categories are uncategorized.')).fontSize(14).lineHeight(22).fontColor(DesignTokens.text(this.darkMode)).width('100%');
          Text(I18n.text(this.language, '统一采用北京时间，周一为每周开始。日期边界按开始日零点至结束日次日零点计算；今天只统计到本次更新时刻。', 'All dates use Beijing time. Weeks start Monday. Ranges include whole days; today is counted only up to the update time.')).fontSize(14).lineHeight(22).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        }.width('100%').alignItems(HorizontalAlign.Start);
      }.layoutWeight(1).width('100%').align(Alignment.Top);
      Button(I18n.text(this.language, '知道了', 'Got it'), { type: ButtonType.Normal }).width('100%').height(48).fontSize(14).borderRadius(12)
        .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode)).onClick(() => this.closeSheet());
    }.width('100%').height('100%').padding({ left: 18, right: 18, top: 18, bottom: this.safeBottom + 12 })
      .foregroundColor(DesignTokens.text(this.darkMode));
  }
  build() {
    Column() {
      Row({ space: 6 }) {
        if (this.showBack) Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'arrow-left', color: DesignTokens.text(this.darkMode), iconSize: 24 }); }
          .width(44).height(44).backgroundColor(Color.Transparent).onClick(() => AppRouter.back());
        Text(I18n.text(this.language, '经营数据', 'Analytics')).fontSize(22).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'question-o', color: DesignTokens.muted(this.darkMode), iconSize: 22 }); }
          .width(44).height(44).backgroundColor(Color.Transparent).accessibilityText(I18n.text(this.language, '统计说明', 'About these figures'))
          .onClick(() => { this.sheetMode = 'info'; this.calendarVisible = true; });
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'replay', color: DesignTokens.brand(this.darkMode), iconSize: 22 }); }
          .width(44).height(44).backgroundColor(Color.Transparent).enabled(!this.loading).onClick(() => this.load())
          .accessibilityText(I18n.text(this.language, '刷新数据', 'Refresh analytics'));
      }.width('100%').padding({ top: this.safeTop + 8, left: this.showBack ? 8 : 16, right: 8, bottom: 8 });
      Scroll(this.scroller) {
        Column({ space: 12 }) {
          this.dateFilter();
          if (this.errorKind) {
            Column({ space: 8 }) {
              Text(this.errorText()).fontSize(13).fontColor(DesignTokens.warning(this.darkMode)).width('100%');
              if (this.data) Text(I18n.text(this.language, '以下保留该范围上次成功读取的数据。', 'Showing the last successful data for this range.')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              Button(I18n.text(this.language, '重试', 'Retry'), { type: ButtonType.Normal }).height(44).width('100%').fontSize(14).borderRadius(10)
                .backgroundColor(DesignTokens.card(this.darkMode)).fontColor(DesignTokens.brand(this.darkMode)).enabled(!this.loading).onClick(() => this.load());
            }.width('100%').padding(12).borderRadius(12).backgroundColor(DesignTokens.warningTint(this.darkMode));
          }
          if (this.loading && !this.data) this.skeleton();
          if (this.data) {
            Row({ space: 8 }) {
              if (this.loading) LoadingProgress().width(16).height(16).color(DesignTokens.brand(this.darkMode));
              Text(this.loading ? I18n.text(this.language, '更新中…', 'Updating…')
                : I18n.text(this.language, `截至 ${StatsPolicy.bucketLabel(this.data.asOf, 'hour', true)} · 北京时间`, `As of ${StatsPolicy.bucketLabel(this.data.asOf, 'hour', true)} · Beijing time`))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
            }.width('100%');
            this.overview();
            if (this.windowWidth >= 720) {
              Row({ space: 12 }) {
                StatsTrendChart({ points: this.data.trend, granularity: this.data.granularity }).layoutWeight(1);
                StatsRanking({ data: this.data }).layoutWeight(1);
              }.width('100%').alignItems(VerticalAlign.Top);
            } else {
              StatsTrendChart({ points: this.data.trend, granularity: this.data.granularity });
              StatsRanking({ data: this.data });
            }
          }
        }.width('100%').constraintSize({ maxWidth: 1120 }).padding({ left: 16, right: 16, top: 2,
          bottom: this.showBack || this.windowWidth >= 720 ? this.safeBottom + 20 : PrimaryNavigationMetrics.contentInset(this.safeBottom) });
      }.width('100%').layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
    }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
      .bindSheet(this.calendarVisible, this.sheet(), { height: '85%', showClose: false, dragBar: false,
        backgroundColor: DesignTokens.card(this.darkMode), onWillDismiss: () => this.closeSheet() });
  }
}
