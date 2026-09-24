import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { LeaveGuard } from '../../core/ui/LeaveGuard';
import { PageReadScope, SecondaryPolicy } from '../../core/ui/SecondaryPolicy';
import { SecondaryFeedback, SecondaryHeader, SecondarySaveBar } from '../../core/ui/SecondaryPage';
import {
  IBestButton, IBestEmpty, IBestField, IBestSwitch, IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { ProductSummary } from '../product/ProductModels';
import { ProductRepository } from '../product/ProductRepository';
import { CommissionRuleBundle, ProductCommissionRule } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function CommissionBuilder(_: string) { CommissionPage(); }

@Component
struct CommissionPage {
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @State private verifying: boolean = false;
  private handleBack(): void {
    if (this.editorVisible) { this.closeLocalEditor(); return; }

    this.leaveGuard.request(this.language, this.saving, this.dirty, () => AppRouter.back());
  }

  private editStamp: string = '';
  private localStamp(): string { return JSON.stringify([this.editProductId, this.ruleFirst, this.ruleSecond]); }
  private closeLocalEditor(): void {
    this.leaveGuard.request(this.language, this.saving, this.localStamp() !== this.editStamp, () => { this.editorVisible = false; });
  }

  private leaveGuard: LeaveGuard = new LeaveGuard();
  private pageScope: PageReadScope = new PageReadScope();
  @State private pageError: string = '';

  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private first: string = '0';
  @State private second: string = '0';
  @State private visible: boolean = true;
  @State private allowOffline: boolean = false;
  @State private commissionEnabled: boolean = false;
  @State private productRules: ProductCommissionRule[] = [];
  @State private products: ProductSummary[] = [];
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  @State private editorVisible: boolean = false;
  @State private editProductId: string = '';
  @State private ruleFirst: string = '0';
  @State private ruleSecond: string = '0';
  @State private loaded: boolean = false;
  @State private dirty: boolean = false;
  private savedRules: string = '';

  aboutToAppear(): void { this.pageScope.open(); this.load(); }

  aboutToDisappear(): void { this.pageScope.dispose();}

  private async load(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('load');
    this.pageError = '';
    this.loading = true;
    try {
      const result = await this.pageScope.read(BusinessRepository.commissionRules(), pageTicket);
      if (!result.default || !Array.isArray(result.productRules)) throw new Error('invalid-commission');
      this.savedRules = JSON.stringify([`${result.default.level1Percent}`, `${result.default.level2Percent}`,
        result.default.visibleToPromoter, result.default.allowOffline, result.default.enabled, result.productRules]);
      if (!this.dirty) {
        this.first = `${result.default.level1Percent}`; this.second = `${result.default.level2Percent}`;
        this.visible = result.default.visibleToPromoter; this.allowOffline = result.default.allowOffline;
        this.commissionEnabled = result.default.enabled; this.productRules = result.productRules;
      }
      this.loaded = true; this.verifying = false; this.dirty = this.fingerprint() !== this.savedRules;
      const productPage = await this.pageScope.read(ProductRepository.list('', '', 1, 100), pageTicket);
      if (!Array.isArray(productPage.list)) throw new Error('invalid-products');
      this.products = productPage.list;
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '佣金规则加载失败', 'Failed to load commission rules'));
    } finally {
      if (this.pageScope.accepts(pageTicket)) {
      this.loading = false;
    }
    }
  }

  private validateRates(level1: string, level2: string): boolean {
    const first = Number(level1);
    const second = Number(level2);
    return Number.isFinite(first) && Number.isFinite(second) && first >= 0 && second >= 0 &&
      first <= 100 && second <= 100 && first + second <= 100;
  }

  private scheduleSave(): void {
    if (!this.loaded) return;
    this.dirty = this.fingerprint() !== this.savedRules;
  }
  private fingerprint(): string {
    return JSON.stringify([this.first, this.second, this.visible, this.allowOffline, this.commissionEnabled, this.productRules]);
  }

  private async save(showFeedback: boolean = true): Promise<void> {
    if (this.saving) { return; }
    if (!this.loaded || !this.dirty || this.verifying || this.loading) return;
    if (!this.pageScope.isCurrent()) return;
    const writeTicket = this.pageScope.begin('save');
    if (!this.validateRates(this.first, this.second)) {
      IBestToast.show(I18n.text(this.language, '佣金比例须为0至100，两级合计不超过100', 'Rates must be 0–100; combined rates cannot exceed 100'));
      return;
    }
    const submitted = this.fingerprint();
    const body: CommissionRuleBundle = {
      default: { level1Percent: Number(this.first), level2Percent: Number(this.second), visibleToPromoter: this.visible, allowOffline: this.allowOffline, enabled: this.commissionEnabled },
      productRules: this.productRules.map((rule: ProductCommissionRule): ProductCommissionRule => ({ productId: rule.productId, productName: rule.productName, productImage: rule.productImage, level1Percent: rule.level1Percent, level2Percent: rule.level2Percent }))
    };
    this.saving = true;
    try {
      await BusinessRepository.saveCommissionRules(body);
      if (!this.pageScope.accepts(writeTicket)) return;
      this.savedRules = submitted; this.dirty = this.fingerprint() !== submitted;
      if (showFeedback) IBestToast.show(I18n.text(this.language, '佣金规则已保存', 'Commission rules saved'));
    } catch (error) {
      if (!this.pageScope.accepts(writeTicket)) return;
      this.verifying = true;
      await this.load();
      IBestToast.show(I18n.text(this.language, '保存未确认，草稿已保留，请重新读取核对。', 'Save was not confirmed. The draft is kept; reload to verify.'));
    } finally { if (this.pageScope.accepts(writeTicket)) this.saving = false; }
  }

  private openRule(item?: ProductCommissionRule): void {
    this.editProductId = item?.productId || '';
    this.ruleFirst = `${item?.level1Percent ?? Number(this.first)}`;
    this.ruleSecond = `${item?.level2Percent ?? Number(this.second)}`;
    this.editStamp = this.localStamp(); this.editorVisible = true;
  }

  private chooseProduct(id: string): void {
    if (this.productRules.some((item: ProductCommissionRule): boolean => item.productId === id)) {
      IBestToast.show(I18n.text(this.language, '该商品已经有独立规则', 'This product already has a custom rule'));
      return;
    }
    this.editProductId = id;
  }

  private saveRule(): void {
    if (!this.editProductId) {
      IBestToast.show(I18n.text(this.language, '请选择商品', 'Select a product'));
      return;
    }
    if (!this.validateRates(this.ruleFirst, this.ruleSecond)) {
      IBestToast.show(I18n.text(this.language, '两级佣金合计不得超过100%', 'The two commission levels cannot exceed 100% in total'));
      return;
    }
    const product = this.products.find((item: ProductSummary): boolean => item.id === this.editProductId);
    const existing = this.productRules.find((item: ProductCommissionRule): boolean => item.productId === this.editProductId);
    const rule: ProductCommissionRule = {
      productId: this.editProductId,
      productName: product?.name || existing?.productName || '',
      productImage: product?.images?.[0] || existing?.productImage || '',
      level1Percent: Number(this.ruleFirst),
      level2Percent: Number(this.ruleSecond)
    };
    const without = this.productRules.filter((item: ProductCommissionRule): boolean => item.productId !== this.editProductId);
    this.productRules = without.concat([rule]);
    this.editorVisible = false;
    this.scheduleSave();
  }

  private removeRule(id: string): void {
    this.productRules = this.productRules.filter((item: ProductCommissionRule): boolean => item.productId !== id);
    this.scheduleSave();
  }

  private selectedProductName(): string {
    const product = this.products.find((item: ProductSummary): boolean => item.id === this.editProductId);
    const rule = this.productRules.find((item: ProductCommissionRule): boolean => item.productId === this.editProductId);
    return product?.name || rule?.productName || I18n.text(this.language, '当前商品', 'Current product');
  }

  @Builder
  private ruleCard(item: ProductCommissionRule) {
    Row({ space: 10 }) {
      if (item.productImage) {
        ResilientRemoteImage({ originalUrl: item.productImage, widthValue: 48, heightValue: 48, radius: 9 });
      } else {
        Column().width(48).height(48).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(9);
      }
      Column({ space: 5 }) {
        Text(item.productName || I18n.text(this.language, '未命名商品', 'Unnamed product')).fontSize(14).fontWeight(FontWeight.Medium).maxLines(1);
        Text(I18n.text(this.language, `一级 ${item.level1Percent}% · 二级 ${item.level2Percent}%`,
          `Level 1 ${item.level1Percent}% · Level 2 ${item.level2Percent}%`))
          .fontSize(12).fontColor(DesignTokens.brand(this.darkMode));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      IBestButton({ btnHeight: 44, text: I18n.text(this.language, '编辑', 'Edit'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openRule(item) });
      IBestButton({ btnHeight: 44, text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', onBtnClick: () => this.removeRule(item.productId) });
    }.width('100%').padding({ top: 10, bottom: 10 }).border({ width: { bottom: 1 }, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private ruleEditor() {
    Column({ space: 13 }) {
      Row() {
        Text(this.editProductId ? I18n.text(this.language, '商品独立佣金', 'Product commission') : I18n.text(this.language, '添加商品规则', 'Add product rule')).fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
        Text(I18n.text(this.language, '关闭', 'Close')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).onClick(() => this.closeLocalEditor());
      }.width('100%');
      if (!this.editProductId) {
        Text(I18n.text(this.language, '选择商品', 'Select a product')).fontSize(14).fontWeight(FontWeight.Medium).width('100%');
        if (this.products.length === 0) {
          IBestEmpty({ description: I18n.text(this.language, '暂无可配置商品', 'No configurable products') });
        } else {
          Scroll() {
            Column({ space: 8 }) {
              ForEach(this.products, (item: ProductSummary) => {
                Row({ space: 9 }) {
                  if ((item.images || []).length > 0) ResilientRemoteImage({ originalUrl: item.images[0], widthValue: 40, heightValue: 40, radius: 8 });
                  Text(item.name).fontSize(13).maxLines(1).layoutWeight(1);
                  Text(this.productRules.some((rule: ProductCommissionRule): boolean => rule.productId === item.id)
                    ? I18n.text(this.language, '已配置', 'Configured') : I18n.text(this.language, '选择', 'Select'))
                    .fontSize(12).fontColor(DesignTokens.brand(this.darkMode));
                }.width('100%').padding(8).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10).onClick(() => this.chooseProduct(item.id));
              }, (item: ProductSummary) => item.id);
            }.width('100%');
          }.height(190).scrollBar(BarState.Off);
        }
      } else {
        Text(this.selectedProductName())
          .fontSize(14).fontWeight(FontWeight.Medium).width('100%');
      }
      IBestField({ value: $ruleFirst, label: I18n.text(this.language, '一级佣金', 'Level 1 commission'), suffix: '%', type: 'decimal' });
      IBestField({ value: $ruleSecond, label: I18n.text(this.language, '二级佣金', 'Level 2 commission'), suffix: '%', type: 'decimal' });
      IBestButton({ btnHeight: 44, text: I18n.text(this.language, '应用规则', 'Apply rule'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%', onBtnClick: () => this.saveRule() });
    }.width('100%').padding({ left: 16, right: 16, top: 20, bottom: 12 });
  }

  build() {
    NavDestination() {
      Column() {
        SecondaryHeader({
          title: I18n.text(this.language, '佣金设置', 'Commission settings'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => this.handleBack()
        });
          SecondaryFeedback({ errorKind: this.pageError, updating: this.loading, onRetry: () => this.load() });
        if (this.loading && !this.loaded) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            GridRow({ columns: this.windowWidth >= 720 ? 2 : 1, gutter: 12 }) {
              GridCol() {
                Column({ space: 12 }) {
                  Text(I18n.text(this.language, '默认分佣规则', 'Default commission rule')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                  IBestField({ value: $first, label: I18n.text(this.language, '一级佣金', 'Level 1 commission'), suffix: '%', type: 'decimal', onChange: () => this.scheduleSave() });
                  IBestField({ value: $second, label: I18n.text(this.language, '二级佣金', 'Level 2 commission'), suffix: '%', type: 'decimal', onChange: () => this.scheduleSave() });
                  Row() { Text(I18n.text(this.language, '启用分佣', 'Enable commission')).layoutWeight(1); IBestSwitch({ value: $commissionEnabled, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
                  Row() { Text(I18n.text(this.language, '向推广员显示比例', 'Show rates to promoters')).layoutWeight(1); IBestSwitch({ value: $visible, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
                  Row() { Text(I18n.text(this.language, '允许线下结算', 'Allow offline settlement')).layoutWeight(1); IBestSwitch({ value: $allowOffline, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 8 }) {
                  Row() {
                    Text(I18n.text(this.language, `商品独立规则 · ${this.productRules.length}`, `Product rules · ${this.productRules.length}`)).fontSize(18).fontWeight(FontWeight.Bold).layoutWeight(1);
                    IBestButton({ btnHeight: 44, text: I18n.text(this.language, '添加', 'Add'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openRule() });
                  }.width('100%');
                  if (this.productRules.length === 0) {
                    Text(I18n.text(this.language, '暂无独立规则，全部使用默认比例', 'No custom rules; all products use the default rates')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  }
                  ForEach(this.productRules, (item: ProductCommissionRule) => { this.ruleCard(item); }, (item: ProductCommissionRule) => item.productId);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Text(I18n.text(this.language, '修改仅保留在当前草稿，点击下方保存后生效。',
                  'Edits remain in this draft until you save.'))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              }
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 12 });
          }.enabled(this.loaded && !this.saving && !this.loading).layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
          SecondarySaveBar({ saving: this.saving, canSave: this.loaded && this.dirty && !this.verifying && !this.loading, changed: this.dirty, onSave: () => this.save() });
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
        .bindSheet(this.editorVisible, this.ruleEditor(), {
          height: '85%',
          onWillDismiss: () => { this.closeLocalEditor(); }
        });
    }.hideTitleBar(true).onBackPressed((): boolean => { this.handleBack(); return true; });
  }
}
