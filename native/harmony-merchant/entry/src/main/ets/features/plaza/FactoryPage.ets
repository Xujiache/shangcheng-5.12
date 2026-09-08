import { common } from '@kit.AbilityKit';
import {
  IBestButton, IBestField, IBestImagePreview, IBestNavBar, IBestSwitch, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { PhoneService } from '../../core/device/PhoneService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { AgencyRequest, PlazaFactory, PlazaProduct, PlazaQualification } from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function FactoryDetailBuilder(_: string, raw: Object) {
  FactoryPage({ params: raw as IdRouteParams });
}

@Component
struct FactoryPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private data: PlazaFactory | null = null;
  @State private products: PlazaProduct[] = [];
  @State private loading: boolean = true;
  @State private showAgency: boolean = false;
  @State private markupText: string = '15';
  @State private message: string = '';
  @State private autoSync: boolean = true;
  @State private applying: boolean = false;
  @State private rating: number = 0;
  @State private following: boolean = false;
  @State private ratingSubmitting: boolean = false;
  private routeTimer: number = -1;

  aboutToAppear(): void { this.load(); }

  aboutToDisappear(): void {
    if (this.routeTimer >= 0) clearTimeout(this.routeTimer);
    this.routeTimer = -1;
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const detail = await BusinessRepository.plazaFactory(this.params.id);
      const productPage = await BusinessRepository.plazaProducts('', 1, this.params.id);
      this.data = detail;
      this.products = productPage.list;
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '厂家加载失败', 'Failed to load factory'));
    } finally {
      this.loading = false;
    }
  }

  private contactName(): string {
    return this.data?.contactName || this.data?.contact?.contactName || '';
  }

  private contactPhone(): string {
    return this.data?.contactPhone || this.data?.contact?.phone || '';
  }

  private defaultContactName(): string {
    return I18n.text(this.language, '业务联系人', 'Business contact');
  }

  private unpublishedPhone(): string {
    return I18n.text(this.language, '未公开', 'Not published');
  }

  private async follow(): Promise<void> {
    if (!this.data || this.following) return;
    const next = !this.data.followed;
    this.following = true;
    try {
      await BusinessRepository.followFactory(this.data.id, next);
      this.data.followed = next;
      this.data = this.data;
      IBestToast.show(next ? I18n.text(this.language, '已关注厂家', 'Factory followed') : I18n.text(this.language, '已取消关注', 'Factory unfollowed'));
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '操作失败', 'Operation failed'));
    } finally {
      this.following = false;
    }
  }

  private async rate(score: number): Promise<void> {
    if (!this.data || this.rating > 0 || this.ratingSubmitting) return;
    this.ratingSubmitting = true;
    try {
      const result = await BusinessRepository.rateFactory(this.data.id, score);
      this.data.rating = result.rating;
      this.data.ratingCount = result.ratingCount;
      this.data = this.data;
      this.rating = score;
      IBestToast.show(I18n.text(this.language, '评价已提交', 'Rating submitted'));
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '评价失败', 'Failed to submit rating'));
    } finally {
      this.ratingSubmitting = false;
    }
  }

  private async callFactory(): Promise<void> {
    const phone = this.contactPhone();
    if (!phone) {
      IBestToast.show(I18n.text(this.language, '厂家暂未公开联系电话', 'The factory has not published a phone number'));
      return;
    }
    try {
      await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, phone);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer'));
    }
  }

  private previewQualification(item: PlazaQualification): void {
    if (item.image) IBestImagePreview.show([item.image], { closeOnClickImage: false, closeOnClickOverlay: true });
  }

  private openAgency(): void {
    if (this.products.length === 0) {
      IBestToast.show(I18n.text(this.language, '该厂家暂无可代理商品', 'This factory has no products available for agency'));
      return;
    }
    this.showAgency = true;
  }

  private async applyAgency(): Promise<void> {
    if (!this.data || this.applying) return;
    const markup = Number(this.markupText);
    if (!Number.isFinite(markup) || markup < 0 || markup > 100) {
      IBestToast.show(I18n.text(this.language, '加价比例需为 0–100', 'Markup must be between 0 and 100'));
      return;
    }
    const productIds = this.products.slice(0, 5).map((item: PlazaProduct): string => item.productId);
    const body: AgencyRequest = {
      factoryId: this.data.id,
      productIds,
      markupPercent: markup,
      autoSyncPrice: this.autoSync,
      message: this.message.trim()
    };
    this.applying = true;
    try {
      await BusinessRepository.applyAgency(body);
      this.showAgency = false;
      IBestToast.show(I18n.text(this.language, `已提交 ${productIds.length} 件商品的代理申请`, `Agency request submitted for ${productIds.length} products`));
      this.routeTimer = setTimeout((): void => {
        this.routeTimer = -1;
        AppRouter.replace('AgencyProducts', new IdRouteParams('', 'applied'));
      }, 800);
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '代理申请失败', 'Agency request failed'));
    } finally {
      this.applying = false;
    }
  }

  @Builder
  private productCard(item: PlazaProduct) {
    Row({ space: 10 }) {
      Image(item.productImage).width(72).height(72).objectFit(ImageFit.Cover).borderRadius(10);
      Column({ space: 7 }) {
        Text(item.productName).fontSize(14).fontWeight(FontWeight.Medium).maxLines(2).width('100%');
        Row() {
          Text(I18n.text(this.language, `¥${item.startPrice.toFixed(2)} 起`, `From ¥${item.startPrice.toFixed(2)}`)).fontSize(15).fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.brand(this.darkMode));
          Blank();
          Text(I18n.text(this.language, `${item.agencyCount} 家代理`, `${item.agencyCount} agents`)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(11).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
  }

  @Builder
  private agencySheet() {
    Column({ space: 14 }) {
      Row() {
        Text(I18n.text(this.language, '申请代理', 'Apply for agency')).fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
        Text(I18n.text(this.language, '关闭', 'Close')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).onClick(() => this.showAgency = false);
      }.width('100%');
      Text(I18n.text(this.language, `将申请前 ${Math.min(5, this.products.length)} 件可代理商品，可在“我的代理”继续管理。`,
        `The first ${Math.min(5, this.products.length)} products will be requested. Manage them under My agency.`))
        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      IBestField({ value: $markupText, label: I18n.text(this.language, '统一加价比例', 'Markup for all'), suffix: '%', type: 'decimal', placeholder: '0–100' });
      Row() {
        Column({ space: 3 }) {
          Text(I18n.text(this.language, '自动同步厂家价格', 'Sync factory prices')).fontSize(14).fontWeight(FontWeight.Medium);
          Text(I18n.text(this.language, '厂家调价时按加价比例更新', 'Apply the markup when factory prices change')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        IBestSwitch({ value: $autoSync, activeColor: DesignTokens.brand(this.darkMode) });
      }.width('100%');
      Column({ space: 8 }) {
        Text(I18n.text(this.language, '申请留言', 'Message')).fontSize(14).fontWeight(FontWeight.Medium).width('100%');
        TextArea({ text: $message, placeholder: I18n.text(this.language, '可填写合作方式或经营情况', 'Describe your business or preferred partnership') })
          .height(88).width('100%').padding(10).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10)
          .maxLength(300);
      }.width('100%').alignItems(HorizontalAlign.Start);
      IBestButton({
        text: I18n.text(this.language, '确认提交', 'Submit'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%',
        loading: this.applying, onBtnClick: () => this.applyAgency()
      });
    }.width('100%').padding({ left: 20, right: 20, top: 18, bottom: this.safeBottom + 18 });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '厂家详情', 'Factory details'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else if (this.data) {
          Scroll() {
            Column({ space: 14 }) {
              if (this.data.banner) {
                Image(this.data.banner).width('100%').height(190).objectFit(ImageFit.Cover).borderRadius(18);
              }
              Row({ space: 12 }) {
                if (this.data.logo) {
                  Image(this.data.logo).width(68).height(68).borderRadius(14).objectFit(ImageFit.Cover);
                } else {
                  Column().width(68).height(68).borderRadius(14).backgroundColor(DesignTokens.subtle(this.darkMode));
                }
                Column({ space: 5 }) {
                  Text(this.data.name).fontSize(21).fontWeight(FontWeight.Bold).maxLines(1);
                  Row({ space: 7 }) {
                    IBestTag({ text: I18n.text(this.language, `${this.data.rating.toFixed(1)}分`, `${this.data.rating.toFixed(1)} rating`), color: DesignTokens.brand(this.darkMode) });
                    Text(I18n.text(this.language, `${this.data.ratingCount} 条评价`, `${this.data.ratingCount} reviews`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                  }.width('100%');
                  Text(I18n.text(this.language, `${this.data.region} · 经营 ${this.data.years || 1} 年`,
                    `${this.data.region} · ${this.data.years || 1} years in business`)).fontSize(12)
                    .fontColor(DesignTokens.muted(this.darkMode));
                }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                IBestButton({
                  text: this.data.followed ? I18n.text(this.language, '已关注', 'Following') : I18n.text(this.language, '关注', 'Follow'), plain: true, color: DesignTokens.brand(this.darkMode),
                  loading: this.following, disabled: this.following, onBtnClick: () => this.follow()
                });
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Row() {
                Column({ space: 3 }) { Text(`${this.data.productCount || this.products.length}`).fontSize(20).fontWeight(FontWeight.Bold); Text(I18n.text(this.language, '在售商品', 'Products')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)); }.layoutWeight(1);
                Column({ space: 3 }) { Text(`${this.data.agencyCount || 0}`).fontSize(20).fontWeight(FontWeight.Bold); Text(I18n.text(this.language, '合作代理', 'Agents')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)); }.layoutWeight(1);
                Column({ space: 3 }) { Text(`¥${(this.data.monthGmv || this.data.gmv || 0).toFixed(0)}`).fontSize(20).fontWeight(FontWeight.Bold); Text(I18n.text(this.language, '经营规模', 'Business volume')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)); }.layoutWeight(1);
              }.width('100%').padding({ top: 16, bottom: 16 }).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 9 }) {
                Text(I18n.text(this.language, '厂家介绍', 'About the factory')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Text(this.data.desc || I18n.text(this.language, '暂无介绍', 'No description')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode))
                  .lineHeight(22).width('100%');
                Text(I18n.text(this.language, `主营：${this.data.categories.join('、') || '--'}`, `Categories: ${this.data.categories.join(', ') || '--'}`)).fontSize(13).width('100%');
                Text(I18n.text(this.language, `地址：${this.data.address || this.data.contact?.address || '--'}`, `Address: ${this.data.address || this.data.contact?.address || '--'}`)).fontSize(13).width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              if ((this.data.qualifications || []).length > 0) {
                Column({ space: 10 }) {
                  Text(I18n.text(this.language, '企业资质', 'Qualifications')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                  Scroll() {
                    Row({ space: 10 }) {
                      ForEach(this.data.qualifications || [], (item: PlazaQualification) => {
                        Column({ space: 5 }) {
                          Image(item.image).width(116).height(82).objectFit(ImageFit.Cover).borderRadius(10);
                          Text(item.name).fontSize(11).maxLines(1).width(116).textAlign(TextAlign.Center);
                        }.onClick(() => this.previewQualification(item));
                      }, (item: PlazaQualification) => item.id);
                    }
                  }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
              }

              Column({ space: 10 }) {
                Text(I18n.text(this.language, '联系方式', 'Contact')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Text(`${this.contactName() || this.defaultContactName()}  ${this.contactPhone() || this.unpublishedPhone()}`).fontSize(15).width('100%');
                if (this.data.contact?.workTime) {
                  Text(I18n.text(this.language, `工作时间：${this.data.contact.workTime}`, `Hours: ${this.data.contact.workTime}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                }
                IBestButton({ text: I18n.text(this.language, '联系厂家', 'Contact factory'), plain: true, color: DesignTokens.brand(this.darkMode), btnWidth: '100%', onBtnClick: () => this.callFactory() });
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 10 }) {
                Row() { Text(I18n.text(this.language, '可代理商品', 'Agency products')).fontSize(18).fontWeight(FontWeight.Bold).layoutWeight(1); Text(I18n.text(this.language, `${this.products.length} 件`, `${this.products.length} products`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }.width('100%');
                ForEach(this.products.slice(0, 5), (item: PlazaProduct) => { this.productCard(item); }, (item: PlazaProduct) => item.productId);
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 10 }) {
                Text(I18n.text(this.language, '为厂家评分', 'Rate this factory')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Row({ space: 8 }) {
                  ForEach([1, 2, 3, 4, 5], (score: number) => {
                    Text(`${score}★`).fontSize(13).fontColor(this.rating === score ? DesignTokens.onBrand(this.darkMode) : DesignTokens.brand(this.darkMode))
                      .padding({ left: 10, right: 10, top: 8, bottom: 8 })
                      .backgroundColor(this.rating === score ? DesignTokens.brand(this.darkMode) : DesignTokens.selectedSurface(this.darkMode)).borderRadius(16)
                      .onClick(() => this.rate(score));
                  });
                }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              IBestButton({
                text: I18n.text(this.language, '申请代理该厂家商品', 'Apply to sell this factory\'s products'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                btnWidth: '100%', onBtnClick: () => this.openAgency()
              });
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
        .bindSheet(this.showAgency, this.agencySheet(), {
          height: SheetSize.MEDIUM,
          onWillDismiss: () => { this.showAgency = false; }
        });
    }.hideTitleBar(true);
  }
}
