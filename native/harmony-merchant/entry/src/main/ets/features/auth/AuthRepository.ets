import { ApiClient } from '../../core/network/ApiClient';
import {
  LogoutRequest,
  MerchantApplyRequest,
  MerchantApplyResult,
  MerchantLoginSession,
  PasswordLoginRequest,
  PhoneLoginRequest,
  SmsCodeRequest,
  SmsLoginRequest,
  ChangePasswordRequest,
  ChangePhoneRequest,
  ChangePhoneResult,
  MerchantUser
} from '../../core/model/AuthModels';
import { EmptyResult } from '../../core/model/ApiModels';
import { AppConfig } from '../../core/config/AppConfig';
import { SessionStore } from '../../core/storage/SessionStore';
import { HarmonyPushClient } from '../../core/push/HarmonyPushClient';
import { HarmonyRealtime } from '../../core/realtime/HarmonyRealtime';
import { SessionRecoveryDecision, SessionRecoveryPolicy } from '../../core/storage/SessionRecoveryPolicy';

export class AuthRepository {
  static async passwordLogin(phone: string, password: string): Promise<MerchantLoginSession> {
    const payload: PasswordLoginRequest = { phone, password };
    const result = await ApiClient.post<MerchantLoginSession>(
      `${AppConfig.API_PREFIX}/auth/merchant-password-login`,
      payload,
      false
    );
    return result;
  }

  static async smsLogin(phone: string, code: string): Promise<MerchantLoginSession> {
    const payload: SmsLoginRequest = { phone, code };
    const result = await ApiClient.post<MerchantLoginSession>(
      `${AppConfig.API_PREFIX}/auth/merchant-sms-login`,
      payload,
      false
    );
    return result;
  }

  static sendSmsCode(phone: string, scene: string): Promise<EmptyResult> {
    const payload: SmsCodeRequest = { phone, scene };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/auth/sms-code`, payload, false);
  }

  static async verifyRegistrationPhone(phone: string, code: string): Promise<MerchantLoginSession> {
    const payload: PhoneLoginRequest = { phone, code };
    const result = await ApiClient.post<MerchantLoginSession>(
      `${AppConfig.API_PREFIX}/auth/phone-login`,
      payload,
      false
    );
    // This session only authorizes the immediately following merchant-apply
    // request.  Keep it out of Asset Store so abandoning registration cannot
    // be mistaken for a merchant login after a process restart.
    SessionStore.shared().saveTransient(result);
    return result;
  }

  static merchantApply(payload: MerchantApplyRequest): Promise<MerchantApplyResult> {
    return ApiClient.post<MerchantApplyResult>(`${AppConfig.API_PREFIX}/u/merchant-apply`, payload);
  }

  static changePassword(oldPassword: string, newPassword: string): Promise<EmptyResult> {
    const payload: ChangePasswordRequest = { oldPassword, newPassword };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/auth/change-password`, payload);
  }

  static userInfo(): Promise<MerchantUser> {
    return ApiClient.get<MerchantUser>(`${AppConfig.API_PREFIX}/auth/user-info`);
  }

  static changePhone(oldSmsCode: string, newPhone: string, newSmsCode: string): Promise<ChangePhoneResult> {
    const payload: ChangePhoneRequest = { oldSmsCode, newPhone, newSmsCode };
    return ApiClient.post<ChangePhoneResult>(`${AppConfig.API_PREFIX}/auth/change-phone`, payload);
  }

  static async restore(): Promise<boolean> {
    await SessionStore.shared().hydrate();
    const session = SessionStore.shared();
    const decision = SessionRecoveryPolicy.decide(session.localSignOut, session.refreshToken, session.user);
    if (decision === SessionRecoveryDecision.SIGNED_OUT) return false;
    // Clean up temporary phone-verification sessions written by earlier
    // native builds.  A persisted user snapshot without a merchant binding is
    // an applicant, not an authenticated merchant workbench session.
    if (decision === SessionRecoveryDecision.DISCARD_APPLICANT) {
      await session.clear(false);
      return false;
    }
    // 冷启动只等待 Asset Store，不等待网络。首帧立即进入工作台；令牌校验在后台完成。
    AuthRepository.validateInBackground();
    return true;
  }

  private static async validateInBackground(): Promise<void> {
    const session = SessionStore.shared();
    if (!session.accessToken) {
      await ApiClient.refresh();
      try { await session.updateUser(await AuthRepository.userInfo()); } catch (_) {}
      return;
    }
    try {
      await session.updateUser(await AuthRepository.userInfo());
    } catch (_) {
      // ApiClient 只在服务端明确判定令牌失效时清理会话；断网会保留本地登录态。
    }
  }

  static async logout(notifySession: boolean = true): Promise<void> {
    const session = SessionStore.shared();
    const payload: LogoutRequest = { refreshToken: session.refreshToken };
    // Persist local intent before touching any remote state. Even if network
    // revocation or credential deletion later fails, a killed process cannot
    // revive the previous refresh token.
    await session.markSignedOut();
    try {
      try { await HarmonyPushClient.unregisterCurrent(); } catch (_) {}
      HarmonyRealtime.shared().stop();
      try {
        await ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/auth/logout`, payload);
      } catch (_) {
      }
    } finally {
      await session.clear(notifySession, true);
    }
  }

  /** Revoke the memory-only phone-verification session without a durable logout marker. */
  static discardApplicationSession(): void {
    const session = SessionStore.shared();
    const payload: LogoutRequest = { refreshToken: session.refreshToken };
    // The endpoint is public and the refresh token is sufficient for
    // revocation. Start the request before clearing memory, but do not make a
    // successfully committed merchant application wait for a weak network.
    const revocation = ApiClient.post<EmptyResult>(
      `${AppConfig.API_PREFIX}/auth/logout`, payload, false
    );
    session.discardTransient();
    revocation.catch((): void => {});
  }
}
