import { AppConfig } from '../config/AppConfig';
import { MerchantLoginSession, MerchantUser } from '../model/AuthModels';
import { SecureStore } from '../security/SecureStore';
import { OfflineCacheStore } from './OfflineCacheStore';

export class SessionStore {
  private static instance?: SessionStore;

  accessToken: string = '';
  refreshToken: string = '';
  user?: MerchantUser;
  hydrated: boolean = false;
  localSignOut: boolean = false;

  static shared(): SessionStore {
    if (!SessionStore.instance) SessionStore.instance = new SessionStore();
    return SessionStore.instance;
  }

  async hydrate(): Promise<boolean> {
    // A durable sign-out marker is authoritative and is read first. Stale
    // credential records may be unavailable or corrupted after logout, but
    // that must never trap an intentionally signed-out user on the recovery
    // error screen.
    this.localSignOut = (await SecureStore.read(AppConfig.LOCAL_SIGN_OUT_ALIAS)).length > 0;
    if (this.localSignOut) {
      this.accessToken = '';
      this.refreshToken = '';
      this.user = undefined;
      this.hydrated = true;
      return false;
    }
    const tokens = await Promise.all([
      SecureStore.read(AppConfig.ACCESS_TOKEN_ALIAS),
      SecureStore.read(AppConfig.REFRESH_TOKEN_ALIAS),
      SecureStore.read(AppConfig.USER_SNAPSHOT_ALIAS)
    ]);
    this.accessToken = tokens[0];
    this.refreshToken = tokens[1];
    try {
      this.user = tokens[2] ? JSON.parse(tokens[2]) as MerchantUser : undefined;
    } catch (_) {
      this.user = undefined;
    }
    this.hydrated = true;
    return this.refreshToken.length > 0;
  }

  async save(session: MerchantLoginSession): Promise<void> {
    // Persist the refresh token first.  A missing access token is recoverable
    // by refresh after cold start; a stale one-time refresh token is not.
    await SecureStore.write(AppConfig.REFRESH_TOKEN_ALIAS, session.refreshToken);
    try {
      await SecureStore.write(AppConfig.ACCESS_TOKEN_ALIAS, session.accessToken);
    } catch (_) {
      await SecureStore.remove(AppConfig.ACCESS_TOKEN_ALIAS);
    }
    try {
      await SecureStore.write(AppConfig.USER_SNAPSHOT_ALIAS, JSON.stringify(session.user));
    } catch (_) {
      // Token persistence defines the session. A noncritical display snapshot must not turn a valid login into a false failure.
    }
    // Remove the protected sign-out tombstone last. If this fails, the login
    // remains safely suppressed on the next cold start and the caller can
    // retry instead of reviving an older session accidentally.
    await SecureStore.remove(AppConfig.LOCAL_SIGN_OUT_ALIAS);
    this.localSignOut = false;
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.user = session.user;
  }

  /**
   * Keep a short-lived authenticated context in memory only.
   *
   * Phone verification during merchant application returns a regular token
   * pair because the following application request is authenticated.  It is
   * not, however, a merchant login session and must never survive a process
   * restart.  Persisting it would let an unfinished applicant cold-start into
   * the merchant shell without a bound merchant.
   */
  saveTransient(session: MerchantLoginSession): void {
    this.accessToken = session.accessToken;
    this.refreshToken = session.refreshToken;
    this.user = session.user;
  }

  /** Remove an unfinished applicant session without touching a real merchant login. */
  discardTransient(): void {
    if (this.user?.merchantId) return;
    this.accessToken = '';
    this.refreshToken = '';
    this.user = undefined;
  }

  async updateUser(user: MerchantUser): Promise<void> {
    this.user = user;
    try {
      await SecureStore.write(AppConfig.USER_SNAPSHOT_ALIAS, JSON.stringify(user));
    } catch (_) {
      // Keep the current in-memory user valid; the next successful profile refresh can persist it again.
    }
  }

  async rotate(accessToken: string, refreshToken: string): Promise<void> {
    // The server has already consumed the previous one-time refresh token by
    // the time this method runs. Keep the new pair usable in this process even
    // if Asset Store is temporarily unavailable. In that failure case remove
    // stale persisted credentials so a later cold start safely asks the user
    // to sign in instead of retrying a token the server has already revoked.
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    try {
      await SecureStore.write(AppConfig.REFRESH_TOKEN_ALIAS, refreshToken);
    } catch (_) {
      try { await SecureStore.remove(AppConfig.REFRESH_TOKEN_ALIAS); } catch (_) {}
      try { await SecureStore.remove(AppConfig.ACCESS_TOKEN_ALIAS); } catch (_) {}
      return;
    }
    try {
      await SecureStore.write(AppConfig.ACCESS_TOKEN_ALIAS, accessToken);
    } catch (_) {
      try { await SecureStore.remove(AppConfig.ACCESS_TOKEN_ALIAS); } catch (_) {}
    }
  }

  async markSignedOut(): Promise<void> {
    await SecureStore.write(AppConfig.LOCAL_SIGN_OUT_ALIAS, '1');
    this.localSignOut = true;
  }

  async clear(notify: boolean = true, markerReady: boolean = false): Promise<void> {
    if (!markerReady) await this.markSignedOut();
    this.accessToken = '';
    this.refreshToken = '';
    this.user = undefined;
    // The durable tombstone above is authoritative. Credential cleanup is
    // best-effort because an Asset Store outage must not resurrect a session
    // or leave the UI stuck after the server has revoked it.
    try { await SecureStore.remove(AppConfig.REFRESH_TOKEN_ALIAS); } catch (_) {}
    try { await SecureStore.remove(AppConfig.ACCESS_TOKEN_ALIAS); } catch (_) {}
    try { await SecureStore.remove(AppConfig.USER_SNAPSHOT_ALIAS); } catch (_) {}
    try {
      await OfflineCacheStore.clearAll();
    } catch (_) {
      // Failure to clear a non-authoritative cache must not trap the user in a session.
    }
    if (notify) {
      const epoch = AppStorage.get<number>('sessionEpoch') || 0;
      AppStorage.setOrCreate<number>('sessionEpoch', epoch + 1);
    }
  }
}
