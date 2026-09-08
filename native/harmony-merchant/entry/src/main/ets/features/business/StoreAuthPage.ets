import {
  IBestButton, IBestCheckbox, IBestCheckboxGroup, IBestField, IBestNavBar, IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { CategoryItem } from '../product/ProductModels';
import { ProductRepository } from '../product/ProductRepository';
import { ProductPolicy, StoreAuthConfig } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function StoreAuthBuilder(_: string, raw: Object) {
  StoreAuthPage({ params: raw as IdRouteParams });
}

@Component
struct StoreAuthPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private level: string = 'C';
  @State private tiers: string[] = ['retail'];
  @State private policies: ProductPolicy[] = [];
  @State private validFrom: string = '';
  @State private validTo: string = '';
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  private readonly tierGroup: string = 'store-price-tiers';

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    try {
      const data = await BusinessRepository.storeAuth(this.params.id);
      const categories = await ProductRepository.platformCategories();
      this.level = data.level;
      this.tiers = data.visiblePriceTiers || [];
      this.validFrom = data.authValidFrom ? data.authValidFrom.slice(0, 10) : '';
      this.validTo = data.authValidTo ? data.authValidTo.slice(0, 10) : '';
      const existing = data.productPolicies || [];
      this.policies = categories.filter((item: CategoryItem): boolean => !item.parentId)
        .map((item: CategoryItem): ProductPolicy => {
          const current = existing.find((policy: ProductPolicy): boolean => policy.categoryId === item.id);
          return {
            categoryId: item.id,
            categoryName: item.name,
            enabled: current?.enabled || false,
            markupPercent: current?.markupPercent ?? 15
          };
        });
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '授权信息加载失败', 'Failed to load authorisation'));
    } finally {
      this.loading = false;
    }
  }

  private selectLevel(level: string): void {
    this.level = level;
    this.tiers = level === 'A' ? ['wholesale', 'retail'] : ['retail'];
  }

  private togglePolicy(categoryId: string, enabled: boolean): void {
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => {
      if (item.categoryId === categoryId) item.enabled = enabled;
      return item;
    });
  }

  private adjustPolicy(categoryId: string, delta: number): void {
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => {
      if (item.categoryId === categoryId) {
        item.markupPercent = Math.max(0, Math.min(100, item.markupPercent + delta));
      }
      return item;
    });
  }

  private selectAll(): void {
    const target = this.policies.some((item: ProductPolicy): boolean => !item.enabled);
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => {
      item.enabled = target;
      return item;
    });
  }

  private enabledCount(): number {
    return this.policies.filter((item: ProductPolicy): boolean => item.enabled).length;
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    if (this.tiers.length === 0) {
      IBestToast.show(I18n.text(this.language, '请至少选择一种可见价格', 'Select at least one visible price tier'));
      return;
    }
    if (!this.validFrom || !this.validTo || this.validTo < this.validFrom) {
      IBestToast.show(I18n.text(this.language, '请填写正确的授权有效期', 'Enter a valid authorisation period'));
      return;
    }
    const body: StoreAuthConfig = {
      storeId: this.params.id,
      level: this.level,
      visiblePriceTiers: this.tiers,
      productPolicies: this.policies,
      authValidFrom: this.validFrom,
      authValidTo: this.validTo
    };
    this.saving = true;
    try {
      await BusinessRepository.saveStoreAuth(this.params.id, body);
      IBestToast.show(I18n.text(this.language, '门店授权已保存', 'Store authorisation saved'));
      AppRouter.back();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.saving = false;
    }
  }

  @Builder
  private levelCard(value: string, title: string, description: string) {
    Row({ space: 12 }) {
      Text(value).fontSize(17).fontWeight(FontWeight.Bold).fontColor(this.level === value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.brand(this.darkMode))
        .width(42).height(42).textAlign(TextAlign.Center).backgroundColor(this.level === value ? DesignTokens.brand(this.darkMode) : DesignTokens.selectedSurface(this.darkMode))
        .borderRadius(12);
      Column({ space: 4 }) {
        Text(title).fontSize(15).fontWeight(FontWeight.Medium);
        Text(description).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      if (this.level === value) MerchantIcon({ name: 'success', color: DesignTokens.brand(this.darkMode), iconSize: 18 });
    }.width('100%').padding(12).backgroundColor(this.level === value ? DesignTokens.selectedSurface(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .borderRadius(12).onClick(() => this.selectLevel(value));
  }

  @Builder
  private policyRow(item: ProductPolicy) {
    Column({ space: 10 }) {
      Row() {
        Toggle({ type: ToggleType.Switch, isOn: item.enabled })
          .selectedColor(DesignTokens.brand(this.darkMode)).width(46).height(28)
          .onChange((value: boolean) => this.togglePolicy(item.categoryId, value));
        Text(item.categoryName || I18n.text(this.language, '未命名分类', 'Unnamed category')).fontSize(14).fontColor(item.enabled ? DesignTokens.text(this.darkMode) : DesignTokens.muted(this.darkMode))
          .layoutWeight(1).margin({ left: 10 });
        Text(item.enabled ? I18n.text(this.language, `加价 ${item.markupPercent}%`, `Markup ${item.markupPercent}%`) : I18n.text(this.language, '未启用', 'Disabled'))
          .fontSize(12).fontColor(item.enabled ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
      }.width('100%');
      if (item.enabled) {
        Row({ space: 10 }) {
          IBestButton({ text: '−5%', plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.adjustPolicy(item.categoryId, -5) });
          Text(`${item.markupPercent}%`).fontSize(16).fontWeight(FontWeight.Bold).textAlign(TextAlign.Center).layoutWeight(1);
          IBestButton({ text: '+5%', plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.adjustPolicy(item.categoryId, 5) });
        }.width('100%');
      }
    }.width('100%').padding({ top: 12, bottom: 12 }).border({ width: { bottom: 1 }, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '门店授权', 'Store authorisation'), isShowRight: true, rightLabel: I18n.text(this.language, '保存', 'Save'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back(), onRightClick: () => this.save()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 14 }) {
              Column({ space: 10 }) {
                Text(I18n.text(this.language, '门店等级', 'Store level')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                this.levelCard('A', I18n.text(this.language, 'A 级 · 旗舰', 'Level A · Flagship'), I18n.text(this.language, '所有商品可上架，批发价与零售价', 'All products with wholesale and retail prices'));
                this.levelCard('B', I18n.text(this.language, 'B 级 · 普通', 'Level B · Standard'), I18n.text(this.language, '按授权分类上架，默认零售价', 'Authorised categories with retail pricing'));
                this.levelCard('C', I18n.text(this.language, 'C 级 · 体验', 'Level C · Trial'), I18n.text(this.language, '少量样品，默认零售价', 'Limited samples with retail pricing'));
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              Column({ space: 12 }) {
                Text(I18n.text(this.language, '可见价格', 'Visible prices')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                IBestCheckboxGroup({ activeList: $tiers, group: this.tierGroup, placeDirection: Axis.Vertical }) {
                  IBestCheckbox({ group: this.tierGroup, name: 'retail', label: I18n.text(this.language, '零售价', 'Retail') });
                  IBestCheckbox({ group: this.tierGroup, name: 'wholesale', label: I18n.text(this.language, '批发价', 'Wholesale') });
                  IBestCheckbox({ group: this.tierGroup, name: 'member', label: I18n.text(this.language, '会员价', 'Member') });
                }
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              Column() {
                Row() {
                  Text(I18n.text(this.language, `可上架商品 · ${this.enabledCount()} / ${this.policies.length}`,
                    `Available products · ${this.enabledCount()} / ${this.policies.length}`))
                    .fontSize(17).fontWeight(FontWeight.Bold).layoutWeight(1);
                  Text(this.enabledCount() === this.policies.length ? I18n.text(this.language, '取消全选', 'Clear all') : I18n.text(this.language, '全选', 'Select all'))
                    .fontSize(13).fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.selectAll());
                }.width('100%').padding({ bottom: 6 });
                ForEach(this.policies, (item: ProductPolicy) => { this.policyRow(item); }, (item: ProductPolicy) => item.categoryId);
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              Column({ space: 12 }) {
                Text(I18n.text(this.language, '授权有效期', 'Authorisation period')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                IBestField({ value: $validFrom, label: I18n.text(this.language, '开始日期', 'Start date'), placeholder: 'YYYY-MM-DD' });
                IBestField({ value: $validTo, label: I18n.text(this.language, '结束日期', 'End date'), placeholder: 'YYYY-MM-DD' });
                Text(I18n.text(this.language, '授权到期后门店自动失去商品和价格查看权限。', 'Product and price access ends automatically when authorisation expires.')).fontSize(11)
                  .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              IBestButton({
                text: I18n.text(this.language, '保存授权', 'Save authorisation'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%',
                loading: this.saving, disabled: this.saving, onBtnClick: () => this.save()
              });
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
