/** Bound negative caching only. Successful images use the platform image cache. */
export class RemoteImagePolicy {
  private static unavailable: Map<string, number> = new Map<string, number>();
  static first(thumbnail: string, original: string, now: number = Date.now()): string {
    const expiry = RemoteImagePolicy.unavailable.get(thumbnail) || 0;
    if (expiry && expiry <= now) RemoteImagePolicy.unavailable.delete(thumbnail);
    return thumbnail && expiry <= now ? thumbnail : original;
  }
  static failedThumbnail(url: string, now: number = Date.now()): void {
    RemoteImagePolicy.unavailable.delete(url);
    RemoteImagePolicy.unavailable.set(url, now + 300000);
    if (RemoteImagePolicy.unavailable.size > 64) {
      const oldest = Array.from(RemoteImagePolicy.unavailable.keys())[0];
      RemoteImagePolicy.unavailable.delete(oldest);
    }
  }
}

export class ImageAttempt {
  id: number;
  url: string;
  constructor(id: number, url: string) { this.id = id; this.url = url; }
}
