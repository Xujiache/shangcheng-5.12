import { asset } from '@kit.AssetStoreKit';
import { util } from '@kit.ArkTS';
import { BusinessError } from '@kit.BasicServicesKit';
import { AssetErrorPolicy } from './AssetErrorPolicy';

export class SecureStore {
  private static readonly encoder: util.TextEncoder = new util.TextEncoder();
  private static readonly decoder: util.TextDecoder = util.TextDecoder.create('utf-8');

  static async write(alias: string, secret: string): Promise<void> {
    const query: asset.AssetMap = new Map();
    query.set(asset.Tag.ALIAS, SecureStore.encode(alias));
    const update: asset.AssetMap = new Map();
    update.set(asset.Tag.SECRET, SecureStore.encode(secret));
    try {
      await asset.update(query, update);
      return;
    } catch (error) {
      const code = (error as BusinessError).code || 0;
      if (!AssetErrorPolicy.isMissing(code)) {
        throw new Error('Failed to write the protected session');
      }
    }
    const attributes: asset.AssetMap = new Map();
    attributes.set(asset.Tag.ALIAS, SecureStore.encode(alias));
    attributes.set(asset.Tag.SECRET, SecureStore.encode(secret));
    attributes.set(asset.Tag.ACCESSIBILITY, asset.Accessibility.DEVICE_POWERED_ON);
    try {
      await asset.add(attributes);
    } catch (error) {
      const code = (error as BusinessError).code || 0;
      if (!AssetErrorPolicy.isDuplicate(code)) {
        throw new Error('Failed to write the protected session');
      }
      // Another task may have created the same alias between update and add.
      // Retrying update makes the write idempotent without exposing secrets.
      try {
        await asset.update(query, update);
      } catch (_) {
        throw new Error('Failed to write the protected session');
      }
    }
  }

  static async read(alias: string): Promise<string> {
    const query: asset.AssetMap = new Map();
    query.set(asset.Tag.ALIAS, SecureStore.encode(alias));
    query.set(asset.Tag.RETURN_TYPE, asset.ReturnType.ALL);
    try {
      const records = await asset.query(query);
      if (records.length === 0) return '';
      const value = records[0].get(asset.Tag.SECRET) as Uint8Array;
      return SecureStore.decoder.decodeToString(value);
    } catch (error) {
      const code = (error as BusinessError).code || 0;
      if (AssetErrorPolicy.isMissing(code)) return '';
      // Service, database, access-control and corruption failures are not the
      // same as an absent credential. Propagate them so cold start can offer a
      // safe retry instead of falsely presenting a signed-out session.
      throw new Error('Failed to read the protected session');
    }
  }

  static async remove(alias: string): Promise<void> {
    const query: asset.AssetMap = new Map();
    query.set(asset.Tag.ALIAS, SecureStore.encode(alias));
    try {
      await asset.remove(query);
    } catch (error) {
      const code = (error as BusinessError).code || 0;
      if (AssetErrorPolicy.isMissing(code)) return;
      throw new Error('Failed to remove the protected session');
    }
  }

  private static encode(value: string): Uint8Array {
    return SecureStore.encoder.encodeInto(value);
  }
}
