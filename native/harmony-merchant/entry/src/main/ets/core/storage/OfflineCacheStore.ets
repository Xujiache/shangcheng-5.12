import { common } from '@kit.AbilityKit';
import { relationalStore } from '@kit.ArkData';

export interface OfflineCacheRecord<T> {
  value: T;
  updatedAt: number;
}

/**
 * Encrypted RDB storage for small, read-only business snapshots.
 *
 * Tokens never enter this database (they remain in Asset Store). Cached
 * snapshots are only a weak-network fallback and are always replaced by a
 * successful server response.
 */
export class OfflineCacheStore {
  private static context?: common.UIAbilityContext;
  private static storeTask?: Promise<relationalStore.RdbStore>;

  static async initialize(context: common.UIAbilityContext): Promise<void> {
    OfflineCacheStore.context = context;
    await OfflineCacheStore.store();
  }

  static async put<T>(key: string, value: T): Promise<void> {
    const store = await OfflineCacheStore.store();
    try {
      await store.executeSql(
        'INSERT OR REPLACE INTO cache_entries(cache_key, cache_value, updated_at) VALUES (?, ?, ?)',
        [key, JSON.stringify(value), Date.now()]
      );
    } catch (_) {
      throw new Error('Failed to cache the offline snapshot');
    }
  }

  static async get<T>(key: string): Promise<OfflineCacheRecord<T> | null> {
    const store = await OfflineCacheStore.store();
    let result: relationalStore.ResultSet | undefined;
    try {
      result = await store.querySql(
        'SELECT cache_value, updated_at FROM cache_entries WHERE cache_key = ? LIMIT 1',
        [key]
      );
      if (!result.goToFirstRow()) return null;
      return {
        value: JSON.parse(result.getString(0)) as T,
        updatedAt: result.getLong(1)
      };
    } catch (_) {
      return null;
    } finally {
      if (result) {
        try {
          result.close();
        } catch (_) {
        }
      }
    }
  }

  static async remove(key: string): Promise<void> {
    const store = await OfflineCacheStore.store();
    try {
      await store.executeSql('DELETE FROM cache_entries WHERE cache_key = ?', [key]);
    } catch (_) {
      throw new Error('Failed to remove the offline snapshot');
    }
  }

  static async clearAll(): Promise<void> {
    if (!OfflineCacheStore.context) return;
    const store = await OfflineCacheStore.store();
    try {
      await store.executeSql('DELETE FROM cache_entries');
    } catch (_) {
      throw new Error('Failed to clear the offline cache');
    }
  }

  private static async store(): Promise<relationalStore.RdbStore> {
    if (OfflineCacheStore.storeTask) return OfflineCacheStore.storeTask;
    if (!OfflineCacheStore.context) throw new Error('OfflineCacheStore is not initialized');
    let task: Promise<relationalStore.RdbStore>;
    try {
      task = relationalStore.getRdbStore(OfflineCacheStore.context, {
        name: 'jingwei_merchant_offline_cache.db',
        securityLevel: relationalStore.SecurityLevel.S2,
        encrypt: true
      }).then(async (store: relationalStore.RdbStore): Promise<relationalStore.RdbStore> => {
        try {
          await store.executeSql(
            'CREATE TABLE IF NOT EXISTS cache_entries (' +
            'cache_key TEXT PRIMARY KEY, cache_value TEXT NOT NULL, updated_at INTEGER NOT NULL)'
          );
          return store;
        } catch (_) {
          throw new Error('Failed to initialize the offline cache');
        }
      });
    } catch (_) {
      throw new Error('Failed to open the offline cache');
    }
    OfflineCacheStore.storeTask = task;
    try {
      return await task;
    } catch (error) {
      OfflineCacheStore.storeTask = undefined;
      throw error instanceof Error ? error : new Error('Failed to open offline cache');
    }
  }
}
