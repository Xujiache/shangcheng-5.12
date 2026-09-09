import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon, MerchantIconName } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { OrderSummary } from './OrderModels';
import { OrderDetailPolicy, OrderStatusCopy } from './OrderDetailPolicy';

@Component
export struct OrderSectionHeading {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop icon: MerchantIconName = 'orders-o';
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 9 }) {
      MerchantIcon({ name: this.icon, iconSize: 24, color: DesignTokens.brand(this.darkMode) });
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(16).fontWeight(FontWeight.Bold).layoutWeight(1)
        .fontColor(DesignTokens.text(this.darkMode));
    }.width('100%').alignItems(VerticalAlign.Center);
  }
}

@Component
export struct OrderInfoRow {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop value: string = '';
  @Prop emphasis: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 12 }) {
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
      Text(this.value || '—').fontSize(this.emphasis ? 22 : 13).fontWeight(this.emphasis ? FontWeight.Bold : FontWeight.Regular)
        .fontColor(this.emphasis ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode))
        .wordBreak(WordBreak.BREAK_ALL).textAlign(TextAlign.End).layoutWeight(1.6);
    }.width('100%').alignItems(VerticalAlign.Top).padding({ top: 3, bottom: 3 });
  }
}

@Component
export struct OrderShareChoice {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop hintZh: string = '';
  @Prop hintEn: string = '';
  @Link selected: boolean;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 12 }) {
      Column({ space: 4 }) {
        Text(I18n.text(this.language, this.zh, this.en)).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
        Text(I18n.text(this.language, this.hintZh, this.hintEn)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      if (this.selected) MerchantIcon({ name: 'success', iconSize: 23, color: DesignTokens.brand(this.darkMode) });
      else Column().width(21).height(21).borderRadius(8).border({ width: 1, color: DesignTokens.border(this.darkMode) });
    }.width('100%').constraintSize({ minHeight: 56 }).padding({ left: 12, right: 12, top: 8, bottom: 8 }).borderRadius(12)
      .backgroundColor(this.selected ? DesignTokens.brandTint(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .accessibilityChecked(this.selected).onClick(() => { this.selected = !this.selected; });
  }
}

@Component
export struct OrderStatusCard {
  @Require @Prop order: OrderSummary;
  onCopy: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  private copy(): OrderStatusCopy { return OrderDetailPolicy.status(this.order.status); }
  build() {
    Column({ space: 8 }) {
      Row({ space: 12 }) {
        Column({ space: 5 }) {
          Row({ space: 8 }) {
            MerchantIcon({ name: this.copy().icon, iconSize: 28, color: DesignTokens.brand(this.darkMode) });
            Text(I18n.text(this.language, this.copy().zh, this.copy().en)).fontSize(20).fontWeight(FontWeight.Bold)
              .fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
          }.width('100%');
        }.layoutWeight(1.1);
        Column({ space: 4 }) {
          Text(OrderDetailPolicy.amountTitle(this.order, this.language === 'en-US')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          Text(OrderDetailPolicy.money(this.order.payAmount)).fontSize(24).fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.brand(this.darkMode)).wordBreak(WordBreak.BREAK_ALL).textAlign(TextAlign.End).width('100%');
        }.layoutWeight(1.2).alignItems(HorizontalAlign.End);
      }.width('100%').alignItems(VerticalAlign.Center);
      Text(I18n.text(this.language, this.copy().hintZh, this.copy().hintEn)).fontSize(12).lineHeight(18)
        .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      Row({ space: 8 }) {
        Text(this.order.no || '—').fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).wordBreak(WordBreak.BREAK_ALL).layoutWeight(1);
        Button(I18n.text(this.language, '复制单号', 'Copy no.'), { type: ButtonType.Normal }).height(44).fontSize(13).padding({ left: 8, right: 8 })
          .backgroundColor(Color.Transparent).fontColor(DesignTokens.brand(this.darkMode)).onClick(this.onCopy);
      }.width('100%').border({ width: { top: 0.5 }, color: DesignTokens.border(this.darkMode) });
    }.width('100%').padding({ left: 16, right: 16, top: 14, bottom: 4 }).borderRadius(16).backgroundColor(DesignTokens.brandTint(this.darkMode));
  }
}
