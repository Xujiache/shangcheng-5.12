import { MenuCopy, MenuRow, MenuTile } from './LocalizedMenu';
import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { common } from '@kit.AbilityKit';
import { IBestDialogUtil, IBestToast } from '@ibestservices/ibest-ui';
import { AppConfig } from '../../core/config/AppConfig';
import { PhoneService } from '../../core/device/PhoneService';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { BusinessRepository } from '../business/BusinessRepository';
import { MerchantProfile } from '../business/BusinessModels';
import { PublicSettingsRepository, PublicSystemSettings } from '../legal/PublicSettingsRepository';
import { PublicSupportPolicy } from '../legal/PublicSupportPolicy';

@Component
export struct MePage {
  @Prop @Watch('onActivation') activationEpoch: number = 0;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private profile: MerchantProfile | null = null;
  @State private publicSettings: PublicSystemSettings | null = null;
  @State private loading: boolean = true;
  @State private refreshing: boolean = false;
  @State private profileFailed: boolean = false;
  private loadingTask?: Promise<void>;

  aboutToAppear(): void { this.load(false); }

  private onActivation(): void { this.load(true); }

  private async load(silent: boolean): Promise<void> {
    if (this.loadingTask) return this.loadingTask;
    if (silent) this.refreshing = true;
    else if (!this.profile) this.loading = true;
    this.loadingTask = this.performLoad();
    try { await this.loadingTask; } finally {
      this.loadingTask = undefined;
      this.loading = false;
      this.refreshing = false;
    }
  }

  private async performLoad(): Promise<void> {
    try {
      this.profile = await BusinessRepository.profile();
      this.profileFailed = false;
    } catch (_) {
      this.profileFailed = this.profile === null;
    }
    try { this.publicSettings = await PublicSettingsRepository.load(); } catch (_) {}
  }

  private contactSupport(): void {
    const phone = PublicSupportPolicy.dialablePhone(this.publicSettings?.customerServicePhone);
    const email = this.publicSettings?.customerServiceEmail?.trim() || '';
    const hours = this.publicSettings?.customerServiceHours?.trim() || '';
    const lines: string[] = [];
    if (phone) lines.push(I18n.text(this.language, `客服电话：${phone}`, `Phone: ${phone}`));
    if (email) lines.push(I18n.text(this.language, `客服邮箱：${email}`, `Email: ${email}`));
    if (hours) lines.push(I18n.text(this.language, `服务时间：${hours}`, `Service hours: ${hours}`));
    if (lines.length === 0) lines.push(I18n.text(this.language,
      '平台暂未配置公开客服联系方式', 'No public support contact is currently configured'));
    IBestDialogUtil.open({
      title: I18n.text(this.language, '联系平台客服', 'Contact support'),
      message: lines.join('\n'),
      showCancelButton: phone.length > 0,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: phone ? I18n.text(this.language, '拨打电话', 'Call') : I18n.text(this.language, '知道了', 'OK'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => { if (phone) this.callSupport(phone); }
    });
  }

  private async callSupport(phone: string): Promise<void> {
    try {
      await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, phone);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer'));
    }
  }

