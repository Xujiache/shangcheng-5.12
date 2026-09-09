import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { StatsPolicy } from './StatsPolicy';
import { StatsSelection, StatsCalendarCell } from './StatsModels';

@Component
export struct StatsDatePanel {
  @Prop selection: StatsSelection = new StatsSelection();
  onApply: (selection: StatsSelection) => void = () => {};
  onClose: () => void = () => {};
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private start: string = '';
  @State private end: string = '';
  @State private month: string = '';
  @State private pickingEnd: boolean = false;
  @State private error: string = '';
  @State private monthPicker: boolean = false;
  @State private browseYear: number = Number(StatsPolicy.today().slice(0, 4));
  private readonly months: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  private readonly weekdaysZh: string[] = ['一', '二', '三', '四', '五', '六', '日'];
  private readonly weekdaysEn: string[] = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  aboutToAppear(): void {
    const range = StatsPolicy.resolve(this.selection);
    this.start = range.startDate; this.end = range.endDate; this.month = range.endDate.slice(0, 7);
    this.browseYear = Number(this.month.slice(0, 4));
  }
  private choose(date: string): void {
    if (!this.pickingEnd) {
      this.start = date; this.end = date; this.pickingEnd = true; this.error = '';
    } else {
      const start = date < this.start ? date : this.start;
      const end = date < this.start ? this.start : date;
      this.error = StatsPolicy.rangeError(start, end);
      if (this.error) return;
      this.start = start; this.end = end; this.pickingEnd = false;
    }
    this.month = date.slice(0, 7);
  }
  private moveMonth(offset: number): void {
    const date = new Date(`${this.month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    const month = date.toISOString().slice(0, 7);
    if (month >= '0001-01' && month <= StatsPolicy.today().slice(0, 7)) this.month = month;
  }
  private apply(): void {
    if (this.error) return;
    this.error = StatsPolicy.rangeError(this.start, this.end);
    if (!this.error) this.onApply(new StatsSelection('custom', this.start, this.end));
  }
  private dayColor(cell: StatsCalendarCell): string {
    if (cell.disabled) return DesignTokens.border(this.darkMode);
    if (cell.date === this.start || cell.date === this.end) return DesignTokens.onBrand(this.darkMode);
    return cell.inMonth ? DesignTokens.text(this.darkMode) : DesignTokens.muted(this.darkMode);
  }
  @Builder private calendar() {
    Column({ space: 6 }) {
      Row() {
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'arrow-left', iconSize: 20, color: DesignTokens.text(this.darkMode) }); }
          .width(44).height(44).backgroundColor(Color.Transparent).enabled(this.month > '0001-01').onClick(() => this.moveMonth(-1))
          .accessibilityText(I18n.text(this.language, '上个月', 'Previous month'));
        Button(this.month, { type: ButtonType.Normal }).height(44).layoutWeight(1).fontSize(16).fontWeight(FontWeight.Medium)
          .backgroundColor(Color.Transparent).fontColor(DesignTokens.text(this.darkMode)).onClick(() => { this.browseYear = Number(this.month.slice(0, 4)); this.monthPicker = true; })
          .accessibilityText(I18n.text(this.language, '选择年月', 'Choose year and month'));
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'arrow', iconSize: 20, color: DesignTokens.text(this.darkMode) }); }
          .width(44).height(44).backgroundColor(Color.Transparent).enabled(this.month < StatsPolicy.today().slice(0, 7)).onClick(() => this.moveMonth(1))
          .accessibilityText(I18n.text(this.language, '下个月', 'Next month'));
      }.width('100%');
      Row() {
        ForEach([0, 1, 2, 3, 4, 5, 6], (index: number) => {
          Text(this.language === 'en-US' ? this.weekdaysEn[index] : this.weekdaysZh[index]).fontSize(12).textAlign(TextAlign.Center)
            .fontColor(DesignTokens.muted(this.darkMode)).height(28).layoutWeight(1);
        }, (index: number) => `${index}:${this.language}`);
      }.width('100%');
      Grid() {
        ForEach(StatsPolicy.calendar(this.month), (cell: StatsCalendarCell) => {
          GridItem() {
            Button(`${cell.day}`, { type: ButtonType.Normal }).width('100%').height(44).fontSize(14).fontColor(this.dayColor(cell))
              .borderRadius(cell.date === this.start || cell.date === this.end ? 10 : 0)
              .backgroundColor(cell.date === this.start || cell.date === this.end ? DesignTokens.brand(this.darkMode)
                : cell.date > this.start && cell.date < this.end ? DesignTokens.brandTint(this.darkMode) : Color.Transparent)
              .enabled(!cell.disabled).onClick(() => this.choose(cell.date)).accessibilityText(cell.date)
              .accessibilitySelected(cell.date >= this.start && cell.date <= this.end);
          }
        }, (cell: StatsCalendarCell) => cell.date);
      }.columnsTemplate('1fr 1fr 1fr 1fr 1fr 1fr 1fr').rowsGap(2).height(274).width('100%');
    }.width('100%');
  }
  @Builder private monthsView() {
    Column({ space: 12 }) {
      Row() {
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'arrow-left', iconSize: 20, color: DesignTokens.text(this.darkMode) }); }.width(44).height(44).fontSize(20).backgroundColor(Color.Transparent)
          .fontColor(DesignTokens.text(this.darkMode)).enabled(this.browseYear > 1).onClick(() => { this.browseYear--; });
        Text(`${this.browseYear}`).fontSize(18).fontWeight(FontWeight.Medium).layoutWeight(1).textAlign(TextAlign.Center).fontColor(DesignTokens.text(this.darkMode));
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'arrow', iconSize: 20, color: DesignTokens.text(this.darkMode) }); }.width(44).height(44).fontSize(20).backgroundColor(Color.Transparent)
          .fontColor(DesignTokens.text(this.darkMode)).enabled(this.browseYear < Number(StatsPolicy.today().slice(0, 4))).onClick(() => { this.browseYear++; });
      }.width('100%');
      Grid() {
        ForEach(this.months, (month: number) => {
          GridItem() {
            Button(I18n.text(this.language, `${month}月`, ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][month - 1]), { type: ButtonType.Normal })
              .height(48).width('100%').fontSize(14).borderRadius(10).fontColor(DesignTokens.text(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode))
              .enabled(`${String(this.browseYear).padStart(4, '0')}-${String(month).padStart(2, '0')}` <= StatsPolicy.today().slice(0, 7))
              .onClick(() => { this.month = `${String(this.browseYear).padStart(4, '0')}-${String(month).padStart(2, '0')}`; this.monthPicker = false; });
          }
        }, (month: number) => `${month}:${this.language}`);
      }.columnsTemplate('1fr 1fr 1fr').columnsGap(10).rowsGap(10).height(232).width('100%');
      Button(I18n.text(this.language, '返回日期选择', 'Back to dates'), { type: ButtonType.Normal }).height(44).width('100%').fontSize(14)
        .backgroundColor(Color.Transparent).fontColor(DesignTokens.brand(this.darkMode)).onClick(() => { this.monthPicker = false; });
    }.width('100%');
  }
  build() {
    Column() {
      Row() {
        Text(I18n.text(this.language, '自定义日期', 'Custom dates')).fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'cross', iconSize: 22, color: DesignTokens.muted(this.darkMode) }); }
          .width(44).height(44).backgroundColor(Color.Transparent).onClick(this.onClose).accessibilityText(I18n.text(this.language, '取消', 'Cancel'));
      }.width('100%').padding({ left: 16, right: 8, top: 8, bottom: 4 });
      Scroll() {
        Column({ space: 10 }) {
          Row({ space: 12 }) {
            Column({ space: 4 }) {
              Text(I18n.text(this.language, '开始日期', 'Start date')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
              Text(this.start).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
            }.layoutWeight(1).padding(12).borderRadius(12).backgroundColor(this.pickingEnd ? DesignTokens.subtle(this.darkMode) : DesignTokens.brandTint(this.darkMode))
              .onClick(() => { this.pickingEnd = false; this.month = this.start.slice(0, 7); }).accessibilitySelected(!this.pickingEnd);
            Column({ space: 4 }) {
              Text(I18n.text(this.language, '结束日期', 'End date')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
              Text(this.end).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
            }.layoutWeight(1).padding(12).borderRadius(12).backgroundColor(this.pickingEnd ? DesignTokens.brandTint(this.darkMode) : DesignTokens.subtle(this.darkMode))
              .onClick(() => { this.pickingEnd = true; this.month = this.end.slice(0, 7); }).accessibilitySelected(this.pickingEnd);
          }.width('100%');
          if (this.monthPicker) this.monthsView(); else this.calendar();
          Text(this.error ? I18n.text(this.language, '日期不合法或超过 366 天，请重新选择。', 'Choose a valid range of at most 366 days.')
            : this.pickingEnd ? I18n.text(this.language, '再点一天选择结束日期；也可直接确认查看单日。', 'Tap an end date, or confirm to view this single day.')
              : I18n.text(this.language, '先选开始，再选结束 · 北京时间 · 最多 366 天', 'Pick start, then end · Beijing time · Up to 366 days'))
            .fontSize(12).lineHeight(18).fontColor(this.error ? DesignTokens.danger(this.darkMode) : DesignTokens.muted(this.darkMode)).width('100%');
        }.width('100%').padding({ left: 16, right: 16, bottom: 12 });
      }.layoutWeight(1).width('100%').align(Alignment.Top).scrollBar(BarState.Off);
      Row({ space: 12 }) {
        Button(I18n.text(this.language, '取消', 'Cancel'), { type: ButtonType.Normal }).height(48).layoutWeight(1).fontSize(14).borderRadius(12)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).onClick(this.onClose);
        Button(I18n.text(this.language, '确认日期', 'Apply dates'), { type: ButtonType.Normal }).height(48).layoutWeight(2).fontSize(14).borderRadius(12)
          .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode)).enabled(!this.error).opacity(this.error ? 0.45 : 1).onClick(() => this.apply());
      }.width('100%').padding({ left: 16, right: 16, top: 10, bottom: this.safeBottom + 12 });
    }.width('100%').height('100%').constraintSize({ maxWidth: 720 }).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius({ topLeft: 22, topRight: 22 }).clip(true);
  }
}
