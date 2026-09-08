import {
  IBestButton,
  IBestCheckbox,
  IBestDialogUtil,
  IBestField,
  IBestIcon,
  IBestToast
} from '@ibestservices/ibest-ui';
import { ApiError } from '../../core/network/ApiClient';
import { MerchantLoginSession } from '../../core/model/AuthModels';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { AuthRepository } from './AuthRepository';
import { AppRouter } from '../../core/navigation/AppRouter';
import { AgreementRouteParams } from '../legal/LegalModels';
import { SessionStore } from '../../core/storage/SessionStore';
import { InputValidators } from '../../core/validation/InputValidators';
import { common } from '@kit.AbilityKit';
import { MerchantApplyStateStore } from '../../core/storage/MerchantApplyStateStore';
import { I18n } from '../../core/i18n/I18n';
import { MerchantSessionPolicy } from './MerchantSessionPolicy';

type LoginStatusKind = '' | 'just-applied' | 'required' | 'pending' | 'rejected' | 'disabled';

@Component
export struct LoginPage {
  onAuthenticated: () => void = () => {};
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private phone: string = '';
  @State private password: string = '';
  @State private smsCode: string = '';
  @State private smsMode: boolean = false;
  @State private agreed: boolean = false;
  @State private loading: boolean = false;
  @State private sendingCode: boolean = false;
  @State private countdown: number = 0;
  @State private statusKind: LoginStatusKind = '';
  @State private statusDetail: string = '';
  private countdownTimer: number = -1;

  aboutToAppear(): void {
    this.restoreApplyState();
  }

  private async restoreApplyState(): Promise<void> {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    const state = await MerchantApplyStateStore.take(context);
    if (state.phone) this.phone = state.phone;
    if (state.justApplied) {
      this.statusKind = 'just-applied';
    }
  }

  private statusTitle(): string {
    if (this.statusKind === 'required') return I18n.text(this.language, '尚未申请商家入驻', 'Merchant application required');
    if (this.statusKind === 'just-applied' || this.statusKind === 'pending') {
      return I18n.text(this.language, '入驻申请审核中', 'Application under review');
    }
    if (this.statusKind === 'rejected') return I18n.text(this.language, '入驻申请未通过', 'Application rejected');
    if (this.statusKind === 'disabled') return I18n.text(this.language, '商家账号已停用', 'Merchant account disabled');
    return '';
  }

  private statusDescription(): string {
    if (this.statusKind === 'required') {
      return I18n.text(this.language,
        '当前手机号没有可用商家身份，请先完成入驻申请。',
        'This phone number has no active merchant identity. Complete a merchant application first.');
    }
    if (this.statusKind === 'just-applied') {
      return I18n.text(this.language,
        '资料已提交，平台审核完成后即可使用该手机号登录。',
        'Your information has been submitted. You can sign in with this phone number after approval.');
    }
    if (this.statusKind === 'pending') {
      return I18n.text(this.language,
        '资料已提交，平台审核完成后即可进入商家工作台。',
        'Your information has been submitted. The merchant workbench will be available after approval.');
    }
    if (this.statusKind === 'rejected') {
      return this.statusDetail || I18n.text(this.language,
        '请修改资料后重新提交申请。', 'Update your information and submit the application again.');
    }
    if (this.statusKind === 'disabled') {
      return I18n.text(this.language,
        '如需恢复使用，请联系平台管理员。', 'Contact the platform administrator to restore access.');
    }
    return '';
  }

  aboutToDisappear(): void {
    if (this.countdownTimer >= 0) clearInterval(this.countdownTimer);
  }

  private isPhoneValid(): boolean {
    return InputValidators.isMainlandPhone(this.phone);
  }

  private async submit(): Promise<void> {
    if (this.loading) return;
    if (!this.agreed) {
      IBestToast.show(I18n.text(this.language, '请先阅读并同意商家入驻协议和隐私政策', 'Please read and accept the merchant agreement and privacy policy'));
      return;
    }
    if (!this.isPhoneValid()) {
      IBestToast.show(I18n.text(this.language, '请输入正确的11位手机号', 'Enter a valid 11-digit mobile number'));
      return;
    }
    if ((!this.smsMode && !InputValidators.isPassword(this.password)) ||
      (this.smsMode && !InputValidators.isSmsCode(this.smsCode))) {
      IBestToast.show(this.smsMode
        ? I18n.text(this.language, '请输入短信验证码', 'Enter the SMS verification code')
        : I18n.text(this.language, '密码长度应为6至32位', 'Password must be 6–32 characters'));
      return;
    }
    this.loading = true;
    try {
      const session = this.smsMode
        ? await AuthRepository.smsLogin(this.phone, this.smsCode)
        : await AuthRepository.passwordLogin(this.phone, this.password);
      await this.handleSession(session);
    } catch (error) {
      const message = error instanceof ApiError ? error.message
        : I18n.text(this.language, '登录失败，请稍后重试', 'Sign-in failed. Try again later.');
      if (this.smsMode && error instanceof ApiError && error.code === 1002) {
        IBestDialogUtil.open({
          title: I18n.text(this.language, '该手机号尚未注册商家账号', 'No merchant account found for this phone number'),
          message: I18n.text(this.language,
            '验证码登录只用于已有商家账号。你可以先完成商家入驻申请。',
            'SMS sign-in is only available to existing merchant accounts. Complete a merchant application first.'),
          showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
          confirmButtonText: I18n.text(this.language, '立即申请入驻', 'Apply now'),
          confirmButtonColor: DesignTokens.brand(this.darkMode),
          onConfirm: () => AppRouter.push('MerchantApply')
        });
      } else {
        IBestToast.show(message);
      }
    } finally {
      this.loading = false;
    }
  }

