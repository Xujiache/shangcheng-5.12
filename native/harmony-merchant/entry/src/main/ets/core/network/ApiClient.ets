import { http } from '@kit.NetworkKit';
import { util } from '@kit.ArkTS';
import { AppConfig } from '../config/AppConfig';
import { ApiEnvelope } from '../model/ApiModels';
import { RefreshRequest, RefreshResult } from '../model/AuthModels';
import { SessionStore } from '../storage/SessionStore';
import { HarmonyRealtime } from '../realtime/HarmonyRealtime';
import { I18n } from '../i18n/I18n';
import { RefreshFailurePolicy, RefreshSingleFlight } from './RefreshPolicy';

interface ApiHeaders {
  'Accept': string;
  'Accept-Language': string;
  'Content-Type': string;
  'Authorization': string;
  'X-Client-Platform': string;
  'X-Client-Version': string;
  'X-Request-Id': string;
}

export class ApiError extends Error {
  readonly code: number;
  readonly traceId: string;

  constructor(code: number, message: string, traceId: string = '') {
    super(message);
    this.code = code;
    this.traceId = traceId;
  }
}

export class ApiClient {
  private static readonly refreshGate: RefreshSingleFlight = new RefreshSingleFlight();
  // PATCH is a valid HTTP method on all supported HarmonyOS API levels. The
  // enum member was added to the SDK typings later than the wire protocol.
  private static readonly PATCH_METHOD: http.RequestMethod = 'PATCH' as http.RequestMethod;

  static get<T>(path: string, authenticated: boolean = true): Promise<T> {
    return ApiClient.request<T>(path, http.RequestMethod.GET, undefined, authenticated);
  }

  static post<T>(path: string, body?: Object, authenticated: boolean = true): Promise<T> {
    return ApiClient.request<T>(path, http.RequestMethod.POST, body, authenticated);
  }

  static put<T>(path: string, body?: Object, authenticated: boolean = true): Promise<T> {
    return ApiClient.request<T>(path, http.RequestMethod.PUT, body, authenticated);
  }

  static patch<T>(path: string, body?: Object, authenticated: boolean = true): Promise<T> {
    return ApiClient.request<T>(path, ApiClient.PATCH_METHOD, body, authenticated);
  }

  static delete<T>(path: string, body?: Object, authenticated: boolean = true): Promise<T> {
    return ApiClient.request<T>(path, http.RequestMethod.DELETE, body, authenticated);
  }

  static async request<T>(
    path: string,
    method: http.RequestMethod,
    body?: Object,
    authenticated: boolean = true,
    retry: boolean = true
  ): Promise<T> {
    const request = http.createHttp();
    const session = SessionStore.shared();
    const headers: ApiHeaders = {
      'Accept': 'application/json',
      'Accept-Language': AppStorage.get<string>('language') || 'zh-CN',
      'Content-Type': 'application/json',
      'Authorization': authenticated && session.accessToken ? `Bearer ${session.accessToken}` : '',
      'X-Client-Platform': AppConfig.CLIENT_PLATFORM,
      'X-Client-Version': AppConfig.CLIENT_VERSION,
      'X-Request-Id': util.generateRandomUUID(true)
    };
    try {
      const response = await request.request(`${AppConfig.API_BASE_URL}${path}`, {
        method,
        header: headers,
        extraData: body ? JSON.stringify(body) : undefined,
        expectDataType: http.HttpDataType.STRING,
        connectTimeout: AppConfig.REQUEST_TIMEOUT_MS,
        readTimeout: AppConfig.REQUEST_TIMEOUT_MS
      });
      if (authenticated && retry && response.responseCode === 401) {
        const nextAccessToken = await ApiClient.refresh();
        if (nextAccessToken) {
          return ApiClient.request<T>(path, method, body, authenticated, false);
        }
      }
      let envelope: ApiEnvelope<T>;
      try {
        envelope = JSON.parse(response.result as string) as ApiEnvelope<T>;
      } catch (_) {
        throw new ApiError(
          response.responseCode,
          I18n.current('服务端返回了无效响应', 'The server returned an invalid response')
        );
      }
      if (response.responseCode < 200 || response.responseCode >= 300 || envelope.code !== 0) {
        const code = envelope.code || response.responseCode;
        const rawMessage = envelope.message || envelope.msg || I18n.current('请求失败', 'Request failed');
        throw new ApiError(
          code,
          I18n.apiError(code, rawMessage),
          envelope.traceId || ''
        );
      }
      return envelope.data;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(0, error instanceof Error ? error.message : I18n.current('网络连接失败', 'Network connection failed'));
    } finally {
      request.destroy();
    }
  }

  static async refresh(): Promise<string> {
    return ApiClient.refreshGate.run((): Promise<string> => ApiClient.performRefresh());
  }

  private static async performRefresh(): Promise<string> {
    const session = SessionStore.shared();
    if (!session.refreshToken) return '';
    const payload: RefreshRequest = { refreshToken: session.refreshToken };
    try {
      const result = await ApiClient.request<RefreshResult>(
        `${AppConfig.API_PREFIX}/auth/refresh`,
        http.RequestMethod.POST,
        payload,
        false,
        false
      );
      await session.rotate(result.accessToken, result.refreshToken);
      HarmonyRealtime.shared().updateToken();
      return result.accessToken;
    } catch (error) {
      if (error instanceof ApiError && RefreshFailurePolicy.clearsSession(error.code)) {
        await session.clear();
      }
      return '';
    }
  }
}
