// Shared by the overlay and every primary scroll surface, in vp.
export class PrimaryNavigationMetrics {
  static readonly HEIGHT: number = 76;
  static readonly FLOAT_GAP: number = 8;
  static readonly CONTENT_GAP: number = 16;

  static contentInset(safeBottom: number): number {
    return Math.max(0, safeBottom) + PrimaryNavigationMetrics.HEIGHT +
      PrimaryNavigationMetrics.FLOAT_GAP + PrimaryNavigationMetrics.CONTENT_GAP;
  }
}