  private async handleSession(session: MerchantLoginSession): Promise<void> {
    const application = session.merchantApplication;
    if (MerchantSessionPolicy.canEnterWorkbench(session)) {
      await SessionStore.shared().save(session);
      if (session.user.hasPassword === false) {
        AppRouter.push('SetPassword');
        return;
      }
      this.onAuthenticated();
      return;
    }
    if (!application) {
      this.statusKind = 'required';
      this.statusDetail = '';
      return;
    }
    if (application.status === 'pending') {
      this.statusKind = 'pending';
      this.statusDetail = '';
    } else if (application.status === 'rejected') {
      this.statusKind = 'rejected';
      this.statusDetail = application.rejectReason || '';
    } else {
      this.statusKind = 'disabled';
      this.statusDetail = '';
    }
  }

  private async sendCode(): Promise<void> {
    if (this.sendingCode || this.countdown > 0) return;
    if (!this.isPhoneValid()) {
      IBestToast.show(I18n.text(this.language, '请先输入正确的手机号', 'Enter a valid mobile number first'));
      return;
    }
    this.sendingCode = true;
    try {
      await AuthRepository.sendSmsCode(this.phone, 'login');
      IBestToast.show(I18n.text(this.language, '验证码已发送', 'Verification code sent'));
      this.countdown = 60;
      if (this.countdownTimer >= 0) clearInterval(this.countdownTimer);
      this.countdownTimer = setInterval((): void => {
        this.countdown -= 1;
        if (this.countdown <= 0 && this.countdownTimer >= 0) {
          clearInterval(this.countdownTimer);
          this.countdownTimer = -1;
        }
      }, 1000);
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '验证码发送失败', 'Failed to send verification code'));
    } finally {
      this.sendingCode = false;
    }
  }

  @Builder
  private brandMark() {
    Stack() {
      Column().width(72).height(72).borderRadius(24).backgroundColor(DesignTokens.brand(this.darkMode));
      Text(I18n.text(this.language, '经纬', 'Jingwei'))
        .fontSize(22)
        .fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.onBrand(this.darkMode));
    }
    .width(72)
    .height(72);
  }

  build() {
    Scroll() {
      Column({ space: 18 }) {
        this.brandMark();
        Column({ space: 5 }) {
          Text(I18n.text(this.language, '经纬科技商家端', 'Jingwei Merchant'))
            .fontSize(28)
            .fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.text(this.darkMode));
          Text(this.smsMode
            ? I18n.text(this.language, '使用短信验证码登录已有商家账号', 'Sign in to an existing merchant account with an SMS code')
            : I18n.text(this.language, '手机号与密码登录', 'Phone number and password'))
            .fontSize(14)
            .fontColor(DesignTokens.muted(this.darkMode));
        }

        if (this.statusKind) {
          Column({ space: 8 }) {
            Text(this.statusTitle())
              .fontSize(18)
              .fontWeight(FontWeight.Medium)
              .fontColor(DesignTokens.text(this.darkMode));
            Text(this.statusDescription())
              .fontSize(14)
              .fontColor(DesignTokens.muted(this.darkMode))
              .lineHeight(21);
          }
          .width('100%')
          .padding(18)
          .alignItems(HorizontalAlign.Start)
          .backgroundColor(DesignTokens.brandTint(this.darkMode))
          .borderRadius(DesignTokens.RADIUS_LARGE);
        }

        Column() {
          IBestField({
            value: $phone,
            label: I18n.text(this.language, '手机号', 'Phone number'),
            placeholder: I18n.text(this.language, '请输入11位手机号', 'Enter an 11-digit mobile number'),
            type: 'phone'
          });
          if (this.smsMode) {
            IBestField({
              value: $smsCode,
              label: I18n.text(this.language, '验证码', 'Verification code'),
              placeholder: I18n.text(this.language, '请输入短信验证码', 'Enter the SMS code'),
              type: 'number'
            });
            Row() {
              Blank();
              IBestButton({
                text: this.countdown > 0
                  ? I18n.text(this.language, `${this.countdown}秒后重发`, `Resend in ${this.countdown}s`)
                  : (this.sendingCode
                    ? I18n.text(this.language, '发送中…', 'Sending…')
                    : I18n.text(this.language, '获取验证码', 'Get code')),
                buttonSize: 'small',
                plain: true,
                color: DesignTokens.brand(this.darkMode),
                loading: this.sendingCode,
                disabled: this.sendingCode || this.countdown > 0,
                onBtnClick: () => this.sendCode()
              });
            }
            .width('100%')
            .padding({ top: 8, right: 12 });
          } else {
            IBestField({
              value: $password,
              label: I18n.text(this.language, '密码', 'Password'),
              placeholder: I18n.text(this.language, '请输入6至32位密码', 'Enter a 6–32 character password'),
              type: 'password'
            });
          }
        }
        .width('100%')
        .padding({ top: 6, bottom: 6 })
        .backgroundColor(DesignTokens.card(this.darkMode))
        .borderRadius(DesignTokens.RADIUS_LARGE)
        .shadow({ radius: 20, color: '#24000000', offsetY: 8 });

        Row({ space: 8 }) {
          IBestCheckbox({
            value: this.agreed,
            shape: 'square',
            checkedColor: DesignTokens.brand(this.darkMode),
            onChange: value => this.agreed = value as boolean
          });
          Column({ space: 3 }) {
            Text(I18n.text(this.language, '我已阅读并同意以下协议：', 'I have read and accept:'))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
            Flex({ wrap: FlexWrap.Wrap }) {
              Text(I18n.text(this.language, '《商家入驻协议》', 'Merchant Agreement'))
                .fontSize(12).lineHeight(18).fontColor(DesignTokens.brand(this.darkMode))
                .onClick(() => AppRouter.push('Agreements', new AgreementRouteParams('user')));
              Text(I18n.text(this.language, '《隐私政策》', ' · Privacy Policy'))
                .fontSize(12).lineHeight(18).fontColor(DesignTokens.brand(this.darkMode))
                .onClick(() => AppRouter.push('Agreements', new AgreementRouteParams('privacy')));
              Text(I18n.text(this.language, '《个人信息收集清单》', ' · Personal Information Checklist'))
                .fontSize(12).lineHeight(18).fontColor(DesignTokens.brand(this.darkMode))
                .onClick(() => AppRouter.push('Agreements', new AgreementRouteParams('collect')));
            }.width('100%');
          }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        }
        .width('100%')
        .alignItems(VerticalAlign.Top);

        IBestButton({
          text: this.smsMode
            ? I18n.text(this.language, '验证码登录', 'Sign in with code')
            : I18n.text(this.language, '登录', 'Sign in'),
          type: 'primary',
          color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
          btnWidth: '100%',
          btnHeight: 50,
          btnBorderRadius: 16,
          loading: this.loading,
          disabled: this.loading,
          onBtnClick: () => this.submit()
        });

        Row({ space: 6 }) {
          IBestIcon({ name: this.smsMode ? 'lock' : 'chat-o', color: DesignTokens.brand(this.darkMode), iconSize: 15 });
          Text(this.smsMode
            ? I18n.text(this.language, '返回手机号密码登录', 'Use phone and password')
            : I18n.text(this.language, '忘记密码？使用验证码登录', 'Forgot password? Use an SMS code'))
            .fontSize(13)
            .fontColor(DesignTokens.brand(this.darkMode));
        }
        .height(44)
        .onClick(() => {
          this.smsMode = !this.smsMode;
          this.statusKind = '';
          this.statusDetail = '';
        });

        Row() {
          Text(I18n.text(this.language, '申请成为商家', 'Apply as a merchant'))
            .fontSize(14)
            .fontWeight(FontWeight.Medium)
            .fontColor(DesignTokens.brand(this.darkMode))
            .onClick(() => AppRouter.push('MerchantApply'));
          Text('  ·  ')
            .fontColor(DesignTokens.muted(this.darkMode));
          Text(I18n.text(this.language, '检查更新', 'Check for updates'))
            .fontSize(14)
            .fontColor(DesignTokens.muted(this.darkMode))
            .onClick(() => AppRouter.push('UpdateCenter'));
        }
        .height(44);
      }
      .width('100%')
      .padding({
        top: this.safeTop + 44,
        left: 24,
        right: 24,
        bottom: this.safeBottom + 24
      });
    }
    .width('100%')
    .height('100%')
    .align(Alignment.Top)
    .backgroundColor(DesignTokens.page(this.darkMode))
    .scrollBar(BarState.Off);
  }
}
