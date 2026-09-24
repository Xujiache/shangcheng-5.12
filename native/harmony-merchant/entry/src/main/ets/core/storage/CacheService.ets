import { common } from '@kit.AbilityKit';
import { fileIo as fs } from '@kit.CoreFileKit';

export class CacheService {
  private static sizeOf(path: string): number {
    try {
      const stat = fs.statSync(path);
      if (!stat.isDirectory()) return Number(stat.size);
      let total: number = 0;
      fs.listFileSync(path).forEach((name: string): void => {
        total += CacheService.sizeOf(`${path}/${name}`);
      });
      return total;
    } catch (_) {
      return 0;
    }
  }

  private static clearChildren(path: string): void {
    let names: string[] = [];
    try {
      names = fs.listFileSync(path);
    } catch (_) {
      return;
    }
    names.forEach((name: string): void => {
      const child = `${path}/${name}`;
      try {
        const stat = fs.statSync(child);
        if (stat.isDirectory()) {
          CacheService.clearChildren(child);
          fs.rmdirSync(child);
        } else {
          fs.unlinkSync(child);
        }
      } catch (_) {
        // A concurrent system task may have already removed the cache entry.
      }
    });
  }

  static bytes(context: common.UIAbilityContext): number {
    return CacheService.sizeOf(context.cacheDir);
  }

  static clear(context: common.UIAbilityContext): void {
    // Only delete children of this application's private cache directory.
    CacheService.clearChildren(context.cacheDir);
  }

  static format(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
