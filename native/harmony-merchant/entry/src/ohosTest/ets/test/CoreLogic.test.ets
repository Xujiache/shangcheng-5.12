import { describe, expect, it } from '@ohos/hypium';
import { withQuery } from '../../../main/ets/core/network/QueryString';
import { InputValidators } from '../../../main/ets/core/validation/InputValidators';
import { HarmonyRelease } from '../../../main/ets/features/update/UpdateModels';
import { UpdatePolicy } from '../../../main/ets/features/update/UpdatePolicy';
import { I18n } from '../../../main/ets/core/i18n/I18n';
import { CommerceEventPolicy } from '../../../main/ets/core/realtime/CommerceEventPolicy';
import { RealtimePolicy } from '../../../main/ets/core/realtime/RealtimePolicy';
import { RefreshFailurePolicy, RefreshSingleFlight } from '../../../main/ets/core/network/RefreshPolicy';
import { PushRoutePolicy } from '../../../main/ets/core/push/PushRoutePolicy';
import { IapProductPolicy } from '../../../main/ets/core/iap/IapProductPolicy';
import { ProductSkuMatrix } from '../../../main/ets/features/product/ProductSkuMatrix';
import { ProductSku, ProductSpecGroup } from '../../../main/ets/features/product/ProductModels';
import { AfterSalePolicy } from '../../../main/ets/features/order/AfterSalePolicy';
import { UploadPolicy } from '../../../main/ets/core/file/UploadPolicy';
import { LocationPolicy } from '../../../main/ets/features/profile/LocationPolicy';
import { MerchantSessionPolicy } from '../../../main/ets/features/auth/MerchantSessionPolicy';
import { MerchantLoginSession } from '../../../main/ets/core/model/AuthModels';
import { AssetErrorPolicy } from '../../../main/ets/core/security/AssetErrorPolicy';
import { SessionRecoveryDecision, SessionRecoveryPolicy } from '../../../main/ets/core/storage/SessionRecoveryPolicy';
import { ChatMessagePolicy } from '../../../main/ets/features/chat/ChatMessagePolicy';
import { ChatMessage } from '../../../main/ets/features/business/BusinessModels';
import { IapTransactionPolicy } from '../../../main/ets/core/iap/IapTransactionPolicy';
import { RecentEventIds } from '../../../main/ets/core/model/RecentEventIds';
import { SecureStore } from '../../../main/ets/core/security/SecureStore';
import { PushPreferenceStore } from '../../../main/ets/core/push/PushPreferenceStore';
import { OfflineCacheStore } from '../../../main/ets/core/storage/OfflineCacheStore';
import { preferences } from '@kit.ArkData';
import { TestRuntime } from '../testability/TestRuntime';
import { PublicSupportPolicy } from '../../../main/ets/features/legal/PublicSupportPolicy';

interface CachedDeviceValue {
  label: string;
  items: number[];
}

function release(versionCode: number, storeUrl: string = 'https://appgallery.huawei.com/app/test'): HarmonyRelease {
  return {
    platform: 'merchant-harmony', version: '1.0.1', versionCode, url: '', storeUrl,
    size: 0, changelog: 'test', force: false, publishedAt: '2026-08-30T00:00:00.000Z'
  };
}

function chatMessage(
  id: string,
  sender: string,
  content: string,
  sendState?: string,
  read: boolean = false
): ChatMessage {
  return {
    id,
    sessionId: 'session-1',
    sender,
    type: 'text',
    content,
    createdAt: `2026-08-30T00:00:0${id.length}.000Z`,
    read,
    sendState
  };
}

function merchantSession(
  role: string,
  merchantId?: string,
  applicationStatus?: string
): MerchantLoginSession {
  const session: MerchantLoginSession = {
    user: {
      id: 'user-1', nickname: 'Merchant', avatar: '', role, status: 'active',
      merchantId, hasPassword: true
    },
    accessToken: 'access', refreshToken: 'refresh', expiresAt: Date.now() + 60_000
  };
  if (applicationStatus) {
    session.merchantApplication = {
      status: applicationStatus,
      name: applicationStatus,
      type: 'factory'
    };
  }
  return session;
}

