import { LeaveGuard } from '../../core/ui/LeaveGuard';
import { PageReadScope, SecondaryPolicy } from '../../core/ui/SecondaryPolicy';
import { SecondaryFeedback, SecondaryHeader, SecondarySaveBar } from '../../core/ui/SecondaryPage';
import {
  IBestButton, IBestCheckbox, IBestCheckboxGroup, IBestField, IBestToast
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
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @State private verifying: boolean = false;
  private handleBack(): void {


    this.leaveGuard.request(this.language, this.saving, this.editorReady && this.formStamp() !== this.loadedStamp, () => AppRouter.back());
  }

  private leaveGuard: LeaveGuard = new LeaveGuard();
  @State private editorReady: boolean = false;
  private loadedStamp: string = '';
  private formStamp(): string { return JSON.stringify([this.level, this.tiers, this.policies, this.validFrom, this.validTo]); }

  aboutToDisappear(): void { this.pageScope.dispose(); }

  private pageScope: PageReadScope = new PageReadScope();
  @State private pageError: string = '';

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

  aboutToAppear(): void { this.pageScope.open(); this.load(); }

  private async load(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('load');
    this.loading = true;
    this.pageError = '';
    try {
      const data = await this.pageScope.read(BusinessRepository.storeAuth(this.params.id), pageTicket);
      const categories = await this.pageScope.read(ProductRepository.platformCategories(), pageTicket);
      if (!Array.isArray(categories) || !Array.isArray(data.visiblePriceTiers)) throw new Error('invalid-authorisation');
      const keepDraft = this.editorReady && this.formStamp() !== this.loadedStamp;
      const nextPolicies = categories.filter((item: CategoryItem): boolean => !item.parentId).map((item: CategoryItem): ProductPolicy => {
        const current = (data.productPolicies || []).find((policy: ProductPolicy): boolean => policy.categoryId === item.id);
        return { categoryId: item.id, categoryName: item.name, enabled: current?.enabled || false, markupPercent: current?.markupPercent ?? 15 };
      });
      this.loadedStamp = JSON.stringify([data.level, data.visiblePriceTiers, nextPolicies, data.authValidFrom?.slice(0, 10) || '', data.authValidTo?.slice(0, 10) || '']);
      if (!keepDraft) {
      this.level = data.level;
      this.tiers = data.visiblePriceTiers.slice();
      this.validFrom = data.authValidFrom ? data.authValidFrom.slice(0, 10) : '';
      this.validTo = data.authValidTo ? data.authValidTo.slice(0, 10) : '';
      this.policies = nextPolicies;
      }
      this.editorReady = true; this.verifying = false;
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '授权信息加载失败', 'Failed to load authorisation'));
    } finally {
      if (this.pageScope.accepts(pageTicket)) {
      this.loading = false;
    }
    }
  }

  private selectLevel(level: string): void {
    this.level = level;
    this.tiers = level === 'A' ? ['wholesale', 'retail'] : ['retail'];
  }

  private togglePolicy(categoryId: string, enabled: boolean): void {
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => ({ categoryId: item.categoryId, categoryName: item.categoryName,
      enabled: item.categoryId === categoryId ? enabled : item.enabled, markupPercent: item.markupPercent }));
  }

  private adjustPolicy(categoryId: string, delta: number): void {
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => ({ categoryId: item.categoryId, categoryName: item.categoryName,
      enabled: item.enabled, markupPercent: item.categoryId === categoryId ? Math.max(0, Math.min(100, item.markupPercent + delta)) : item.markupPercent }));
  }

  private selectAll(): void {
    const target = this.policies.some((item: ProductPolicy): boolean => !item.enabled);
    this.policies = this.policies.map((item: ProductPolicy): ProductPolicy => ({ categoryId: item.categoryId, categoryName: item.categoryName,
      enabled: target, markupPercent: item.markupPercent }));
  }

  private enabledCount(): number {
    return this.policies.filter((item: ProductPolicy): boolean => item.enabled).length;
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    if (!this.editorReady || this.loading || this.verifying) return;
    if (!this.pageScope.isCurrent()) return;
    const writeTicket = this.pageScope.begin('save');
    if (this.tiers.length === 0) {
      IBestToast.show(I18n.text(this.language, '请至少选择一种可见价格', 'Select at least one visible price tier'));
      return;
    }
    if (!SecondaryPolicy.validBusinessDate(this.validFrom) || !SecondaryPolicy.validBusinessDate(this.validTo) || this.validTo < this.validFrom) {
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
    const submittedStamp = this.formStamp();
    this.saving = true;
    try {
      await BusinessRepository.saveStoreAuth(this.params.id, body);
      if (!this.pageScope.accepts(writeTicket)) return;
      this.loadedStamp = submittedStamp;
      IBestToast.show(I18n.text(this.language, '门店授权已保存', 'Store authorisation saved'));
      AppRouter.back();
    } catch (error) {
      if (!this.pageScope.accepts(writeTicket)) return;
      this.verifying = true;
      await this.load();
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      if (this.pageScope.accepts(writeTicket)) this.saving = false;
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
        Text(description).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
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
          IBestButton({ btnHeight: 44, text: '−5%', plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.adjustPolicy(item.categoryId, -5) });
          Text(`${item.markupPercent}%`).fontSize(16).fontWeight(FontWeight.Bold).textAlign(TextAlign.Center).layoutWeight(1);
          IBestButton({ btnHeight: 44, text: '+5%', plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.adjustPolicy(item.categoryId, 5) });
        }.width('100%');
      }
    }.width('100%').padding({ top: 12, bottom: 12 }).border({ width: { bottom: 1 }, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Column() {
        SecondaryHeader({
          title: I18n.text(this.language, '门店授权', 'Store authorisation'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.handleBack()
        });
          SecondaryFeedback({ errorKind: this.pageError, updating: this.loading, onRetry: () => this.load() });
        if (this.loading && !this.editorReady) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            GridRow({ columns: this.windowWidth >= 720 ? 2 : 1, gutter: 12 }) {
              GridCol() {
                Column({ space: 10 }) {
                  Text(I18n.text(this.language, '门店等级', 'Store level')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                  this.levelCard('A', I18n.text(this.language, 'A 级 · 旗舰', 'Level A · Flagship'), I18n.text(this.language, '所有商品可上架，批发价与零售价', 'All products with wholesale and retail prices'));
                  this.levelCard('B', I18n.text(this.language, 'B 级 · 普通', 'Level B · Standard'), I18n.text(this.language, '按授权分类上架，默认零售价', 'Authorised categories with retail pricing'));
                  this.levelCard('C', I18n.text(this.language, 'C 级 · 体验', 'Level C · Trial'), I18n.text(this.language, '少量样品，默认零售价', 'Limited samples with retail pricing'));
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 12 }) {
                  Text(I18n.text(this.language, '可见价格', 'Visible prices')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                  IBestCheckboxGroup({ activeList: $tiers, group: this.tierGroup, placeDirection: Axis.Vertical }) {
                    IBestCheckbox({ group: this.tierGroup, name: 'retail', label: I18n.text(this.language, '零售价', 'Retail') });
                    IBestCheckbox({ group: this.tierGroup, name: 'wholesale', label: I18n.text(this.language, '批发价', 'Wholesale') });
                    IBestCheckbox({ group: this.tierGroup, name: 'member', label: I18n.text(this.language, '会员价', 'Member') });
                  }
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column() {
                  Row() {
                    Text(I18n.text(this.language, `可上架商品 · ${this.enabledCount()} / ${this.policies.length}`,
                      `Available products · ${this.enabledCount()} / ${this.policies.length}`))
                      .fontSize(17).fontWeight(FontWeight.Bold).layoutWeight(1);
                    Text(this.enabledCount() === this.policies.length ? I18n.text(this.language, '取消全选', 'Clear all') : I18n.text(this.language, '全选', 'Select all'))
                      .fontSize(13).fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.selectAll());
                  }.width('100%').padding({ bottom: 6 });
                  ForEach(this.policies, (item: ProductPolicy) => { this.policyRow(item); }, (item: ProductPolicy) => item.categoryId);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 12 }) {
                  Text(I18n.text(this.language, '授权有效期', 'Authorisation period')).fontSize(17).fontWeight(FontWeight.Bold).width('100%');
                  IBestField({ value: $validFrom, label: I18n.text(this.language, '开始日期', 'Start date'), placeholder: 'YYYY-MM-DD' });
                  IBestField({ value: $validTo, label: I18n.text(this.language, '结束日期', 'End date'), placeholder: 'YYYY-MM-DD' });
                  Text(I18n.text(this.language, '授权到期后门店自动失去商品和价格查看权限。', 'Product and price access ends automatically when authorisation expires.')).fontSize(12)
                    .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 12 });
          }.enabled(this.editorReady && !this.saving && !this.loading).layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
        SecondarySaveBar({ saving: this.saving, changed: this.editorReady && this.formStamp() !== this.loadedStamp,
          canSave: this.editorReady && !this.loading && !this.verifying && this.formStamp() !== this.loadedStamp, onSave: () => this.save() });
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true).onBackPressed((): boolean => { this.handleBack(); return true; });
  }
}
