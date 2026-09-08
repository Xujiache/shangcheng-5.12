import { IBestButton, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { InputValidators } from '../../core/validation/InputValidators';
import { AuthRepository } from './AuthRepository';
import { SessionStore } from '../../core/storage/SessionStore';
import { I18n } from '../../core/i18n/I18n';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function SetPasswordBuilder(_: string) {
  SetPasswordPage();
}

@Component
struct SetPasswordPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private oldPassword: string = '';
  @State private password: string = '';
  @State private confirmPassword: string = '';
  @State private submitting: boolean = false;
  @State private hasPassword: boolean = true;

  aboutToAppear(): void {
    this.hasPassword = SessionStore.shared().user?.hasPassword !== false;
  }

  private async leave(): Promise<void> {
    if (!this.hasPassword) {
      try {
        await AuthRepository.logout();
        AppRouter.clear();
      } catch (_) {
        IBestToast.show(I18n.text(this.language,
          '安全存储暂时不可用，请稍后重试',
          'Protected storage is unavailable. Try again later.'));
      }
      return;
    }
    AppRouter.back();
  }

  private async submit(): Promise<void> {
    if (this.submitting) return;
    if (!InputValidators.isPassword(this.password)) {
      IBestToast.show(I18n.text(this.language, '密码长度应为6至32位', 'Password must be 6–32 characters'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      IBestToast.show(I18n.text(this.language, '两次输入的密码不一致', 'The passwords do not match'));
      return;
    }
    if (this.hasPassword && !this.oldPassword) {
      IBestToast.show(I18n.text(this.language, '请输入当前密码', 'Enter your current password'));
      return;
    }
    this.submitting = true;
    try {
      await AuthRepository.changePassword(this.hasPassword ? this.oldPassword : '', this.password);
      const user = SessionStore.shared().user;
      if (user) {
        user.hasPassword = true;
        await SessionStore.shared().updateUser(user);
      }
      IBestToast.show(this.hasPassword
        ? I18n.text(this.language, '密码修改成功', 'Password changed')
        : I18n.text(this.language, '密码设置成功', 'Password set'));
      if (this.hasPassword) {
        AppRouter.back();
      } else {
        AppRouter.clear();
        const epoch = AppStorage.get<number>('sessionEpoch') || 0;
        AppStorage.setOrCreate<number>('sessionEpoch', epoch + 1);
      }
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '密码设置失败', 'Failed to save password'));
    } finally {
      this.submitting = false;
    }
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: this.hasPassword
            ? I18n.text(this.language, '修改登录密码', 'Change sign-in password')
            : I18n.text(this.language, '设置登录密码', 'Set sign-in password'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => this.leave()
        });
        Scroll() {
          Column({ space: 16 }) {
            Column({ space: 10 }) {
              Column() { MerchantIcon({ name: 'shield-o', color: DesignTokens.brand(this.darkMode), iconSize: 30 }); }
                .width(58).height(58).justifyContent(FlexAlign.Center)
                .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(20);
              Text(this.hasPassword
                ? I18n.text(this.language, '验证后更新登录密码', 'Verify and update your password')
                : I18n.text(this.language, '设置安全的登录密码', 'Create a secure sign-in password'))
                .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
              Text(this.hasPassword
                ? I18n.text(this.language, '修改密码需要验证当前密码', 'Verify your current password before changing it')
                : I18n.text(this.language, '首次设置后即可使用手机号和密码登录', 'After setting a password, you can sign in with your phone number and password'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
            }.width('100%').padding(20).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_XL).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            Column({ space: 4 }) {
              if (this.hasPassword) {
                IBestField({ value: $oldPassword, label: I18n.text(this.language, '当前密码', 'Current password'), placeholder: I18n.text(this.language, '请输入当前登录密码', 'Enter your current password'), type: 'password' });
              }
              IBestField({ value: $password, label: I18n.text(this.language, '新密码', 'New password'), placeholder: I18n.text(this.language, '请输入6至32位密码', 'Enter a 6–32 character password'), type: 'password' });
              IBestField({ value: $confirmPassword, label: I18n.text(this.language, '确认密码', 'Confirm password'), placeholder: I18n.text(this.language, '请再次输入密码', 'Enter the password again'), type: 'password', hasBorder: false });
            }.width('100%').padding(6).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            Row({ space: 8 }) {
              MerchantIcon({ name: 'info-o', color: DesignTokens.brand(this.darkMode), iconSize: 16 });
              Text(I18n.text(this.language,
                '密码长度为6至32位，请勿与其他平台使用相同密码。',
                'Use 6–32 characters and avoid reusing a password from another service.'))
                .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1).lineHeight(18);
            }.width('100%').padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14);
            IBestButton({
              text: I18n.text(this.language, '保存密码', 'Save password'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
              btnWidth: '100%', loading: this.submitting, disabled: this.submitting, onBtnClick: () => this.submit()
            });
          }.width('100%').constraintSize({ maxWidth: 640 })
            .padding({ left: 18, right: 18, top: 18, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }
      .width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true).onBackPressed((): boolean => {
      this.leave();
      return true;
    });
  }
}
