import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { MerchantAnalytics, AnalyticsProduct, AnalyticsCategory } from './StatsModels';
import { StatsPolicy } from './StatsPolicy';

@Component
export struct StatsMetric {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop value: string = '';
  @Prop highlight: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column({ space: 6 }) {
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
      Text(this.value).fontSize(22).fontWeight(FontWeight.Bold).wordBreak(WordBreak.BREAK_ALL)
        .fontColor(this.highlight ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode));
    }.width('100%').alignItems(HorizontalAlign.Start);
  }
}

@Component
export struct StatsRanking {
  @Require @Prop data: MerchantAnalytics;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private category: boolean = false;
  @State private productsExpanded: boolean = false;
  @State private categoriesExpanded: boolean = false;
  @Builder private row(name: string, quantity: number, index: number) {
    Row({ space: 10 }) {
      Text(`${index + 1}`).width(22).fontSize(14).fontWeight(FontWeight.Medium).fontColor(index < 3 ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
      Column({ space: 6 }) {
        Row({ space: 8 }) {
          Text(name).fontSize(14).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
          Text(I18n.text(this.language, `${quantity} 件`, `${quantity} units`)).fontSize(14).fontWeight(FontWeight.Medium)
            .fontColor(DesignTokens.text(this.darkMode)).textAlign(TextAlign.End).constraintSize({ maxWidth: '42%' });
        }.width('100%');
        Row({ space: 8 }) {
          Progress({ value: quantity, total: Math.max(1, this.data.totalQuantity), type: ProgressType.Linear }).layoutWeight(1)
            .color(DesignTokens.brand(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode)).style({ strokeWidth: 3 });
          Text(StatsPolicy.percent(quantity, this.data.totalQuantity)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%');
      }.layoutWeight(1);
    }.width('100%').constraintSize({ minHeight: 58 }).padding({ top: 8, bottom: 8 });
  }
  build() {
    Column({ space: 4 }) {
      Row({ space: 8 }) {
        Button(I18n.text(this.language, '热销商品', 'Top products'), { type: ButtonType.Normal }).height(44).layoutWeight(1).fontSize(14)
          .borderRadius(10).backgroundColor(this.category ? Color.Transparent : DesignTokens.brandTint(this.darkMode))
          .fontColor(this.category ? DesignTokens.muted(this.darkMode) : DesignTokens.brand(this.darkMode)).onClick(() => { this.category = false; });
        Button(I18n.text(this.language, '品类销量', 'Categories'), { type: ButtonType.Normal }).height(44).layoutWeight(1).fontSize(14)
          .borderRadius(10).backgroundColor(this.category ? DesignTokens.brandTint(this.darkMode) : Color.Transparent)
          .fontColor(this.category ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode)).onClick(() => { this.category = true; });
      }.width('100%');
      Text(I18n.text(this.language, `购买数量 ${this.data.totalQuantity} 件 · 占全部销量`, `${this.data.totalQuantity} purchased units · Share of all units`))
        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%').padding({ top: 8, bottom: 4 });
      if (this.category) {
        ForEach(this.data.categories.slice(0, this.categoriesExpanded ? this.data.categories.length : 5), (item: AnalyticsCategory, index: number) => {
          this.row(item.categoryId ? item.name : I18n.text(this.language, '未分类', 'Uncategorized'), item.quantity, index);
        }, (item: AnalyticsCategory, index: number) => `${this.language}-${index}-${JSON.stringify(item)}`);
      } else {
        ForEach(this.data.topProducts.slice(0, this.productsExpanded ? this.data.topProducts.length : 5), (item: AnalyticsProduct, index: number) => {
          this.row(item.name, item.quantity, index);
        }, (item: AnalyticsProduct, index: number) => `${this.language}-${index}-${JSON.stringify(item)}`);
      }
      if (!(this.category ? this.data.categories.length : this.data.topProducts.length)) {
        Column({ space: 8 }) {
          MerchantIcon({ name: 'bar-chart-o', iconSize: 32, color: DesignTokens.muted(this.darkMode) });
          Text(I18n.text(this.language, '本期暂无销量', 'No unit sales in this period')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%').padding({ top: 24, bottom: 24 });
      }
      if ((this.category ? this.data.categories.length : this.data.topProducts.length) > 5) {
        Button((this.category ? this.categoriesExpanded : this.productsExpanded) ? I18n.text(this.language, '收起排行', 'Show less')
          : this.category ? I18n.text(this.language, '展开全部品类', 'Show all categories') : I18n.text(this.language, '展开全部商品', 'Show all products'), { type: ButtonType.Normal })
          .height(44).width('100%').fontSize(13).backgroundColor(Color.Transparent).fontColor(DesignTokens.brand(this.darkMode))
          .onClick(() => { if (this.category) this.categoriesExpanded = !this.categoriesExpanded; else this.productsExpanded = !this.productsExpanded; });
      }
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
}
