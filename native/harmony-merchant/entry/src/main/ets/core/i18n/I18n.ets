export type AppLanguage = 'zh-CN' | 'en-US';

/**
 * Lightweight native text selector for copy that cannot be represented by a
 * static resource (for example status mappings and interpolated messages).
 *
 * Every ArkUI page passes its reactive @StorageLink('language') value so a
 * language switch invalidates the exact nodes which display translated copy.
 */
export class I18n {
  static text(language: string, chinese: string, english: string): string {
    return language === 'en-US' ? english : chinese;
  }

  static current(chinese: string, english: string): string {
    return I18n.text(AppStorage.get<string>('language') || 'zh-CN', chinese, english);
  }

  /** Resolves locale-neutral UI state without caching translated copy in @State. */
  static state(language: string, value: string): string {
    if (value === 'i18n:product-load') return I18n.text(language, '商品加载失败', 'Failed to load products');
    if (value === 'i18n:category-load') return I18n.text(language, '分类加载失败', 'Failed to load categories');
    if (value === 'i18n:dashboard-load') return I18n.text(language, '经营数据加载失败', 'Failed to load business data');
    if (value === 'i18n:conversations-load') return I18n.text(language, '会话加载失败', 'Failed to load conversations');
    if (value === 'i18n:conversation-detail-load') {
      return I18n.text(language, '会话信息加载失败', 'Failed to load conversation details');
    }
    if (value === 'i18n:message-history-load') return I18n.text(language, '历史消息加载失败', 'Failed to load message history');
    if (value === 'i18n:agreement-load') return I18n.text(language, '协议加载失败', 'Failed to load agreement');
    if (value === 'i18n:orders-load') return I18n.text(language, '订单加载失败', 'Failed to load orders');
    if (value === 'i18n:refunds-load') return I18n.text(language, '售后加载失败', 'Failed to load after-sales requests');
    if (value === 'i18n:stats-load') return I18n.text(language, '经营数据加载失败', 'Failed to load business data');
    return value;
  }

  /** Localizes stable platform error codes while preserving detailed server copy. */
  static apiError(code: number, fallback: string): string {
    if ((AppStorage.get<string>('language') || 'zh-CN') !== 'en-US') return fallback;
    if (code === 1001 || code === 400) return 'Some information is invalid. Check it and try again.';
    if (code === 1002 || code === 404) return 'The requested resource was not found.';
    if (code === 1003 || code === 409) return 'This operation conflicts with the latest data. Refresh and try again.';
    if (code === 2001 || code === 401) return 'Your sign-in session is no longer valid. Sign in again.';
    if (code === 2002) return 'Your session has expired. Sign in again.';
    if (code === 2003 || code === 403) return 'You do not have permission to perform this operation.';
    if (code === 3001) return 'This product is offline.';
    if (code === 3002) return 'There is not enough stock for this operation.';
    if (code === 4001) return 'The order status has changed. Refresh and try again.';
    if (code === 5001) return 'Payment could not be completed.';
    if (code === 6001) return 'Your membership has expired.';
    if (code >= 500) return 'The service is temporarily unavailable. Try again later.';
    return fallback;
  }

  /** Marks a server-owned Chinese business key which must not be translated. */
  static contract(value: string): string {
    return value;
  }
}
