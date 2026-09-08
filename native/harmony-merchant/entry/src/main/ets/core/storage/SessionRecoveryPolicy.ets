import { MerchantUser } from '../model/AuthModels';

export enum SessionRecoveryDecision {
  SIGNED_OUT = 0,
  DISCARD_APPLICANT = 1,
  RESUME_MERCHANT = 2
}

/** Determines cold-start state from protected local data without any network dependency. */
export class SessionRecoveryPolicy {
  static decide(localSignOut: boolean, refreshToken: string, user?: MerchantUser): SessionRecoveryDecision {
    if (localSignOut) return SessionRecoveryDecision.SIGNED_OUT;
    if (!refreshToken) return SessionRecoveryDecision.SIGNED_OUT;
    if (user && !user.merchantId) return SessionRecoveryDecision.DISCARD_APPLICANT;
    // A user snapshot is non-authoritative and may legitimately be absent if
    // its optional write failed. A protected refresh token remains sufficient
    // to resume while user-info validation runs in the background.
    return SessionRecoveryDecision.RESUME_MERCHANT;
  }
}
