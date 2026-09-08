import { IBestButton, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { SessionStore } from '../../core/storage/SessionStore';
import { InputValidators } from '../../core/validation/InputValidators';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { AuthRepository } from './AuthRepository';
import { I18n } from '../../core/i18n/I18n';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function ChangePhoneBuilder(_: string) { ChangePhonePage(); }

@Component
struct ChangePhonePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private oldCode: string = '';
  @State private newPhone: string = '';
  @State private newCode: string = '';
  @State private sendingOld: boolean = false;
  @State private sendingNew: boolean = false;
  @State private oldCountdown: number = 0;
  @State private newCountdown: number = 0;
  @State private saving: boolean = false;
  @State private currentPhone: string = '';
  @State private step: number = 0;
  private oldTimer: number = -1;
  private newTimer: number = -1;

  aboutToAppear(): void {
    this.currentPhone = SessionStore.shared().user?.phone || '';
    this.step = this.currentPhone ? 0 : 1;
    if (!this.currentPhone) this.loadUser();
  }

  aboutToDisappear(): void {
    if (this.oldTimer >= 0) clearInterval(this.oldTimer);
    if (this.newTimer >= 0) clearInterval(this.newTimer);
  }

  private async loadUser(): Promise<void> {
    try {
      const user = await AuthRepository.userInfo();
      await SessionStore.shared().updateUser(user);
      this.currentPhone = user.phone || '';
      this.step = this.currentPhone ? 0 : 1;
    } catch (_) {}
  }

  private continueToNewPhone(): void {
    if (this.currentPhone && !/^\d{4,6}$/.test(this.oldCode)) {
      IBestToast.show(I18n.text(this.language, '请输入原手机号收到的验证码', 'Enter the code sent to your current phone'));
      return;
    }
    this.step = 1;
  }

  private startOldCountdown(): void {
    this.oldCountdown = 60;
    if (this.oldTimer >= 0) clearInterval(this.oldTimer);
    this.oldTimer = setInterval((): void => {
      this.oldCountdown -= 1;
      if (this.oldCountdown <= 0 && this.oldTimer >= 0) { clearInterval(this.oldTimer); this.oldTimer = -1; }
    }, 1000);
  }

  private startNewCountdown(): void {
    this.newCountdown = 60;
    if (this.newTimer >= 0) clearInterval(this.newTimer);
    this.newTimer = setInterval((): void => {
      this.newCountdown -= 1;
      if (this.newCountdown <= 0 && this.newTimer >= 0) { clearInterval(this.newTimer); this.newTimer = -1; }
    }, 1000);
  }

  private async sendOldCode(): Promise<void> {
    if (!this.currentPhone || this.sendingOld || this.oldCountdown > 0) return;
    this.sendingOld = true;
    try {
      await AuthRepository.sendSmsCode(this.currentPhone, 'change_phone');
      IBestToast.show(I18n.text(this.language, '验证码已发送到原手机号', 'Verification code sent to your current phone'));
      this.startOldCountdown();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '验证码发送失败', 'Failed to send verification code'));
    } finally { this.sendingOld = false; }
  }

  private async sendNewCode(): Promise<void> {
    if (this.sendingNew || this.newCountdown > 0) return;
    if (!InputValidators.isMainlandPhone(this.newPhone)) { IBestToast.show(I18n.text(this.language, '请输入正确的新手机号', 'Enter a valid new mobile number')); return; }
    this.sendingNew = true;
    try {
      await AuthRepository.sendSmsCode(this.newPhone, 'change_phone');
      IBestToast.show(I18n.text(this.language, '验证码已发送到新手机号', 'Verification code sent to your new phone'));
      this.startNewCountdown();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '验证码发送失败', 'Failed to send verification code'));
    } finally { this.sendingNew = false; }
  }

  private async submit(): Promise<void> {
    if (this.saving) return;
    if (this.currentPhone && !/^\d{4,6}$/.test(this.oldCode)) { IBestToast.show(I18n.text(this.language, '请输入原手机号验证码', 'Enter the code sent to your current phone')); return; }
    if (!InputValidators.isMainlandPhone(this.newPhone) || !InputValidators.isSmsCode(this.newCode)) {
      IBestToast.show(I18n.text(this.language, '请完整填写新手机号和验证码', 'Enter the new phone number and its verification code')); return;
    }
    this.saving = true;
    try {
      const result = await AuthRepository.changePhone(this.oldCode, this.newPhone, this.newCode);
      const user = SessionStore.shared().user;
      if (user) {
        user.phone = result.phone;
        await SessionStore.shared().updateUser(user);
      }
      IBestToast.show(I18n.text(this.language, '手机号修改成功', 'Phone number changed'));
      AppRouter.back();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '手机号修改失败', 'Failed to change phone number'));
    } finally { this.saving = false; }
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '修改手机号', 'Change phone number'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            Row() {
              Column({ space: 5 }) {
                Text('1').fontSize(12).fontWeight(FontWeight.Bold)
                  .fontColor(this.step === 0 ? DesignTokens.onBrand(this.darkMode) : DesignTokens.brand(this.darkMode));
                Text(I18n.text(this.language, '验证原手机', 'Verify current phone')).fontSize(10)
                  .fontColor(this.step === 0 ? DesignTokens.text(this.darkMode) : DesignTokens.muted(this.darkMode));
              }.layoutWeight(1).height(48).justifyContent(FlexAlign.Center)
                .backgroundColor(this.step === 0 ? DesignTokens.brand(this.darkMode) : DesignTokens.selectedSurface(this.darkMode))
                .borderRadius({ topLeft: 16, bottomLeft: 16 });
              Column({ space: 5 }) {
                Text('2').fontSize(12).fontWeight(FontWeight.Bold)
                  .fontColor(this.step === 1 ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode));
                Text(I18n.text(this.language, '绑定新手机', 'Link new phone')).fontSize(10)
                  .fontColor(this.step === 1 ? DesignTokens.text(this.darkMode) : DesignTokens.muted(this.darkMode));
              }.layoutWeight(1).height(48).justifyContent(FlexAlign.Center)
                .backgroundColor(this.step === 1 ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                .borderRadius({ topRight: 16, bottomRight: 16 });
            }.width('100%');
            Column({ space: 14 }) {
              Column() { MerchantIcon({ name: 'phone-o', color: DesignTokens.brand(this.darkMode), iconSize: 29 }); }
                .width(58).height(58).justifyContent(FlexAlign.Center)
                .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(20);
              Text(this.step === 0
                ? I18n.text(this.language, '验证当前绑定手机号', 'Verify your current phone number')
                : I18n.text(this.language, '绑定新的登录手机号', 'Link a new sign-in phone number'))
                .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
              Text(this.step === 0
                ? I18n.text(this.language, `验证码将发送至 ${this.currentPhone}`, `A code will be sent to ${this.currentPhone}`)
                : I18n.text(this.language, '新手机号将用于后续登录与安全验证', 'The new number will be used for sign-in and verification'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
            }.width('100%').padding(20).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_XL).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            if (this.step === 0 && this.currentPhone) {
              Column({ space: 14 }) {
              Row({ space: 8 }) {
                IBestField({ value: $oldCode, label: I18n.text(this.language, '原手机验证码', 'Current phone code'), placeholder: I18n.text(this.language, '4–6位验证码', '4–6 digit code'), type: 'number' });
                IBestButton({ text: this.oldCountdown > 0 ? I18n.text(this.language, `${this.oldCountdown}秒`, `${this.oldCountdown}s`) : I18n.text(this.language, '发送', 'Send'), plain: true, color: DesignTokens.brand(this.darkMode), loading: this.sendingOld, disabled: this.oldCountdown > 0, onBtnClick: () => this.sendOldCode() });
              }.width('100%');
                IBestButton({ text: I18n.text(this.language, '下一步', 'Continue'), type: 'primary',
                  color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                  btnWidth: '100%', onBtnClick: () => this.continueToNewPhone() });
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
                .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            } else {
              Column({ space: 14 }) {
                IBestField({ value: $newPhone, label: I18n.text(this.language, '新手机号', 'New phone number'), placeholder: I18n.text(this.language, '请输入11位手机号', 'Enter an 11-digit mobile number'), type: 'number' });
                Row({ space: 8 }) {
                  IBestField({ value: $newCode, label: I18n.text(this.language, '新手机验证码', 'New phone code'), placeholder: I18n.text(this.language, '4–6位验证码', '4–6 digit code'), type: 'number' });
                  IBestButton({ text: this.newCountdown > 0 ? I18n.text(this.language, `${this.newCountdown}秒`, `${this.newCountdown}s`) : I18n.text(this.language, '发送', 'Send'), plain: true, color: DesignTokens.brand(this.darkMode), loading: this.sendingNew, disabled: this.newCountdown > 0, onBtnClick: () => this.sendNewCode() });
                }.width('100%');
                IBestButton({ text: I18n.text(this.language, '确认更换', 'Confirm change'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%', loading: this.saving, disabled: this.saving, onBtnClick: () => this.submit() });
                if (this.currentPhone) {
                  Text(I18n.text(this.language, '返回上一步', 'Back to previous step')).fontSize(13)
                    .fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.step = 0);
                }
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
                .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            }
            Text(I18n.text(this.language,
              '为保护账号安全，已绑定手机号时必须同时验证原手机号与新手机号。',
              'To protect your account, both the current and new phone numbers must be verified.'))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).lineHeight(20).width('100%');
          }.width('100%').constraintSize({ maxWidth: 640 })
            .padding({ left: 18, right: 18, top: 18, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
