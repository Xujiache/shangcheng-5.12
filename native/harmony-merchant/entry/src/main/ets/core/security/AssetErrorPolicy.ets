/** Pure policy kept separate so Asset Store failure semantics are device-testable. */
export class AssetErrorPolicy {
  static readonly NOT_FOUND: number = 24000002;
  static readonly DUPLICATED: number = 24000003;

  static isMissing(code: number): boolean {
    return code === AssetErrorPolicy.NOT_FOUND;
  }

  static isDuplicate(code: number): boolean {
    return code === AssetErrorPolicy.DUPLICATED;
  }
}
