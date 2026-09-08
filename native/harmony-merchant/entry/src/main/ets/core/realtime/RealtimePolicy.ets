export class RealtimePolicy {
  static reconnectDelay(attempt: number): number {
    const normalized = Number.isFinite(attempt) ? Math.max(0, Math.floor(attempt)) : 0;
    return Math.min(30000, 1000 * Math.pow(2, Math.min(5, normalized)));
  }

  static acceptsEnvelope(version: number, event: string): boolean {
    return version === 1 && event.trim().length > 0;
  }
}
