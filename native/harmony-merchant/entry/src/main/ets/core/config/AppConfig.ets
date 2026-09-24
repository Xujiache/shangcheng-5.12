export class AppConfig {
  static readonly API_BASE_URL: string = 'https://ewsn.top';
  static readonly API_PREFIX: string = '/api/v1';
  static readonly HARMONY_WS_URL: string = 'wss://ewsn.top/ws/harmony/merchant';
  static readonly CLIENT_PLATFORM: string = 'merchant-harmony';
  static readonly CLIENT_VERSION: string = '1.0.0';
  static readonly CLIENT_VERSION_CODE: number = 1000000;
  static readonly REQUEST_TIMEOUT_MS: number = 15000;
  static readonly ACCESS_TOKEN_ALIAS: string = 'jingwei_merchant_access_token';
  static readonly REFRESH_TOKEN_ALIAS: string = 'jingwei_merchant_refresh_token';
  static readonly USER_SNAPSHOT_ALIAS: string = 'jingwei_merchant_user_snapshot';
  static readonly LOCAL_SIGN_OUT_ALIAS: string = 'jingwei_merchant_local_sign_out';
  static readonly APP_GALLERY_URL: string =
    'https://appgallery.huawei.com/app/detail?id=top.ewsn.jingwei.merchant';
}
