import {
  IBestButton,
  IBestField,
  IBestNavBar,
  IBestSteps,
  IBestStep,
  IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { MerchantApplyRequest } from '../../core/model/AuthModels';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { AuthRepository } from './AuthRepository';
import { InputValidators } from '../../core/validation/InputValidators';
import { common } from '@kit.AbilityKit';
import { MerchantApplyStateStore } from '../../core/storage/MerchantApplyStateStore';
import { I18n } from '../../core/i18n/I18n';
import { SessionStore } from '../../core/storage/SessionStore';

@Builder
export function MerchantApplyBuilder(_: string) {
  MerchantApplyPage();
}

@Component
struct MerchantApplyPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  private readonly stepsGroupId: string = 'merchant-apply-steps';
  @State private step: number = 0;
  @State private phone: string = '';
  @State private smsCode: string = '';
  @State private password: string = '';
  @State private confirmPassword: string = '';
  @State private accountHasPassword: boolean = false;
  @State private countdown: number = 0;
  @State private merchantType: string = 'store';
  @State private merchantName: string = '';
  @State private legalName: string = '';
  @State private creditCode: string = '';
  @State private legalRep: string = '';
  @State private contact: string = '';
  @State private region: string = '';
  @State private address: string = '';
  @State private categories: string[] = [];
  @State private sendingCode: boolean = false;
  @State private submitting: boolean = false;
  @State private applyId: string = '';
  private countdownTimer: number = -1;
  private readonly categoryOptions: string[] = [
    I18n.contract('家具'), I18n.contract('窗帘布艺'), I18n.contract('灯具'), I18n.contract('装饰')
  ];

  private categoryLabel(value: string): string {
    if (value === I18n.contract('家具')) return I18n.text(this.language, '家具', 'Furniture');
    if (value === I18n.contract('窗帘布艺')) return I18n.text(this.language, '窗帘布艺', 'Curtains and fabrics');
    if (value === I18n.contract('灯具')) return I18n.text(this.language, '灯具', 'Lighting');
    if (value === I18n.contract('装饰')) return I18n.text(this.language, '装饰', 'Decor');
    return value;
  }

  aboutToDisappear(): void {
    if (this.countdownTimer >= 0) clearInterval(this.countdownTimer);
    SessionStore.shared().discardTransient();
  }

  private validPhone(): boolean {
    return InputValidators.isMainlandPhone(this.phone);
  }

  private async sendCode(): Promise<void> {
    if (this.sendingCode || this.countdown > 0) return;
    if (!this.validPhone()) {
      IBestToast.show(I18n.text(this.language, '请输入正确的11位手机号', 'Enter a valid 11-digit mobile number'));
      return;
    }
    this.sendingCode = true;
    try {
      await AuthRepository.sendSmsCode(this.phone, 'register');
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

  private async verifyPhone(): Promise<void> {
    if (this.submitting) return;
    if (!this.validPhone() || !InputValidators.isSmsCode(this.smsCode)) {
      IBestToast.show(I18n.text(this.language, '请填写正确的手机号和验证码', 'Enter a valid phone number and verification code'));
      return;
    }
    this.submitting = true;
    try {
      const session = await AuthRepository.verifyRegistrationPhone(this.phone, this.smsCode);
      this.accountHasPassword = session.user.hasPassword === true;
      this.step = this.accountHasPassword ? 2 : 1;
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '手机号验证失败', 'Phone verification failed'));
    } finally {
      this.submitting = false;
    }
  }

  private continuePassword(): void {
    if (!InputValidators.isPassword(this.password)) {
      IBestToast.show(I18n.text(this.language, '密码长度应为6至32位', 'Password must be 6–32 characters'));
      return;
    }
    if (this.password !== this.confirmPassword) {
      IBestToast.show(I18n.text(this.language, '两次输入的密码不一致', 'The passwords do not match'));
      return;
    }
    this.step = 2;
  }

  private async submitApplication(): Promise<void> {
    if (this.submitting) return;
    if (!this.merchantName || !this.legalName || !this.creditCode || !this.legalRep ||
      !this.contact || !this.region || !this.address || this.categories.length === 0) {
      IBestToast.show(I18n.text(this.language, '请完整填写主体、联系人和经营品类', 'Complete the business, contact and operating category information'));
      return;
    }
    const payload: MerchantApplyRequest = {
      type: this.merchantType,
      name: this.merchantName,
      legalName: this.legalName,
      creditCode: this.creditCode,
      legalRep: this.legalRep,
      contact: this.contact,
      contactPhone: this.phone,
      region: this.region,
      address: this.address,
      categories: this.categories
    };
    if (!this.accountHasPassword) payload.password = this.password;
    this.submitting = true;
    try {
      const result = await AuthRepository.merchantApply(payload);
      this.applyId = result.applyId;
      await MerchantApplyStateStore.save(
        this.getUIContext().getHostContext() as common.UIAbilityContext,
        this.phone
      );
      // 移除短信验证产生的临时会话，但保留当前路由以完整展示第四步成功状态。
      AuthRepository.discardApplicationSession();
      this.password = '';
      this.confirmPassword = '';
      this.step = 3;
    } catch (error) {
      const message = error instanceof ApiError ? error.message
        : I18n.text(this.language, '入驻申请提交失败', 'Failed to submit merchant application');
      if (error instanceof ApiError && error.code === 2001) {
        AuthRepository.discardApplicationSession();
        this.smsCode = '';
        this.password = '';
        this.confirmPassword = '';
        this.step = 0;
        IBestToast.show(I18n.text(this.language, '手机号验证已过期，请重新获取验证码', 'Phone verification expired. Request a new code.'));
      } else {
        IBestToast.show(message);
      }
    } finally {
      this.submitting = false;
    }
  }

  private toggleCategory(value: string): void {
    this.categories = this.categories.includes(value)
      ? this.categories.filter((item: string) => item !== value)
      : this.categories.concat([value]);
  }

  @Builder
  private phoneStep() {
    Column({ space: 12 }) {
      IBestField({ value: $phone, label: I18n.text(this.language, '手机号', 'Phone number'), placeholder: I18n.text(this.language, '请输入11位手机号', 'Enter an 11-digit mobile number'), type: 'phone' });
      IBestField({ value: $smsCode, label: I18n.text(this.language, '验证码', 'Verification code'), placeholder: I18n.text(this.language, '请输入短信验证码', 'Enter the SMS code'), type: 'number' });
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
      IBestButton({
        text: I18n.text(this.language, '验证手机号', 'Verify phone'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: '100%', loading: this.submitting, disabled: this.submitting, onBtnClick: () => this.verifyPhone()
      });
    }
  }

  @Builder
  private passwordStep() {
    Column({ space: 12 }) {
      Text(I18n.text(this.language, '请设置以后登录商家端使用的密码', 'Set the password you will use to sign in to the merchant app'))
        .fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      IBestField({ value: $password, label: I18n.text(this.language, '新密码', 'New password'), placeholder: I18n.text(this.language, '请输入6至32位密码', 'Enter a 6–32 character password'), type: 'password' });
      IBestField({ value: $confirmPassword, label: I18n.text(this.language, '确认密码', 'Confirm password'), placeholder: I18n.text(this.language, '请再次输入密码', 'Enter the password again'), type: 'password' });
      IBestButton({
        text: I18n.text(this.language, '下一步', 'Next'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: '100%', onBtnClick: () => this.continuePassword()
      });
    }
  }

  @Builder
  private profileStep() {
    Column({ space: 12 }) {
      Row({ space: 10 }) {
        IBestButton({
          text: I18n.text(this.language, '厂家', 'Factory'), buttonSize: 'small',
          type: this.merchantType === 'factory' ? 'primary' : 'default',
          color: this.merchantType === 'factory' ? DesignTokens.brand(this.darkMode) : '',
          onBtnClick: () => this.merchantType = 'factory'
        });
        IBestButton({
          text: I18n.text(this.language, '门店', 'Store'), buttonSize: 'small',
          type: this.merchantType === 'store' ? 'primary' : 'default',
          color: this.merchantType === 'store' ? DesignTokens.brand(this.darkMode) : '',
          onBtnClick: () => this.merchantType = 'store'
        });
      }.width('100%');
      IBestField({ value: $merchantName, label: I18n.text(this.language, '商家名称', 'Merchant name'), placeholder: I18n.text(this.language, '请输入对外展示名称', 'Enter the public display name') });
      IBestField({ value: $legalName, label: I18n.text(this.language, '主体名称', 'Legal entity name'), placeholder: I18n.text(this.language, '请输入营业执照主体名称', 'Enter the name on the business license') });
      IBestField({ value: $creditCode, label: I18n.text(this.language, '信用代码', 'Unified credit code'), placeholder: I18n.text(this.language, '请输入统一社会信用代码', 'Enter the unified social credit code') });
      IBestField({ value: $legalRep, label: I18n.text(this.language, '法人代表', 'Legal representative'), placeholder: I18n.text(this.language, '请输入法人姓名', 'Enter the legal representative name') });
      IBestField({ value: $contact, label: I18n.text(this.language, '联系人', 'Contact'), placeholder: I18n.text(this.language, '请输入业务联系人', 'Enter the business contact') });
      IBestField({ value: $region, label: I18n.text(this.language, '经营地区', 'Operating region'), placeholder: I18n.text(this.language, '省 / 市 / 区', 'Province / City / District') });
      IBestField({ value: $address, label: I18n.text(this.language, '详细地址', 'Detailed address'), placeholder: I18n.text(this.language, '街道、门牌号等', 'Street and building number') });
      Column({ space: 8 }) {
        Text(I18n.text(this.language, '经营品类（至少选择一项）', 'Operating categories (select at least one)')).fontSize(14).fontWeight(FontWeight.Medium).width('100%');
        Row({ space: 8 }) {
          ForEach(this.categoryOptions, (item: string) => {
            Text(this.categoryLabel(item)).fontSize(12).fontColor(this.categories.includes(item) ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode))
              .padding({ left: 10, right: 10, top: 8, bottom: 8 })
              .backgroundColor(this.categories.includes(item) ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
              .borderRadius(16).onClick(() => this.toggleCategory(item));
          }, (item: string) => item);
        }.width('100%');
      }.width('100%').alignItems(HorizontalAlign.Start);
      IBestButton({
        text: I18n.text(this.language, '提交入驻申请', 'Submit application'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: '100%', loading: this.submitting, disabled: this.submitting, onBtnClick: () => this.submitApplication()
      });
    }
  }

  @Builder
  private successStep() {
    Column({ space: 14 }) {
      MerchantIcon({ name: 'success', color: DesignTokens.success(this.darkMode), iconSize: 46 });
      Text(I18n.text(this.language, '入驻申请已提交', 'Application submitted')).fontSize(22).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
      Text(I18n.text(this.language, '平台审核完成后即可使用手机号和密码登录。', 'You can sign in with your phone number and password after platform approval.'))
        .fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
      if (this.applyId) {
        Text(I18n.text(this.language, `申请编号：${this.applyId}`, `Application ID: ${this.applyId}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }
      IBestButton({
        text: I18n.text(this.language, '返回登录', 'Back to sign in'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        onBtnClick: () => AppRouter.back()
      });
    }
    .height(320)
    .justifyContent(FlexAlign.Center);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '商家入驻', 'Merchant application'),
          isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 22 }) {
            IBestSteps({ groupId: this.stepsGroupId, active: this.step }) {
              IBestStep({ groupId: this.stepsGroupId, title: I18n.text(this.language, '验证手机', 'Verify phone') });
              IBestStep({ groupId: this.stepsGroupId, title: I18n.text(this.language, '设置密码', 'Set password') });
              IBestStep({ groupId: this.stepsGroupId, title: I18n.text(this.language, '填写资料', 'Business details') });
              IBestStep({ groupId: this.stepsGroupId, title: I18n.text(this.language, '等待审核', 'Under review') });
            }
            Column() {
              if (this.step === 0) this.phoneStep();
              else if (this.step === 1) this.passwordStep();
              else if (this.step === 2) this.profileStep();
              else this.successStep();
            }
            .width('100%')
            .padding(18)
            .backgroundColor(DesignTokens.card(this.darkMode))
            .borderRadius(DesignTokens.RADIUS_LARGE);
          }
          .width('100%')
          .padding({ left: 16, right: 16, top: 18, bottom: this.safeBottom + 24 });
        }
        .layoutWeight(1)
        .align(Alignment.Top)
        .scrollBar(BarState.Off);
      }
      .width('100%')
      .height('100%')
      .backgroundColor(DesignTokens.page(this.darkMode));
    }
    .hideTitleBar(true);
  }
}
