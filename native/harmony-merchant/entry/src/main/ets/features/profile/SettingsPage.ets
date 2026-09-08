import { common } from '@kit.AbilityKit';
import { IBestDialogUtil, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppConfig } from '../../core/config/AppConfig';
import { PhoneService } from '../../core/device/PhoneService';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { CacheService } from '../../core/storage/CacheService';
import { OfflineCacheStore } from '../../core/storage/OfflineCacheStore';
import { SessionStore } from '../../core/storage/SessionStore';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { AuthRepository } from '../auth/AuthRepository';
import { AgreementRouteParams } from '../legal/LegalModels';
import { PublicSettingsRepository, PublicSystemSettings } from '../legal/PublicSettingsRepository';
import { PublicSupportPolicy } from '../legal/PublicSupportPolicy';

@Builder
export function SettingsBuilder(_: string) { SettingsPage(); }

@Component
struct SettingsPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('themeMode') private theme: string = 'system';
  @State private cacheSize: string = '';
  @State private publicSettings: PublicSystemSettings | null = null;
  @State private loggingOut: boolean = false;

  aboutToAppear(): void {
    this.refreshCacheSize();
    this.loadPublicSettings();
  }

  private context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
  }

  private async loadPublicSettings(): Promise<void> {
    try { this.publicSettings = await PublicSettingsRepository.load(); } catch (_) {}
  }

  private refreshCacheSize(): void {
    this.cacheSize = CacheService.format(CacheService.bytes(this.context()));
  }

  private themeLabel(): string {
    if (this.theme === 'dark') return I18n.text(this.language, '深色', 'Dark');
    if (this.theme === 'light') return I18n.text(this.language, '浅色', 'Light');
    return I18n.text(this.language, '跟随系统', 'System');
  }

  private languageLabel(): string {
    return this.language === 'en-US' ? 'English' : I18n.text(this.language, '简体中文', 'Chinese');
  }

  private maskedPhone(): string {
    const phone = SessionStore.shared().user?.phone || '';
    if (phone.length < 7) return phone || I18n.text(this.language, '正在同步', 'Syncing');
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }

  private confirmClearCache(): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '清理缓存', 'Clear cache'),
      message: I18n.text(this.language,
        `将清理 ${this.cacheSize || '0 B'} 图片和临时文件，不会退出登录或删除业务数据。`,
        `${this.cacheSize || '0 B'} of images and temporary files will be removed. Your session and business data will remain.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => this.clearCache()
    });
  }

  private async clearCache(): Promise<void> {
    CacheService.clear(this.context());
    try {
      await OfflineCacheStore.clearAll();
      this.refreshCacheSize();
      IBestToast.show(I18n.text(this.language, '缓存已清理', 'Cache cleared'));
    } catch (_) {
      this.refreshCacheSize();
      IBestToast.show(I18n.text(this.language, '部分缓存清理失败，请稍后重试',
        'Some cached data could not be cleared. Please try again.'));
    }
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
      title: I18n.text(this.language, '联系我们', 'Contact us'),
      message: lines.join('\n'),
      showCancelButton: phone.length > 0,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: phone ? I18n.text(this.language, '拨打', 'Call') : I18n.text(this.language, '知道了', 'OK'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => { if (phone) this.callSupport(phone); }
    });
  }

  private async callSupport(phone: string): Promise<void> {
    try { await PhoneService.dial(this.context(), phone); }
    catch (_) { IBestToast.show(I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer')); }
  }

  private confirmLogout(): void {
    if (this.loggingOut) return;
    IBestDialogUtil.open({
      title: I18n.text(this.language, '退出登录', 'Sign out'),
      message: I18n.text(this.language, '退出后仍会保留外观设置，但需要重新验证账号。',
        'Appearance settings will be kept, but you will need to sign in again.'),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '退出登录', 'Sign out'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => this.logout()
    });
  }

  private async logout(): Promise<void> {
    if (this.loggingOut) return;
    this.loggingOut = true;
    try {
      await AuthRepository.logout();
      AppRouter.clear();
    } catch (_) {
      IBestToast.show(I18n.text(this.language,
        '安全存储暂时不可用，未执行退出，请稍后重试',
        'Protected storage is unavailable. Sign-out was not performed. Try again later.'));
    } finally { this.loggingOut = false; }
  }

  @Builder
  private sectionTitle(title: string, subtitle: string) {
    Column({ space: 3 }) {
      Text(title).fontSize(16).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).width('100%');
      if (subtitle) Text(subtitle).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
    }.width('100%').alignItems(HorizontalAlign.Start).padding({ left: 2, bottom: 8 });
  }

  @Builder
  private settingRow(icon: Resource, title: string, detail: string, action: () => void, border: boolean = true) {
    Row({ space: 12 }) {
      Image(icon).width(42).height(42).objectFit(ImageFit.Contain).interpolation(ImageInterpolation.High);
      Column({ space: 3 }) {
        Text(title).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode))
          .width('100%').maxLines(1);
        if (detail) Text(detail).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(1);
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 16 });
    }.width('100%').height(62).padding({ left: 14, right: 14 })
      .border({ width: { bottom: border ? 1 : 0 }, color: DesignTokens.border(this.darkMode) }).onClick(action);
  }

  @Builder
  private accountGroup() {
    Column({ space: 8 }) {
      this.sectionTitle(I18n.text(this.language, '账号与安全', 'Account and security'), this.maskedPhone());
      Column() {
        this.settingRow($r('app.media.commerce_profile_lite'), I18n.text(this.language, '个人与店铺资料', 'Profile and store'),
          I18n.text(this.language, '头像、联系信息、经营品类与地址', 'Identity, contacts, categories and address'),
          () => AppRouter.push('Profile'));
        this.settingRow($r('app.media.commerce_security_lite'), I18n.text(this.language, '登录与账号安全', 'Sign-in and account security'),
          I18n.text(this.language, '手机号与登录密码', 'Phone number and password'),
          () => AppRouter.push('AccountSecurity'), false);
      }.width('100%').backgroundColor(DesignTokens.card(this.darkMode))
        .border({ width: 1, color: DesignTokens.border(this.darkMode) })
        .borderRadius(DesignTokens.RADIUS_LARGE).clip(true);
    }.width('100%');
  }

  @Builder
  private preferenceGroup() {
    Column({ space: 8 }) {
      this.sectionTitle(I18n.text(this.language, '外观与通知', 'Appearance and notifications'), '');
      Column() {
        this.settingRow($r('app.media.commerce_appearance_lite'), I18n.text(this.language, '主题与语言', 'Theme and language'),
          `${this.themeLabel()} · ${this.languageLabel()}`,
          () => AppRouter.push('AppearanceSettings'));
        this.settingRow($r('app.media.commerce_notifications_lite'), I18n.text(this.language, '消息通知', 'Notifications'),
          I18n.text(this.language, '订单、售后和客服提醒', 'Orders, after-sales and customer messages'),
          () => AppRouter.push('NotificationSettings'), false);
      }.width('100%').backgroundColor(DesignTokens.card(this.darkMode))
        .border({ width: 1, color: DesignTokens.border(this.darkMode) })
        .borderRadius(DesignTokens.RADIUS_LARGE).clip(true);
    }.width('100%');
  }

  @Builder
  private privacyGroup() {
    Column({ space: 8 }) {
      this.sectionTitle(I18n.text(this.language, '存储与隐私', 'Storage and privacy'), '');
      Column() {
        this.settingRow($r('app.media.commerce_cache_lite'), I18n.text(this.language, '清理缓存', 'Clear cache'), this.cacheSize,
          () => this.confirmClearCache());
        this.settingRow($r('app.media.commerce_terms_lite'), I18n.text(this.language, '用户协议', 'Terms of service'), '',
          () => AppRouter.push('Agreements', new AgreementRouteParams('user')));
        this.settingRow($r('app.media.commerce_privacy_lite'), I18n.text(this.language, '隐私政策', 'Privacy policy'), '',
          () => AppRouter.push('Agreements', new AgreementRouteParams('privacy')));
        this.settingRow($r('app.media.commerce_personal_info_lite'), I18n.text(this.language, '个人信息收集清单', 'Personal information checklist'), '',
          () => AppRouter.push('Agreements', new AgreementRouteParams('collect')), false);
      }.width('100%').backgroundColor(DesignTokens.card(this.darkMode))
        .border({ width: 1, color: DesignTokens.border(this.darkMode) })
        .borderRadius(DesignTokens.RADIUS_LARGE).clip(true);
    }.width('100%');
  }

  @Builder
  private supportGroup() {
    Column({ space: 8 }) {
      this.sectionTitle(I18n.text(this.language, '应用与支持', 'App and support'), '');
      Column() {
        this.settingRow($r('app.media.commerce_about_lite'), I18n.text(this.language, '关于经纬商家端', 'About Jingwei Merchant'),
          `v${AppConfig.CLIENT_VERSION}`, () => AppRouter.push('AboutApp'));
        this.settingRow($r('app.media.commerce_update_lite'), I18n.text(this.language, '检查更新', 'Check for updates'),
          `versionCode ${AppConfig.CLIENT_VERSION_CODE}`, () => AppRouter.push('UpdateCenter'));
        this.settingRow($r('app.media.commerce_share_lite'), I18n.text(this.language, '分享应用', 'Share app'), '',
          () => AppRouter.push('ShareApp'));
        this.settingRow($r('app.media.commerce_support_lite'), I18n.text(this.language, '联系我们', 'Contact us'), '',
          () => this.contactSupport(), false);
      }.width('100%').backgroundColor(DesignTokens.card(this.darkMode))
        .border({ width: 1, color: DesignTokens.border(this.darkMode) })
        .borderRadius(DesignTokens.RADIUS_LARGE).clip(true);
    }.width('100%');
  }

  @Builder
  private logoutButton() {
    Row() {
      if (this.loggingOut) LoadingProgress().width(20).height(20).color(DesignTokens.danger(this.darkMode));
      Text(I18n.text(this.language, '退出登录', 'Sign out')).fontSize(14).fontWeight(FontWeight.Medium)
        .fontColor(DesignTokens.danger(this.darkMode));
    }.width('100%').height(52).justifyContent(FlexAlign.Center)
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 1, color: DesignTokens.border(this.darkMode) }).onClick(() => this.confirmLogout());
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '设置', 'Settings'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            if (this.windowWidth >= 600) {
              Row({ space: 18 }) {
                Column({ space: 16 }) { this.accountGroup(); this.preferenceGroup(); }.layoutWeight(1);
                Column({ space: 16 }) { this.privacyGroup(); this.supportGroup(); this.logoutButton(); }.layoutWeight(1);
              }.width('100%').alignItems(VerticalAlign.Top);
            } else {
              this.accountGroup();
              this.preferenceGroup();
              this.privacyGroup();
              this.supportGroup();
              this.logoutButton();
            }
            Text(I18n.text(this.language,
              '设置更改会保存到本机；通知偏好会同步到服务端。',
              'Settings are saved on this device. Notification preferences sync with the server.'))
              .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center).width('100%');
          }.width('100%').constraintSize({ maxWidth: 960 }).padding({
            left: this.windowWidth >= 720 ? 24 : 14, right: this.windowWidth >= 720 ? 24 : 14,
            top: 14, bottom: this.safeBottom + 24
          });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
