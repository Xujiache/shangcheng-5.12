const SUPPORTED_BIZ_TYPES: string[] = [
  'product', 'avatar', 'idcard', 'apk', 'chat', 'misc', 'ledger-ad', 'feedback'
];

export class UploadPolicy {
  static normalizeBizType(rawValue: string): string {
    const value = rawValue.trim().toLowerCase();
    if (!SUPPORTED_BIZ_TYPES.includes(value)) {
      throw new Error(`Unsupported upload business type: ${rawValue}`);
    }
    return value;
  }

  static selectionLimit(requested: number): number {
    if (!Number.isFinite(requested) || requested <= 0) return 0;
    return Math.min(50, Math.floor(requested));
  }

  static shouldRefresh(responseCode: number, retryAllowed: boolean): boolean {
    return retryAllowed && responseCode === 401;
  }

  static isSuccessful(responseCode: number, envelopeCode: number, url: string): boolean {
    return responseCode >= 200 && responseCode < 300 && envelopeCode === 0 && url.trim().length > 0;
  }
}