  @Builder
  private identityCard() {
    Row({ space: 14 }) {
      if (this.profile?.avatar) {
        Image(this.profile.avatar).width(64).height(64).objectFit(ImageFit.Cover).borderRadius(22);
      } else {
        Column() {
          Text((this.profile?.shopName || I18n.text(this.language, '商', 'M')).slice(0, 1))
            .fontSize(25).fontWeight(FontWeight.Bold).fontColor(DesignTokens.onBrand(this.darkMode));
        }.width(64).height(64).justifyContent(FlexAlign.Center)
          .backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius(22);
      }
      Column({ space: 6 }) {
        Row({ space: 7 }) {
          Text(this.profile?.shopName || I18n.text(this.language, '商家资料', 'Merchant profile'))
            .fontSize(19).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode))
            .maxLines(1).layoutWeight(1);
          if (this.profile?.level) {
            Text(this.profile.level).fontSize(10).fontWeight(FontWeight.Medium)
              .fontColor(DesignTokens.brand(this.darkMode)).padding({ left: 8, right: 8, top: 3, bottom: 3 })
              .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(10);
          }
        }.width('100%');
        Text(this.profile?.merchantNo
          ? I18n.text(this.language, `商户号 ${this.profile.merchantNo}`, `Merchant ID ${this.profile.merchantNo}`)
          : I18n.text(this.language, '经纬科技商家端', 'Jingwei Merchant'))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1);
        Row({ space: 5 }) {
          MerchantIcon({ name: 'star', color: DesignTokens.brand(this.darkMode), iconSize: 13 });
          Text(`${(this.profile?.rating ?? 5).toFixed(1)}`)
            .fontSize(12).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
          if ((this.profile?.ratingCount ?? 0) > 0) {
            Text(`(${this.profile?.ratingCount})`).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
          }
        }
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 18 });
    }.width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode))
      .border({ width: 1, color: DesignTokens.border(this.darkMode) }).borderRadius(DesignTokens.RADIUS_XL)
      .shadow({ color: this.darkMode ? '#30000000' : '#10000000', radius: 18, offsetY: 7 })
      .onClick(() => AppRouter.push('Profile'));
  }

  @Builder
  private primaryService(icon: Resource, title: MenuCopy, route: string, contact: boolean = false) {
    MenuTile({ icon, copy: title, action: () => { if (contact) this.contactSupport(); else AppRouter.push(route); } }).layoutWeight(1);
  }

  @Builder
  private primaryServices() {
    Column({ space: 12 }) {
      Text(I18n.text(this.language, '账户服务', 'Account services')).fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).width('100%');
      Row() {
        this.primaryService($r('app.media.commerce_membership_lite'), new MenuCopy('会员', 'Membership'), 'Membership');
        this.primaryService($r('app.media.commerce_profile_lite'), new MenuCopy('资料', 'Profile'), 'Profile');
        this.primaryService($r('app.media.commerce_support_lite'), new MenuCopy('客服', 'Support'), '', true);
        this.primaryService($r('app.media.commerce_settings_lite'), new MenuCopy('设置', 'Settings'), 'Settings');
      }.width('100%');
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private businessTool(icon: Resource, title: MenuCopy, route: string) {
    MenuTile({ icon, copy: title, compact: true, action: () => AppRouter.push(route) }).layoutWeight(1);
  }

  @Builder
  private businessServices() {
    Column({ space: 10 }) {
      Text(I18n.text(this.language, '经营服务', 'Business services')).fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).width('100%');
      Row() {
        this.businessTool($r('app.media.commerce_customers_lite'), new MenuCopy('客户', 'Customers'), 'Customers');
        this.businessTool($r('app.media.commerce_store_lite'), new MenuCopy('门店', 'Stores'), 'Stores');
        this.businessTool($r('app.media.commerce_staff_lite'), new MenuCopy('员工', 'Staff'), 'Staffs');
        this.businessTool($r('app.media.commerce_commission_lite'), new MenuCopy('佣金', 'Commission'), 'Commission');
        this.businessTool($r('app.media.commerce_marketing_lite'), new MenuCopy('营销', 'Marketing'), 'Marketing');
      }.width('100%');
      Row() {
        this.businessTool($r('app.media.commerce_service_lite'), new MenuCopy('客服', 'Messages'), 'ChatSessions');
        this.businessTool($r('app.media.commerce_sourcing_lite'), new MenuCopy('选品', 'Sourcing'), 'Plaza');
        this.businessTool($r('app.media.commerce_agency_lite'), new MenuCopy('代理', 'Agency'), 'AgencyProducts');
        this.businessTool($r('app.media.commerce_decorate_lite'), new MenuCopy('装修', 'Design'), 'Decorate');
        this.businessTool($r('app.media.commerce_pricing_lite'), new MenuCopy('价格', 'Pricing'), 'PriceRule');
      }.width('100%');
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private supportRow(icon: Resource, title: MenuCopy, detail: string, action: () => void, border: boolean = true) {
    MenuRow({ icon, copy: title, detail: new MenuCopy(detail, detail), action, showBorder: border });
  }

  @Builder
  private supportServices() {
    Column() {
      this.supportRow($r('app.media.commerce_share_lite'), new MenuCopy('分享应用', 'Share app'), '', () => AppRouter.push('ShareApp'));
      this.supportRow($r('app.media.commerce_update_lite'), new MenuCopy('检查更新', 'Check for updates'), `v${AppConfig.CLIENT_VERSION}`,
        () => AppRouter.push('UpdateCenter'), false);
    }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
  }

  @Builder
  private loadingSkeleton() {
    Column({ space: 14 }) {
      Row({ space: 14 }) {
        Column().width(64).height(64).borderRadius(22).backgroundColor(DesignTokens.subtle(this.darkMode));
        Column({ space: 10 }) {
          Column().width('60%').height(18).borderRadius(9).backgroundColor(DesignTokens.subtle(this.darkMode));
          Column().width('42%').height(12).borderRadius(6).backgroundColor(DesignTokens.subtle(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      }.width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(24);
      Column().width('100%').height(126).borderRadius(20).backgroundColor(DesignTokens.card(this.darkMode));
      Column().width('100%').height(188).borderRadius(20).backgroundColor(DesignTokens.card(this.darkMode));
    }.width('100%');
  }

  build() {
    Refresh({ refreshing: $$this.refreshing }) {
      Scroll() {
        Column({ space: 14 }) {
        Row() {
          Text(I18n.text(this.language, '我的', 'Me')).fontSize(26).fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.text(this.darkMode));
          Blank();
          if (this.refreshing) LoadingProgress().width(20).height(20).color(DesignTokens.brand(this.darkMode));
          Column() { Image($r('app.media.commerce_settings_lite')).width(37).height(37).objectFit(ImageFit.Contain); }
            .width(48).height(48).justifyContent(FlexAlign.Center).borderRadius(DesignTokens.RADIUS_FIELD)
            .backgroundColor(DesignTokens.card(this.darkMode)).onClick(() => AppRouter.push('Settings'));
        }.width('100%');
        if (this.loading && !this.profile) {
          this.loadingSkeleton();
        } else if (this.profileFailed) {
          Column({ space: 12 }) {
            MerchantIcon({ name: 'replay', color: DesignTokens.brand(this.darkMode), iconSize: 28 });
            Text(I18n.text(this.language, '商家资料暂时无法加载', 'Merchant profile is temporarily unavailable'))
              .fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
            Text(I18n.text(this.language, '点击重新加载', 'Tap to retry')).fontSize(13)
              .fontColor(DesignTokens.brand(this.darkMode));
          }.width('100%').height(156).justifyContent(FlexAlign.Center)
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20).onClick(() => this.load(false));
        } else {
          this.identityCard();
        }
        if (this.windowWidth >= 600) {
          Row({ space: 14 }) {
            Column() { this.primaryServices(); }.width('38%');
            Column() { this.businessServices(); }.layoutWeight(1);
          }.width('100%').alignItems(VerticalAlign.Top);
        } else {
          this.primaryServices();
          this.businessServices();
        }
        this.supportServices();
        Text(I18n.text(this.language,
          `经纬科技 · HarmonyOS NEXT 原生版 v${AppConfig.CLIENT_VERSION}`,
          `Jingwei · HarmonyOS NEXT native v${AppConfig.CLIENT_VERSION}`))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center).width('100%');
        }.width('100%').constraintSize({ maxWidth: 1040 }).padding({
          top: this.safeTop + 12,
          left: this.windowWidth >= 720 ? 24 : 14,
          right: this.windowWidth >= 720 ? 24 : 14,
          bottom: this.windowWidth >= 720 ? 28 : PrimaryNavigationMetrics.contentInset(this.safeBottom)
        });
      }.width('100%').height('100%').align(Alignment.Top).backgroundColor(DesignTokens.page(this.darkMode))
        .scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring);
    }.width('100%').height('100%').onRefreshing(() => this.load(true));
  }
}
