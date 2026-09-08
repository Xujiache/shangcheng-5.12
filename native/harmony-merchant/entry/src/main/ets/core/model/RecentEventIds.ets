/** A bounded in-memory replay window for realtime and Push event identifiers. */
export class RecentEventIds {
  private readonly capacity: number;
  private values: string[] = [];

  constructor(capacity: number = 200) {
    this.capacity = Math.max(1, Math.floor(capacity));
  }

  accept(raw: string): boolean {
    const value = raw.trim().slice(0, 256);
    if (!value) return true;
    if (this.values.includes(value)) return false;
    this.values.push(value);
    if (this.values.length > this.capacity) this.values.shift();
    return true;
  }

  clear(): void {
    this.values = [];
  }
}
