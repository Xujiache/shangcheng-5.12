export class InputValidators {
  static isMainlandPhone(value: string): boolean {
    return /^1[3-9]\d{9}$/.test(value.trim());
  }

  static isPassword(value: string): boolean {
    return value.length >= 6 && value.length <= 32;
  }

  static isSmsCode(value: string): boolean {
    return /^\d{4,6}$/.test(value.trim());
  }

  static isHttpsUrl(value: string): boolean {
    return /^https:\/\/[^\s]+$/i.test(value.trim());
  }
}
