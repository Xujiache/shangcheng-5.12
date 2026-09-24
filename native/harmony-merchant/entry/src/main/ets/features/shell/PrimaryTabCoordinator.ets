export type PrimaryTabTarget = 'home' | 'product' | 'order' | 'stats' | 'me';

export class PrimaryTabCoordinator {
  static open(target: PrimaryTabTarget, status: string = ''): void {
    AppStorage.setOrCreate('primaryTabTarget', target);
    AppStorage.setOrCreate('primaryTabStatus', status);
    const current = AppStorage.get<number>('primaryTabIntentEpoch') || 0;
    AppStorage.setOrCreate('primaryTabIntentEpoch', current + 1);
  }
}
