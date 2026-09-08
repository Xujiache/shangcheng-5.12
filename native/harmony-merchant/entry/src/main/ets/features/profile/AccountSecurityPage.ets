import { IBestNavBar } from '@ibestservices/ibest-ui';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { SessionStore } from '../../core/storage/SessionStore';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon, MerchantIconName } from '../../core/theme/MerchantIcon';

@Builder
export function AccountSecurityBuilder(_: string) { AccountSecurityPage(); }

@Component
struct AccountSecurityPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;

  private maskedPhone(): string {
    const phone = SessionStore.shared().user?.phone || '';
    if (phone.length < 7) return phone || I18n.text(this.language, '未绑定', 'Not linked');
    return `${phone.slice(0, 3)}****${phone.slice(-4)}`;
  }

  @Builder
  private securityRow(icon: MerchantIconName, title: string, description: string, value: string, action: () => void,
    border: boolean = true) {
    Row({ space: 12 }) {
      Column() { MerchantIcon({ name: icon, color: DesignTokens.brand(this.darkMode), iconSize: 22 }); }
        .width(42).height(42).justifyContent(FlexAlign.Center)
        .backgroundColor(DesignTokens.iconSurface(this.darkMode)).borderRadius(14);
      Column({ space: 4 }) {
        Text(title).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        Text(description).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(2);
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      if (value) Text(value).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 16 });
    }.width('100%').height(72).padding({ left: 15, right: 15 })
      .border({ width: { bottom: border ? 1 : 0 }, color: DesignTokens.border(this.darkMode) }).onClick(action);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '账号与安全', 'Account and security'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            Column({ space: 8 }) {
              Column() { MerchantIcon({ name: 'shield-o', color: DesignTokens.brand(this.darkMode), iconSize: 32 }); }
                .width(64).height(64).justifyContent(FlexAlign.Center)
                .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(22);
              Text(I18n.text(this.language, '登录保护已开启', 'Sign-in protection is active'))
                .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
              Text(I18n.text(this.language,
                '敏感操作需要密码或短信验证码确认', 'Sensitive changes require a password or SMS verification code'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
            }.width('100%').padding(20).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_XL).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            Column() {
              this.securityRow('phone-o', I18n.text(this.language, '登录手机号', 'Sign-in phone'),
                I18n.text(this.language, '用于登录、找回账号和安全验证', 'Used for sign-in, recovery and verification'),
                this.maskedPhone(), () => AppRouter.push('ChangePhone'));
              this.securityRow('shield-o', I18n.text(this.language, '登录密码', 'Sign-in password'),
                I18n.text(this.language, '建议定期更换且不要与其他平台重复', 'Use a unique password and change it periodically'),
                SessionStore.shared().user?.hasPassword === false
                  ? I18n.text(this.language, '未设置', 'Not set') : I18n.text(this.language, '已设置', 'Set'),
                () => AppRouter.push('SetPassword'));
              this.securityRow('user-o', I18n.text(this.language, '个人与店铺资料', 'Profile and store'),
                I18n.text(this.language, '管理联系人、经营品类与店铺地址', 'Manage contacts, categories and store address'),
                '', () => AppRouter.push('Profile'), false);
            }.width('100%').backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            Text(I18n.text(this.language,
              '经纬不会在任何页面展示、保存或发送你的明文密码。',
              'Jingwei never displays, stores or sends your password in plain text.'))
              .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).lineHeight(18).width('100%').padding({ left: 6, right: 6 });
          }.width('100%').constraintSize({ maxWidth: 680 })
            .padding({ left: 16, right: 16, top: 16, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