export default function coreLogicTest(): void {
  describe('CoreLogic', () => {
    it('serializes query values without URLSearchParams', 0, () => {
      const result = withQuery('/api/v1/m/products', [
        { name: 'keyword', value: '门窗 & 配件' },
        { name: 'page', value: 2 },
        { name: 'enabled', value: false },
        { name: 'empty', value: '' },
        { name: 'missing' }
      ]);
      expect(result).assertEqual('/api/v1/m/products?keyword=%E9%97%A8%E7%AA%97%20%26%20%E9%85%8D%E4%BB%B6&page=2&enabled=false');
    });

    it('validates merchant authentication fields', 0, () => {
      expect(InputValidators.isMainlandPhone('18195819181')).assertTrue();
      expect(InputValidators.isMainlandPhone('12195819181')).assertFalse();
      expect(InputValidators.isPassword('123456')).assertTrue();
      expect(InputValidators.isPassword('12345')).assertFalse();
      expect(InputValidators.isSmsCode('1234')).assertTrue();
      expect(InputValidators.isSmsCode('12ab')).assertFalse();
    });

    it('rejects malformed public support phone numbers before opening the dialer', 0, () => {
      expect(PublicSupportPolicy.dialablePhone('400-888-6666')).assertEqual('400-888-6666');
      expect(PublicSupportPolicy.dialablePhone('18195819181')).assertEqual('18195819181');
      expect(PublicSupportPolicy.dialablePhone('024-88886666')).assertEqual('024-88886666');
      expect(PublicSupportPolicy.dialablePhone('+8618195819181')).assertEqual('+8618195819181');
      expect(PublicSupportPolicy.dialablePhone('400-888-66666')).assertEqual('');
      expect(PublicSupportPolicy.dialablePhone('not-a-phone')).assertEqual('');
    });

    it('admits only active bound merchant roles to the workbench', 0, () => {
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('merchant', 'merchant-1')
      )).assertTrue();
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('super-admin', 'merchant-1')
      )).assertTrue();
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('customer', 'merchant-1')
      )).assertFalse();
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('merchant')
      )).assertFalse();
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('merchant', 'merchant-1', 'pending')
      )).assertFalse();
      expect(MerchantSessionPolicy.canEnterWorkbench(
        merchantSession('merchant', 'merchant-1', 'active')
      )).assertTrue();
    });

    it('selects localized copy without mutating server-owned business keys', 0, () => {
      expect(I18n.text('zh-CN', '商品', 'Products')).assertEqual('商品');
      expect(I18n.text('en-US', '商品', 'Products')).assertEqual('Products');
      expect(I18n.contract('家具')).assertEqual('家具');
      expect(I18n.state('zh-CN', 'i18n:orders-load')).assertEqual('订单加载失败');
      expect(I18n.state('en-US', 'i18n:orders-load')).assertEqual('Failed to load orders');
      expect(I18n.state('en-US', 'server-owned detail')).assertEqual('server-owned detail');
    });

    it('localizes stable API error codes without discarding unknown server details', 0, () => {
      AppStorage.setOrCreate<string>('language', 'en-US');
      expect(I18n.apiError(2003, 'server detail')).assertEqual('You do not have permission to perform this operation.');
      expect(I18n.apiError(7777, 'server detail')).assertEqual('server detail');
      AppStorage.setOrCreate<string>('language', 'zh-CN');
      expect(I18n.apiError(2003, '服务端详情')).assertEqual('服务端详情');
    });

    it('only reports strictly newer valid releases', 0, () => {
      expect(UpdatePolicy.hasNewVersion(release(1000001), 1000000)).assertTrue();
      expect(UpdatePolicy.hasNewVersion(release(1000000), 1000000)).assertFalse();
      expect(UpdatePolicy.hasNewVersion(null, 1000000)).assertFalse();
      expect(UpdatePolicy.shouldPrompt(release(1000001), 1000000, 1000001)).assertFalse();
      expect(UpdatePolicy.shouldPrompt(release(1000002), 1000000, 1000001)).assertTrue();
    });

    it('throttles background update checks while manual checks always remain available', 0, () => {
      expect(UpdatePolicy.canCheck(true, true, 120_000, 0)).assertFalse();
      expect(UpdatePolicy.canCheck(false, false, 59_999, 0)).assertFalse();
      expect(UpdatePolicy.canCheck(false, false, 60_000, 0)).assertTrue();
      expect(UpdatePolicy.canCheck(false, true, 1, 1)).assertTrue();
    });

    it('never lets a previously dismissed optional release suppress a later forced update', 0, () => {
      const optional = release(1000001);
      optional.force = false;
      expect(UpdatePolicy.shouldPrompt(optional, 1000000, 1000001)).assertFalse();
      const forced = release(1000001);
      forced.force = true;
      expect(UpdatePolicy.shouldPrompt(forced, 1000000, 1000001)).assertTrue();
    });

    it('distinguishes a missing Asset Store record from a protected-storage failure', 0, () => {
      expect(AssetErrorPolicy.isMissing(24000002)).assertTrue();
      expect(AssetErrorPolicy.isMissing(24000001)).assertFalse();
      expect(AssetErrorPolicy.isMissing(24000008)).assertFalse();
      expect(AssetErrorPolicy.isMissing(24000004)).assertFalse();
      expect(AssetErrorPolicy.isDuplicate(24000003)).assertTrue();
      expect(AssetErrorPolicy.isDuplicate(24000001)).assertFalse();
    });

    it('persists updates and removal through the native Asset Store', 0, async () => {
      const alias = `jingwei_hypium_asset_${Date.now()}`;
      let created = false;
      try {
        await SecureStore.write(alias, 'hypium-value-one');
        created = true;
        expect(await SecureStore.read(alias)).assertEqual('hypium-value-one');
        await SecureStore.write(alias, 'hypium-value-two');
        expect(await SecureStore.read(alias)).assertEqual('hypium-value-two');
      } finally {
        if (created) await SecureStore.remove(alias);
      }
      expect(await SecureStore.read(alias)).assertEqual('');
    });

    it('persists isolated Push preferences through native Preferences', 0, async () => {
      const context = TestRuntime.context;
      expect(context !== undefined).assertTrue();
      if (!context) return;
      const storeName = `jingwei_hypium_preferences_${Date.now()}`;
      try {
        await PushPreferenceStore.write(context, { orders: false, refunds: true, chat: false }, storeName);
        await preferences.removePreferencesFromCache(context, storeName);
        const restored = await PushPreferenceStore.read(context, storeName);
        expect(restored.orders).assertFalse();
        expect(restored.refunds).assertTrue();
        expect(restored.chat).assertFalse();
      } finally {
        await preferences.deletePreferences(context, storeName);
      }
    });

    it('round-trips and removes an encrypted RDB offline snapshot', 0, async () => {
      const context = TestRuntime.context;
      expect(context !== undefined).assertTrue();
      if (!context) return;
      const key = `hypium-rdb-${Date.now()}`;
      await OfflineCacheStore.initialize(context);
      try {
        const value: CachedDeviceValue = { label: '门窗缓存', items: [1, 2, 3] };
        await OfflineCacheStore.put<CachedDeviceValue>(key, value);
        const restored = await OfflineCacheStore.get<CachedDeviceValue>(key);
        expect(restored !== null).assertTrue();
        expect(restored?.value.label || '').assertEqual('门窗缓存');
        expect(restored?.value.items.length || 0).assertEqual(3);
        expect((restored?.updatedAt || 0) > 0).assertTrue();
      } finally {
        await OfflineCacheStore.remove(key);
      }
      expect((await OfflineCacheStore.get<CachedDeviceValue>(key)) === null).assertTrue();
    });

    it('restores killed-process sessions without requiring the optional user snapshot', 0, () => {
      expect(SessionRecoveryPolicy.decide(false, '', undefined))
        .assertEqual(SessionRecoveryDecision.SIGNED_OUT);
      expect(SessionRecoveryPolicy.decide(true, 'refresh-token', undefined))
        .assertEqual(SessionRecoveryDecision.SIGNED_OUT);
      expect(SessionRecoveryPolicy.decide(false, 'refresh-token', undefined))
        .assertEqual(SessionRecoveryDecision.RESUME_MERCHANT);
      expect(SessionRecoveryPolicy.decide(false, 'refresh-token', {
        id: 'user-1', nickname: 'Merchant', avatar: '', role: 'merchant', status: 'active', merchantId: 'merchant-1'
      })).assertEqual(SessionRecoveryDecision.RESUME_MERCHANT);
      expect(SessionRecoveryPolicy.decide(false, 'temporary-token', {
        id: 'applicant-1', nickname: 'Applicant', avatar: '', role: 'user', status: 'active'
      })).assertEqual(SessionRecoveryDecision.DISCARD_APPLICANT);
    });

    it('rejects non-HTTPS update destinations', 0, () => {
      const fallback = 'https://appgallery.huawei.com/app/fallback';
      expect(UpdatePolicy.storeUrl(release(1000001, 'http://unsafe.example/app'), fallback)).assertEqual(fallback);
      expect(UpdatePolicy.storeUrl(release(1000001, 'https://safe.example/app'), fallback))
        .assertEqual('https://safe.example/app');
    });

    it('formats only valid release package sizes', 0, () => {
      expect(UpdatePolicy.packageSize(0)).assertEqual('--');
      expect(UpdatePolicy.packageSize(1024)).assertEqual('1.0 KB');
      expect(UpdatePolicy.packageSize(5 * 1024 * 1024)).assertEqual('5.0 MB');
    });

    it('refreshes commerce surfaces for server-owned order and refund events', 0, () => {
      expect(CommerceEventPolicy.refreshesCommerce('order.new')).assertTrue();
      expect(CommerceEventPolicy.refreshesCommerce('order.update')).assertTrue();
      expect(CommerceEventPolicy.refreshesCommerce('refund.new')).assertTrue();
      expect(CommerceEventPolicy.refreshesCommerce('chat.message')).assertFalse();
    });

    it('honours per-category alert preferences without suppressing data refresh', 0, () => {
      expect(CommerceEventPolicy.shouldAlert('order.new', false, false, false)).assertFalse();
      expect(CommerceEventPolicy.shouldAlert('refund.new', false, false, false)).assertFalse();
      expect(CommerceEventPolicy.shouldAlert('order.new', true, true, true)).assertTrue();
      expect(CommerceEventPolicy.shouldAlert('refund.new', true, true, true)).assertTrue();
      expect(CommerceEventPolicy.shouldAlert('order.update', true, true, true)).assertFalse();
      expect(CommerceEventPolicy.shouldAlert('chat.message', true, true, true, 'user', 'user')).assertTrue();
      expect(CommerceEventPolicy.shouldAlert('chat.message', true, true, true, 'merchant', 'merchant')).assertFalse();
      expect(CommerceEventPolicy.shouldAlert('chat.message', true, true, false, 'user', 'user')).assertFalse();
      expect(CommerceEventPolicy.isAuthenticationFailure('auth.failed')).assertTrue();
    });

    it('coalesces concurrent refresh work and releases the gate afterwards', 0, async () => {
      const gate = new RefreshSingleFlight();
      let calls = 0;
      const first = gate.run(async (): Promise<string> => {
        calls += 1;
        await Promise.resolve();
        return 'token-1';
      });
      const second = gate.run(async (): Promise<string> => {
        calls += 1;
        return 'unexpected';
      });
      expect(first === second).assertTrue();
      expect(calls).assertEqual(1);
      const values = await Promise.all([first, second]);
      expect(values[0]).assertEqual('token-1');
      expect(values[1]).assertEqual('token-1');
      const next = await gate.run(async (): Promise<string> => {
        calls += 1;
        return 'token-2';
      });
      expect(next).assertEqual('token-2');
      expect(calls).assertEqual(2);
    });

    it('clears sessions only for explicit authentication failures', 0, () => {
      expect(RefreshFailurePolicy.clearsSession(401)).assertTrue();
      expect(RefreshFailurePolicy.clearsSession(2001)).assertTrue();
      expect(RefreshFailurePolicy.clearsSession(2002)).assertTrue();
      expect(RefreshFailurePolicy.clearsSession(0)).assertFalse();
      expect(RefreshFailurePolicy.clearsSession(500)).assertFalse();
    });

    it('bounds realtime reconnect backoff and rejects malformed envelopes', 0, () => {
      expect(RealtimePolicy.reconnectDelay(0)).assertEqual(1000);
      expect(RealtimePolicy.reconnectDelay(1)).assertEqual(2000);
      expect(RealtimePolicy.reconnectDelay(5)).assertEqual(30000);
      expect(RealtimePolicy.reconnectDelay(100)).assertEqual(30000);
      expect(RealtimePolicy.acceptsEnvelope(1, 'chat.message')).assertTrue();
      expect(RealtimePolicy.acceptsEnvelope(2, 'chat.message')).assertFalse();
      expect(RealtimePolicy.acceptsEnvelope(1, '  ')).assertFalse();
    });

    it('accepts only complete whitelisted Push Kit deep links', 0, () => {
      const order = PushRoutePolicy.fromRaw(
        'order-detail' as Object, 'order-1' as Object, 'paid' as Object, 'event-1' as Object
      );
      expect(order?.route || '').assertEqual('order-detail');
      expect(order?.id || '').assertEqual('order-1');
      expect(order?.eventId || '').assertEqual('event-1');
      expect(PushRoutePolicy.fromRaw(
        'after-sale-detail' as Object, 'refund-1' as Object, undefined, 'event-2' as Object
      )?.route || '').assertEqual('after-sale-detail');
      expect(PushRoutePolicy.fromRaw(
        'chat-detail' as Object, 'session-1' as Object, undefined, 'event-3' as Object
      )?.route || '').assertEqual('chat-detail');
      expect(PushRoutePolicy.fromRaw('settings' as Object, '1' as Object, undefined) === null).assertTrue();
      expect(PushRoutePolicy.fromRaw('chat-detail' as Object, '  ' as Object, undefined) === null).assertTrue();
      expect(PushRoutePolicy.value('x'.repeat(400) as Object).length).assertEqual(256);
    });

    it('deduplicates bounded realtime and Push event identifiers', 0, () => {
      const ids = new RecentEventIds(2);
      expect(ids.accept('event-1')).assertTrue();
      expect(ids.accept('event-1')).assertFalse();
      expect(ids.accept('event-2')).assertTrue();
      expect(ids.accept('event-3')).assertTrue();
      expect(ids.accept('event-1')).assertTrue();
      expect(ids.accept('')).assertTrue();
      expect(ids.accept('')).assertTrue();
      ids.clear();
      expect(ids.accept('event-3')).assertTrue();
    });

    it('maps only server-supported Huawei IAP product types', 0, () => {
      expect(IapProductPolicy.normalize('subscription')).assertEqual('subscription');
      expect(IapProductPolicy.normalize('consumable')).assertEqual('consumable');
      let rejected = false;
      try {
        IapProductPolicy.normalize('nonconsumable');
      } catch (_) {
        rejected = true;
      }
      expect(rejected).assertTrue();
    });

    it('finishes only server-verified complete Huawei IAP transactions', 0, () => {
      expect(IapTransactionPolicy.canFinish({
        ok: true,
        productType: 'subscription',
        purchaseToken: 'purchase-token',
        purchaseOrderId: 'purchase-order'
      })).assertTrue();
      expect(IapTransactionPolicy.canFinish({
        ok: false,
        productType: 'subscription',
        purchaseToken: 'purchase-token',
        purchaseOrderId: 'purchase-order'
      })).assertFalse();
      expect(IapTransactionPolicy.canFinish({
        ok: true,
        productType: 'unsupported',
        purchaseToken: 'purchase-token',
        purchaseOrderId: 'purchase-order'
      })).assertFalse();
      expect(IapTransactionPolicy.canFinish({ ok: true, productType: 'consumable' })).assertFalse();
    });

    it('regenerates SKU cartesian products without losing matching server rows', 0, () => {
      const groups: ProductSpecGroup[] = [
        { name: 'Color', values: ['Red', 'Blue'] },
        { name: 'Size', values: ['S', 'M'] }
      ];
      const existingSpecs: Record<string, string> = {};
      existingSpecs['Color'] = 'Red';
      existingSpecs['Size'] = 'S';
      const existingSku: ProductSku = {
        id: 'sku-red-s', specs: existingSpecs, specValues: ['Red', 'S'],
        specsLabel: 'Red · S', priceWholesale: 80, priceRetail: 100,
        priceMember: 90, stock: 7, active: false
      };
      const existing: ProductSku[] = [existingSku];
      const generated = ProductSkuMatrix.regenerate(groups, existing, 'Default');
      expect(generated.length).assertEqual(4);
      const preserved = generated.find((sku: ProductSku): boolean => sku.specsLabel === 'Red · S');
      expect(preserved?.id || '').assertEqual('sku-red-s');
      expect(preserved?.stock || 0).assertEqual(7);
      expect(preserved?.active === false).assertTrue();
      const created = generated.find((sku: ProductSku): boolean => sku.specsLabel === 'Blue · M');
      expect(created?.specs?.['Color'] || '').assertEqual('Blue');
      expect(created?.active === true).assertTrue();
    });

    it('normalizes SKU price fallbacks, stock and disabled state for API mutation', 0, () => {
      const normalized = ProductSkuMatrix.normalize([], [{
        specsLabel: '', priceWholesale: 88, priceRetail: 0,
        priceMember: 0, stock: 3.9, active: false
      }], 'Default');
      expect(normalized[0].priceRetail).assertEqual(88);
      expect(normalized[0].priceMember).assertEqual(88);
      expect(normalized[0].stock).assertEqual(3);
      expect(normalized[0].active === false).assertTrue();
      expect(normalized[0].specsLabel).assertEqual('Default');
    });

    it('enforces the server refund amount and rejection reason contract', 0, () => {
      expect(AfterSalePolicy.approvedAmount(' 80.50 ', 100)).assertEqual(80.5);
      expect(AfterSalePolicy.approvedAmount('0', 100) === undefined).assertTrue();
      expect(AfterSalePolicy.approvedAmount('100.01', 100) === undefined).assertTrue();
      expect(AfterSalePolicy.approvedAmount('not-a-number', 100) === undefined).assertTrue();
      expect(AfterSalePolicy.rejectReason('  Evidence is incomplete.  '))
        .assertEqual('Evidence is incomplete.');
      expect(AfterSalePolicy.rejectReason('   ') === undefined).assertTrue();
    });

    it('bounds image selection, upload business types and authentication retry', 0, () => {
      expect(UploadPolicy.selectionLimit(0)).assertEqual(0);
      expect(UploadPolicy.selectionLimit(3.9)).assertEqual(3);
      expect(UploadPolicy.selectionLimit(500)).assertEqual(50);
      expect(UploadPolicy.normalizeBizType(' Product ')).assertEqual('product');
      let rejected = false;
      try {
        UploadPolicy.normalizeBizType('../../private');
      } catch (_) {
        rejected = true;
      }
      expect(rejected).assertTrue();
      expect(UploadPolicy.shouldRefresh(401, true)).assertTrue();
      expect(UploadPolicy.shouldRefresh(401, false)).assertFalse();
      expect(UploadPolicy.shouldRefresh(500, true)).assertFalse();
      expect(UploadPolicy.isSuccessful(200, 0, 'https://oss.example/image.jpg')).assertTrue();
      expect(UploadPolicy.isSuccessful(200, 0, '  ')).assertFalse();
    });

    it('rejects invalid map coordinates and ignores stale native location results', 0, () => {
      expect(LocationPolicy.isValidCoordinate(34.3416, 108.9398)).assertTrue();
      expect(LocationPolicy.isValidCoordinate(0, 0)).assertTrue();
      expect(LocationPolicy.isValidCoordinate(91, 108.9398)).assertFalse();
      expect(LocationPolicy.isValidCoordinate(34.3416, -181)).assertFalse();
      expect(LocationPolicy.acceptsEpoch(7, 7)).assertTrue();
      expect(LocationPolicy.acceptsEpoch(6, 7)).assertFalse();
      expect(LocationPolicy.joinRegion('陕西省 ', ' 西安市', ' 雁塔区 ')).assertEqual('陕西省西安市雁塔区');
      expect(LocationPolicy.selectedAddress(' 经纬门窗 ', ' 科技路 1 号 ')).assertEqual('经纬门窗 · 科技路 1 号');
      expect(LocationPolicy.coordinateLabel(34.3416, 108.9398, '经纬度'))
        .assertEqual('经纬度 34.341600, 108.939800');
    });

    it('reconciles HTTP and WebSocket chat confirmation without duplicate messages', 0, () => {
      const optimistic = chatMessage('local-1', 'merchant', 'same reply', 'sending');
      const server = chatMessage('server-1', 'merchant', 'same reply');
      const socketFirst = ChatMessagePolicy.reconcileRealtime([optimistic], server);
      expect(socketFirst.length).assertEqual(1);
      expect(socketFirst[0].id).assertEqual('server-1');
      expect(ChatMessagePolicy.reconcileRealtime(socketFirst, server) === socketFirst).assertTrue();

      const httpFirst = ChatMessagePolicy.confirmHttp([optimistic], optimistic.id, server);
      expect(httpFirst.length).assertEqual(1);
      expect(httpFirst[0].id).assertEqual('server-1');
      const socketAfterHttp = ChatMessagePolicy.reconcileRealtime(httpFirst, server);
      expect(socketAfterHttp === httpFirst).assertTrue();
    });

    it('preserves chat ordering across failure, read receipt and cursor pagination', 0, () => {
      const earlier = chatMessage('earlier-1', 'user', 'earlier');
      const customer = chatMessage('customer-1', 'user', 'question');
      const merchant = chatMessage('local-2', 'merchant', 'answer', 'sending');
      const failed = ChatMessagePolicy.markFailed([customer, merchant], merchant.id);
      expect(failed[1].sendState || '').assertEqual('failed');
      const read = ChatMessagePolicy.markMerchantRead(failed);
      expect(read[0].read).assertFalse();
      expect(read[1].read).assertTrue();
      const paged = ChatMessagePolicy.prependEarlier(read, [earlier, customer]);
      expect(paged.length).assertEqual(3);
      expect(paged[0].id).assertEqual('earlier-1');
      expect(paged[1].id).assertEqual('customer-1');
      expect(paged[2].id).assertEqual('local-2');
    });
  });
}
