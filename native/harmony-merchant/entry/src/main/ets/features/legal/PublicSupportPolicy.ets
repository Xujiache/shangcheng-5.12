export class PublicSupportPolicy {
  static dialablePhone(value?: string | null): string {
    const original = value?.trim() || '';
    if (!original) return '';
    const compact = original.replace(/[\s()-]/g, '');
    if (/^400\d{7}$/.test(compact)) return original;
    if (/^1[3-9]\d{9}$/.test(compact)) return original;
    if (/^0\d{9,11}$/.test(compact)) return original;
    if (/^\+[1-9]\d{6,14}$/.test(compact)) return original;
    return '';
  }
}
