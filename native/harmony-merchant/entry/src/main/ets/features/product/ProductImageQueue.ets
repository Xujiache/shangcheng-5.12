export type ProductImageState = 'queued' | 'uploading' | 'ready' | 'failed';

export class ProductImageItem {
  id: string;
  preview: string;
  url: string;
  state: ProductImageState;
  constructor(id: string, preview: string, url: string = '', state: ProductImageState = 'queued') {
    this.id = id; this.preview = preview; this.url = url; this.state = state;
  }
}

// Immutable updates keep ArkUI image rows reactive, including partial upload failures.
export class ProductImageQueue {
  private revision: number = 0;
  private sequence: number = 0;
  static remote(urls: string[]): ProductImageItem[] {
    return urls.map((url: string, index: number) => new ProductImageItem(`remote-${index}-${url}`, url, url, 'ready'));
  }
  append(items: ProductImageItem[], uris: string[], limit: number): ProductImageItem[] {
    return items.concat(uris.slice(0, Math.max(0, limit - items.length)).map((uri: string) =>
      new ProductImageItem(`local-${++this.sequence}`, uri)));
  }
  cancel(): void { this.revision += 1; }
  static pending(items: ProductImageItem[]): boolean { return items.some((item: ProductImageItem) => item.state !== 'ready'); }
  async upload(items: ProductImageItem[], upload: (uri: string) => Promise<string>,
    publish: (items: ProductImageItem[]) => void, current: () => boolean): Promise<void> {
    const revision = ++this.revision;
    let next = items.slice();
    for (let index = 0; index < next.length; index += 1) {
      const item = next[index];
      if (item.state !== 'queued') continue;
      if (revision !== this.revision || !current()) return;
      next[index] = new ProductImageItem(item.id, item.preview, item.url, 'uploading');
      publish(next.slice());
      try {
        const url = await upload(item.preview);
        if (!/^https?:\/\//.test(url)) throw new Error('Invalid upload URL');
        if (revision !== this.revision || !current()) return;
        next[index] = new ProductImageItem(item.id, item.preview, url, 'ready');
      } catch (_) {
        if (revision !== this.revision || !current()) return;
        next[index] = new ProductImageItem(item.id, item.preview, '', 'failed');
      }
      publish(next.slice());
    }
  }
}
