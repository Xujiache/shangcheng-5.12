import {
  IBestButton, IBestEmpty, IBestField, IBestNavBar, IBestSwitch, IBestToast
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
  private loaded: boolean = false;
  private dirty: boolean = false;
  private saveTimer: number = -1;

  aboutToAppear(): void { this.load(); }

  aboutToDisappear(): void {
    if (this.saveTimer >= 0) {
      clearTimeout(this.saveTimer);
      this.saveTimer = -1;
    }
    if (this.dirty) this.save(false);
  }

  private async load(): Promise<void> {
    this.loaded = false;
    this.loading = true;
    try {
      const result = await BusinessRepository.commissionRules();
      this.first = `${result.default.level1Percent}`;
      this.second = `${result.default.level2Percent}`;
      this.visible = result.default.visibleToPromoter;
      this.allowOffline = result.default.allowOffline;
      this.commissionEnabled = result.default.enabled;
      this.productRules = result.productRules;
      const productPage = await ProductRepository.list('', '', 1, 100);
      this.products = productPage.list;
      this.dirty = false;
      this.loaded = true;
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '佣金规则加载失败', 'Failed to load commission rules'));
    } finally {
      this.loading = false;
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
    this.dirty = true;
    if (this.saveTimer >= 0) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout((): void => {
      this.saveTimer = -1;
      this.save(false);
    }, 300);
  }

  private async save(showFeedback: boolean = true): Promise<void> {
    if (this.saving) {
      this.dirty = true;
      return;
    }
    if (!this.validateRates(this.first, this.second)) {
      if (showFeedback) IBestToast.show(I18n.text(this.language, '佣金比例必须为0至100，两级合计不得超过100', 'Commission rates must be 0–100 and the two levels cannot exceed 100 in total'));
      return;
    }
    const body: CommissionRuleBundle = {
      default: {
        level1Percent: Number(this.first), level2Percent: Number(this.second),
        visibleToPromoter: this.visible, allowOffline: this.allowOffline, enabled: this.commissionEnabled
      },
      productRules: this.productRules
    };
    this.dirty = false;
    this.saving = true;
    let failed = false;
    try {
      await BusinessRepository.saveCommissionRules(body);
      if (showFeedback) IBestToast.show(I18n.text(this.language, '佣金规则已保存', 'Commission rules saved'));
    } catch (error) {
      this.dirty = true;
      failed = true;
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.saving = false;
      if (this.dirty && this.loaded && !failed) this.scheduleSave();
    }
  }

  private openRule(item?: ProductCommissionRule): void {
    this.editProductId = item?.productId || '';
    this.ruleFirst = `${item?.level1Percent ?? Number(this.first)}`;
    this.ruleSecond = `${item?.level2Percent ?? Number(this.second)}`;
    this.editorVisible = true;
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
        Image(item.productImage).width(48).height(48).objectFit(ImageFit.Cover).borderRadius(9);
      } else {
        Column().width(48).height(48).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(9);
      }
      Column({ space: 5 }) {
        Text(item.productName || I18n.text(this.language, '未命名商品', 'Unnamed product')).fontSize(14).fontWeight(FontWeight.Medium).maxLines(1);
        Text(I18n.text(this.language, `一级 ${item.level1Percent}% · 二级 ${item.level2Percent}%`,
          `Level 1 ${item.level1Percent}% · Level 2 ${item.level2Percent}%`))
          .fontSize(12).fontColor(DesignTokens.brand(this.darkMode));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      IBestButton({ text: I18n.text(this.language, '编辑', 'Edit'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openRule(item) });
      IBestButton({ text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', onBtnClick: () => this.removeRule(item.productId) });
    }.width('100%').padding({ top: 10, bottom: 10 }).border({ width: { bottom: 1 }, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private ruleEditor() {
    Column({ space: 13 }) {
      Row() {
        Text(this.editProductId ? I18n.text(this.language, '商品独立佣金', 'Product commission') : I18n.text(this.language, '添加商品规则', 'Add product rule')).fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
        Text(I18n.text(this.language, '关闭', 'Close')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).onClick(() => this.editorVisible = false);
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
                  if (item.images.length > 0) Image(item.images[0]).width(40).height(40).borderRadius(8).objectFit(ImageFit.Cover);
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
      IBestButton({ text: I18n.text(this.language, '应用规则', 'Apply rule'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%', onBtnClick: () => this.saveRule() });
    }.width('100%').padding({ left: 20, right: 20, top: 20, bottom: this.safeBottom + 20 });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '佣金设置', 'Commission settings'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 14 }) {
              Column({ space: 12 }) {
                Text(I18n.text(this.language, '默认分佣规则', 'Default commission rule')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                IBestField({ value: $first, label: I18n.text(this.language, '一级佣金', 'Level 1 commission'), suffix: '%', type: 'decimal', onChange: () => this.scheduleSave() });
                IBestField({ value: $second, label: I18n.text(this.language, '二级佣金', 'Level 2 commission'), suffix: '%', type: 'decimal', onChange: () => this.scheduleSave() });
                Row() { Text(I18n.text(this.language, '启用分佣', 'Enable commission')).layoutWeight(1); IBestSwitch({ value: $commissionEnabled, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
                Row() { Text(I18n.text(this.language, '向推广员显示比例', 'Show rates to promoters')).layoutWeight(1); IBestSwitch({ value: $visible, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
                Row() { Text(I18n.text(this.language, '允许线下结算', 'Allow offline settlement')).layoutWeight(1); IBestSwitch({ value: $allowOffline, activeColor: DesignTokens.brand(this.darkMode), onChange: () => this.scheduleSave() }); }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              Column({ space: 8 }) {
                Row() {
                  Text(I18n.text(this.language, `商品独立规则 · ${this.productRules.length}`, `Product rules · ${this.productRules.length}`)).fontSize(18).fontWeight(FontWeight.Bold).layoutWeight(1);
                  IBestButton({ text: I18n.text(this.language, '添加', 'Add'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openRule() });
                }.width('100%');
                if (this.productRules.length === 0) {
                  Text(I18n.text(this.language, '暂无独立规则，全部使用默认比例', 'No custom rules; all products use the default rates')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                }
                ForEach(this.productRules, (item: ProductCommissionRule) => { this.ruleCard(item); }, (item: ProductCommissionRule) => item.productId);
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              Text(I18n.text(this.language, '修改后会自动保存到服务端，也可点击下方按钮立即同步。',
                'Changes are saved automatically. You can also sync immediately below.'))
                .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              IBestButton({
                text: I18n.text(this.language, '保存设置', 'Save settings'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                btnWidth: '100%', loading: this.saving, onBtnClick: () => this.save(true)
              });
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
        .bindSheet(this.editorVisible, this.ruleEditor(), {
          height: SheetSize.MEDIUM,
          onWillDismiss: () => { this.editorVisible = false; }
        });
    }.hideTitleBar(true);
  }
}
