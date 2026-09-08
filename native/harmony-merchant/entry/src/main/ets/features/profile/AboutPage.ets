import { common } from '@kit.AbilityKit';
import { IBestDialogUtil, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppConfig } from '../../core/config/AppConfig';
import { PhoneService } from '../../core/device/PhoneService';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon, MerchantIconName } from '../../core/theme/MerchantIcon';
import { AgreementRouteParams } from '../legal/LegalModels';
import { PublicSettingsRepository, PublicSystemSettings } from '../legal/PublicSettingsRepository';
import { PublicSupportPolicy } from '../legal/PublicSupportPolicy';

@Builder
export function AboutAppBuilder(_: string) { AboutPage(); }

@Component
struct AboutPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private publicSettings: PublicSystemSettings | null = null;

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    try { this.publicSettings = await PublicSettingsRepository.load(); } catch (_) {}
  }

  private context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
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
      title: I18n.text(this.language, '联系我们', 'Contact us'), message: lines.join('\n'),
      showCancelButton: phone.length > 0,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: phone ? I18n.text(this.language, '拨打', 'Call') : I18n.text(this.language, '知道了', 'OK'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => { if (phone) this.call(phone); }
    });
  }

  private async call(phone: string): Promise<void> {
    try { await PhoneService.dial(this.context(), phone); }
    catch (_) { IBestToast.show(I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer')); }
  }

  @Builder
  private row(icon: MerchantIconName, title: string, detail: string, action: () => void, border: boolean = true) {
    Row({ space: 12 }) {
      MerchantIcon({ name: icon, color: DesignTokens.brand(this.darkMode), iconSize: 21 });
      Text(title).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
      if (detail) Text(detail).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 16 });
    }.width('100%').height(58).padding({ left: 16, right: 16 })
      .border({ width: { bottom: border ? 1 : 0 }, color: DesignTokens.border(this.darkMode) }).onClick(action);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '关于经纬商家端', 'About Jingwei Merchant'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            Column({ space: 12 }) {
              Stack({ alignContent: Alignment.Center }) {
                Column().width(82).height(82).borderRadius(27).backgroundColor(DesignTokens.selectedSurface(this.darkMode));
                Text(I18n.text(this.language, '经', 'J')).fontSize(34).fontWeight(FontWeight.Bold)
                  .fontColor(DesignTokens.brand(this.darkMode));
              }.width(82).height(82);
              Text(I18n.text(this.language, '经纬科技商家端', 'Jingwei Merchant'))
                .fontSize(21).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
              Text(`v${AppConfig.CLIENT_VERSION} · versionCode ${AppConfig.CLIENT_VERSION_CODE}`)
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
              Text(I18n.text(this.language,
                '面向门窗商家的原生经营管理工作台',
                'A native commerce workbench built for windows and doors merchants'))
                .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center).lineHeight(20);
            }.width('100%').padding({ top: 26, bottom: 22 }).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_XL).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            Column() {
              this.row('upgrade', I18n.text(this.language, '检查更新', 'Check for updates'),
                `v${AppConfig.CLIENT_VERSION}`, () => AppRouter.push('UpdateCenter'));
              this.row('share-o', I18n.text(this.language, '分享应用', 'Share app'), '',
                () => AppRouter.push('ShareApp'));
              this.row('service-o', I18n.text(this.language, '联系平台客服', 'Contact support'), '',
                () => this.contactSupport(), false);
            }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20)
              .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            Column() {
              this.row('description-o', I18n.text(this.language, '用户协议', 'Terms of service'), '',
                () => AppRouter.push('Agreements', new AgreementRouteParams('user')));
              this.row('shield-o', I18n.text(this.language, '隐私政策', 'Privacy policy'), '',
                () => AppRouter.push('Agreements', new AgreementRouteParams('privacy')));
              this.row('records-o', I18n.text(this.language, '个人信息收集清单', 'Personal information checklist'), '',
                () => AppRouter.push('Agreements', new AgreementRouteParams('collect')), false);
            }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20)
              .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            Text(I18n.text(this.language,
              'Copyright © 经纬科技。保留所有权利。',
              'Copyright © Jingwei Technology. All rights reserved.'))
              .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center).width('100%');
          }.width('100%').constraintSize({ maxWidth: 680 })
            .padding({ left: 16, right: 16, top: 16, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
