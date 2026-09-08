import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { IBestButton, IBestCalendarConfirmResult, IBestCalendarDialog, IBestEmpty } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { CategoryBar, MerchantStats, TopProductPoint, TrendPoint } from './StatsModels';
import { StatsRepository } from './StatsRepository';
import { I18n } from '../../core/i18n/I18n';

interface PeriodItem { value: string; label: string; }

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
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private period: string = 'week';
  @State private customDate: string = '';
  @State private calendarVisible: boolean = false;
  @State private data: MerchantStats | null = null;
  @State private loading: boolean = false;
  @State private errorMessage: string = '';
  private loadEpoch: number = 0;
  private readonly periods: PeriodItem[] = [
    { value: 'today', label: 'today' }, { value: 'week', label: 'week' },
    { value: 'month', label: 'month' }, { value: 'year', label: 'year' }
  ];

  private periodLabel(value: string): string {
    if (value === 'today') return I18n.text(this.language, '今日', 'Today');
    if (value === 'week') return I18n.text(this.language, '本周', 'Week');
    if (value === 'month') return I18n.text(this.language, '本月', 'Month');
    return I18n.text(this.language, '本年', 'Year');
  }

  aboutToAppear(): void { this.load(); }

  private onActivation(): void { this.load(); }

  private async load(): Promise<void> {
    const epoch = ++this.loadEpoch;
    const requestedPeriod = this.period;
    const requestedDate = this.customDate;
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await StatsRepository.get(requestedPeriod, requestedDate);
      if (epoch === this.loadEpoch) this.data = result;
    } catch (error) {
      if (epoch === this.loadEpoch) {
        this.errorMessage = error instanceof ApiError ? error.message : 'i18n:stats-load';
      }
    } finally {
      if (epoch === this.loadEpoch) this.loading = false;
    }
  }

  private selectPeriod(value: string): void {
    if (this.period === value && !this.customDate) return;
    this.period = value;
    this.customDate = '';
    this.load();
  }

  private selectDate(value: string): void {
    this.customDate = value;
    this.period = 'today';
    this.load();
  }

  private maxTrend(): number {
    if (!this.data || this.data.salesTrend.length === 0) return 1;
    let max = 1;
    this.data.salesTrend.forEach((item: TrendPoint) => { if (item.value > max) max = item.value; });
    return max;
  }

  @Builder
  private metric(label: string, value: string) {
    Column({ space: 7 }) {
      Text(value).fontSize(21).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).maxLines(1);
      Text(label).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
    }.layoutWeight(1).alignItems(HorizontalAlign.Start);
  }

  build() {
    Stack() {
      Column() {
        Row({ space: 9 }) {
          if (this.showBack) {
            Column() { MerchantIcon({ name: 'arrow-left', color: DesignTokens.text(this.darkMode), iconSize: 25 }); }
              .width(34).height(38).justifyContent(FlexAlign.Center).onClick(() => AppRouter.back());
          }
          Text(I18n.text(this.language, '经营数据', 'Analytics')).fontSize(26).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Blank();
          if (this.customDate) {
            Text(I18n.text(this.language, '恢复当前', 'Reset')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode))
              .onClick(() => { this.customDate = ''; this.load(); });
          }
          Text(this.customDate || I18n.text(this.language, '选择日期', 'Choose date')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode))
            .padding({ left: 10, right: 10, top: 7, bottom: 7 })
            .backgroundColor(DesignTokens.brandTint(this.darkMode)).borderRadius(16)
            .onClick(() => { this.calendarVisible = true; });
        }.width('100%').padding({ top: this.safeTop + 15, left: 16, right: 16, bottom: 14 });
      Row({ space: 8 }) {
        ForEach(this.periods, (item: PeriodItem) => {
          Text(this.periodLabel(item.label)).fontSize(13).textAlign(TextAlign.Center)
            .fontColor(this.period === item.value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
            .padding({ top: 9, bottom: 9 }).layoutWeight(1)
            .backgroundColor(this.period === item.value ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
            .borderRadius(18).onClick(() => this.selectPeriod(item.value));
        }, (item: PeriodItem) => item.value);
      }.width('100%').padding({ left: 16, right: 16, bottom: 14 });

      if (this.loading && !this.data) {
        Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }.layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (this.errorMessage) {
        Column({ space: 12 }) {
          IBestEmpty({ description: I18n.state(this.language, this.errorMessage), emptyImage: 'network' });
          IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.load() });
        }.layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (this.data) {
        Scroll() {
          Column({ space: 14 }) {
            Row() {
              this.metric(I18n.text(this.language, '实付成交额', 'Paid sales'), `¥${this.data.totalSales.toFixed(2)}`);
              this.metric(I18n.text(this.language, '实付订单', 'Paid orders'), `${this.data.orderCount}`);
              this.metric(I18n.text(this.language, '客单价', 'Avg. order value'), `¥${this.data.avgOrderValue.toFixed(2)}`);
            }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
            Column({ space: 14 }) {
              Text(I18n.text(this.language, '销售趋势', 'Sales trend')).fontSize(17).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
              if (this.data.salesTrend.length === 0) {
                Text(I18n.text(this.language, '暂无趋势数据', 'No trend data')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).height(100);
              } else {
                Row({ space: 7 }) {
                  ForEach(this.data.salesTrend, (point: TrendPoint) => {
                    Column({ space: 6 }) {
                      Blank();
                      Column().width('64%').height(Math.max(4, 112 * point.value / this.maxTrend()))
                        .backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius({ topLeft: 5, topRight: 5 });
                      Text(point.date.slice(5)).fontSize(9).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1);
                    }.height(146).layoutWeight(1).justifyContent(FlexAlign.End);
                  }, (point: TrendPoint) => point.date);
                }.width('100%');
              }
            }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
            Column({ space: 12 }) {
              Text(I18n.text(this.language, '热销商品', 'Top products')).fontSize(17).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
              if (this.data.topProducts.length === 0) Text(I18n.text(this.language, '暂无商品销量', 'No product sales')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
              ForEach(this.data.topProducts, (item: TopProductPoint, index: number) => {
                Row({ space: 10 }) {
                  Text(`${index + 1}`).width(26).fontSize(15).fontWeight(FontWeight.Bold).fontColor(index < 3 ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
                  Text(item.name).fontSize(14).layoutWeight(1).maxLines(1);
                  Text(`${item.sales}`).fontSize(14).fontWeight(FontWeight.Medium);
                }.width('100%');
              }, (item: TopProductPoint) => item.productId);
            }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
            Column({ space: 12 }) {
              Text(I18n.text(this.language, '品类销售', 'Sales by category')).fontSize(17).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
              ForEach(this.data.categoryBars, (item: CategoryBar) => {
                Row({ space: 10 }) {
                  Text(item.category).fontSize(13).width(80).maxLines(1);
                  Progress({ value: item.sales, total: Math.max(1, this.data?.totalSales || 1), type: ProgressType.Linear })
                    .color(DesignTokens.brand(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode)).layoutWeight(1);
                  Text(`¥${item.sales.toFixed(0)}`).fontSize(12).width(62).textAlign(TextAlign.End);
                }.width('100%');
              }, (item: CategoryBar) => item.category);
            }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
          }.width('100%').padding({
            left: this.windowWidth >= 720 ? 24 : 16,
            right: this.windowWidth >= 720 ? 24 : 16,
            bottom: this.windowWidth >= 720 ? 28 : PrimaryNavigationMetrics.contentInset(this.safeBottom)
          });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
      IBestCalendarDialog({
        visible: $calendarVisible,
        value: $customDate,
        type: 'primary',
        selectedColor: DesignTokens.brand(this.darkMode),
        minDate: new Date(2020, 0, 1),
        maxDate: new Date(),
        onConfirm: (values: IBestCalendarConfirmResult[]): void => {
          if (values.length > 0) {
            this.selectDate(values[0].dateStr);
          }
        }
      });
    }.width('100%').height('100%');
  }
}
