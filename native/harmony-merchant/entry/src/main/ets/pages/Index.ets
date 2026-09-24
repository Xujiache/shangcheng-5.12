import { LoginPage } from '../features/auth/LoginPage';
import { MainShell } from '../features/shell/MainShell';
import { AuthRepository } from '../features/auth/AuthRepository';
import { DesignTokens } from '../core/theme/DesignTokens';
import { MerchantIcon } from '../core/theme/MerchantIcon';
import { AppRouter } from '../core/navigation/AppRouter';
import { HarmonyRelease } from '../features/update/UpdateModels';
import { UpdateRepository } from '../features/update/UpdateRepository';
import { SessionStore } from '../core/storage/SessionStore';
import { common } from '@kit.AbilityKit';
import { updateManager } from '@kit.AppGalleryKit';
import { AppConfig } from '../core/config/AppConfig';
import { PushRouteService } from '../core/push/PushRouteService';
import { IdRouteParams } from '../core/navigation/RouteParams';
import { UpdatePolicy } from '../features/update/UpdatePolicy';
import { I18n } from '../core/i18n/I18n';
import { AdaptiveMaterialSurface } from '../core/theme/AdaptiveMaterialSurface';
import { HarmonyRealtime, RealtimeEnvelope } from '../core/realtime/HarmonyRealtime';
import { CommerceEventPolicy } from '../core/realtime/CommerceEventPolicy';
import { HarmonyPushClient, PushPreferences } from '../core/push/HarmonyPushClient';
import { ApiClient } from '../core/network/ApiClient';
import { IBestToast } from '@ibestservices/ibest-ui';
import { vibrator } from '@kit.SensorServiceKit';
import { PushPreferenceStore } from '../core/push/PushPreferenceStore';

interface RootChatMessagePayload {
  sender?: string;
}

interface RootRealtimePayload {
  id?: string;
  no?: string;
  sessionId?: string;
  fromRole?: string;
  message?: RootChatMessagePayload;
}

@Entry
@Component
struct Index {
  @State private ready: boolean = false;
  @State private authenticated: boolean = false;
  @State private sessionRecoveryFailed: boolean = false;
  @State private pendingUpdate: HarmonyRelease | null = null;
  @StorageProp('sessionEpoch') @Watch('onSessionEpoch') private sessionEpoch: number = 0;
  @StorageProp('pushRouteEpoch') @Watch('onPushRouteEpoch') private pushRouteEpoch: number = 0;
  @StorageProp('foregroundEpoch') @Watch('onForegroundEpoch') private foregroundEpoch: number = 0;
  @StorageProp('pushPreferencesEpoch') @Watch('onPushPreferencesEpoch') private pushPreferencesEpoch: number = 0;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  private initializing: boolean = false;
  private updateChecking: boolean = false;
  private lastUpdateCheckAt: number = 0;
  private dismissedVersionCode: number = 0;
  private updateTimer: number = -1;
  private pathStack: NavPathStack = new NavPathStack();
  private unsubscribeRealtime?: () => void;
  private pushPreferences: PushPreferences = { orders: true, refunds: true, chat: true };
  private realtimeRefreshing: boolean = false;
  private updateOpening: boolean = false;

  aboutToAppear(): void {
    AppRouter.attach(this.pathStack);
    if (!this.unsubscribeRealtime) {
      this.unsubscribeRealtime = HarmonyRealtime.shared().subscribe(
        (envelope: RealtimeEnvelope): void => this.onRealtime(envelope)
      );
    }
    this.initialize();
    if (this.updateTimer < 0) {
      this.updateTimer = setInterval((): void => { this.checkUpdate(); }, 15 * 60 * 1000);
    }
  }

  aboutToDisappear(): void {
    if (this.updateTimer >= 0) {
      clearInterval(this.updateTimer);
      this.updateTimer = -1;
    }
    this.unsubscribeRealtime?.();
    this.unsubscribeRealtime = undefined;
  }

  private async initialize(): Promise<void> {
    if (this.initializing || this.ready) return;
    this.initializing = true;
    this.sessionRecoveryFailed = false;
    try {
      this.authenticated = await AuthRepository.restore();
      if (this.authenticated) this.startAuthenticatedServices();
    } catch (_) {
      // Never convert an Asset Store service/corruption/access failure into a
      // signed-out state. Keep protected data untouched and offer an explicit
      // retry surface after the native first frame.
      this.authenticated = false;
      this.sessionRecoveryFailed = true;
    } finally {
      this.ready = true;
      this.initializing = false;
      this.checkUpdate();
      this.dispatchPushRoute();
    }
  }

  private async checkUpdate(force: boolean = false): Promise<void> {
    const now = Date.now();
    if (!UpdatePolicy.canCheck(this.updateChecking, force, now, this.lastUpdateCheckAt)) return;
    this.updateChecking = true;
    this.lastUpdateCheckAt = now;
    try {
      const release = await UpdateRepository.latest();
      if (release && UpdatePolicy.shouldPrompt(
        release, AppConfig.CLIENT_VERSION_CODE, this.dismissedVersionCode
      )) {
        this.pendingUpdate = release;
      }
    } catch (_) {
      // 更新检查失败不能阻塞登录、恢复会话或清理本地令牌。
    } finally {
      this.updateChecking = false;
    }
  }

  private onSessionEpoch(): void {
    this.authenticated = SessionStore.shared().refreshToken.length > 0;
    if (!this.authenticated) {
      HarmonyRealtime.shared().stop();
      AppRouter.clear();
    } else {
      this.startAuthenticatedServices();
      this.dispatchPushRoute();
    }
  }

  private retrySessionRecovery(): void {
    if (this.initializing) return;
    this.ready = false;
    this.sessionRecoveryFailed = false;
    this.initialize();
  }

  private onAuthenticated(): void {
    this.authenticated = true;
    this.startAuthenticatedServices();
    this.dispatchPushRoute();
  }

  private startAuthenticatedServices(): void {
    try {
      HarmonyRealtime.shared().start();
    } catch (_) {}
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    HarmonyPushClient.syncCurrent(context, this.language).catch((): void => {});
    this.reloadPushPreferences().catch((): void => {});
  }

  private async reloadPushPreferences(): Promise<void> {
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    try {
      this.pushPreferences = await PushPreferenceStore.read(context);
    } catch (_) {
      // Retain the in-memory preferences when device storage is unavailable.
    }
    try {
      const value = await HarmonyPushClient.getPreferences();
      this.pushPreferences = value;
      await PushPreferenceStore.write(context, value);
    } catch (_) {
      // 离线时沿用设备上的最后一次成功设置，不把偏好重置为开启。
    }
  }

  private onPushPreferencesEpoch(): void {
    if (this.authenticated) this.reloadPushPreferences();
  }

  private onRealtime(envelope: RealtimeEnvelope): void {
    if (CommerceEventPolicy.isAuthenticationFailure(envelope.event)) {
      this.refreshRealtimeAuthentication();
      return;
    }
    if (!this.authenticated) return;
    const payload = (envelope.data || {}) as RootRealtimePayload;
    const refreshesCommerce = CommerceEventPolicy.refreshesCommerce(envelope.event);
    const incomingChat = CommerceEventPolicy.isIncomingChat(
      envelope.event,
      payload.fromRole || '',
      payload.message?.sender || ''
    );
    if (!refreshesCommerce && !incomingChat) return;
    if (refreshesCommerce || incomingChat) {
      const epoch = AppStorage.get<number>('commerceEpoch') || 0;
      AppStorage.setOrCreate<number>('commerceEpoch', epoch + 1);
    }
    if (incomingChat && payload.sessionId &&
      payload.sessionId === (AppStorage.get<string>('activeChatSessionId') || '')) return;
    if (!CommerceEventPolicy.shouldAlert(
      envelope.event,
      this.pushPreferences.orders,
      this.pushPreferences.refunds,
      this.pushPreferences.chat,
      payload.fromRole || '',
      payload.message?.sender || ''
    )) return;
    vibrator.startVibration({ type: 'time', duration: 80 }, { usage: 'notification' })
      .catch((): void => {});
    if (envelope.event === 'order.new') {
      const orderNo = String(payload.no || payload.id || '');
      IBestToast.show(orderNo
        ? I18n.text(this.language, `新订单：${orderNo}`, `New order: ${orderNo}`)
        : I18n.text(this.language, '收到新订单', 'New order received'));
    } else if (envelope.event === 'refund.new') {
      IBestToast.show(I18n.text(this.language, '收到新的售后申请', 'New after-sales request received'));
    } else {
      IBestToast.show(I18n.text(this.language, '收到新的客户消息', 'New customer message received'));
    }
  }

  private async refreshRealtimeAuthentication(): Promise<void> {
    if (this.realtimeRefreshing || !this.authenticated) return;
    this.realtimeRefreshing = true;
    try {
      const token = await ApiClient.refresh();
      if (!token && !SessionStore.shared().refreshToken) {
        this.authenticated = false;
      }
    } catch (_) {
      if (!SessionStore.shared().refreshToken) this.authenticated = false;
    } finally {
      this.realtimeRefreshing = false;
    }
  }

  private onPushRouteEpoch(): void {
    this.dispatchPushRoute();
  }

  private onForegroundEpoch(): void {
    if (this.ready) this.checkUpdate();
  }

  private dismissUpdate(release: HarmonyRelease): void {
    this.dismissedVersionCode = release.versionCode;
    this.pendingUpdate = null;
  }

  private dispatchPushRoute(): void {
    if (!this.ready || !this.authenticated) return;
    const target = PushRouteService.consume();
    if (!target) return;
    // 等待 MainShell 完成首帧挂载后再入栈，冷启动和热启动走同一条路径。
    setTimeout((): void => {
      if (!this.authenticated || !SessionStore.shared().refreshToken) return;
      if (target.route === 'order-detail' && target.id) {
        AppRouter.push('OrderDetail', new IdRouteParams(target.id));
      } else if (target.route === 'after-sale-detail' && target.id) {
        AppRouter.push('AfterSaleDetail', new IdRouteParams(target.id));
      } else if (target.route === 'chat-detail' && target.id) {
        AppRouter.push('ChatDetail', new IdRouteParams(target.id));
      }
    }, 100);
  }

  private async openStoreUpdate(release: HarmonyRelease): Promise<void> {
    if (this.updateOpening) return;
    this.updateOpening = true;
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    try {
      const result = await updateManager.checkAppUpdate(context);
      if (result.updateAvailable === 1) {
        await updateManager.showUpdateDialog(context);
        return;
      }
      await context.openLink(UpdatePolicy.storeUrl(release, AppConfig.APP_GALLERY_URL), { appLinkingOnly: false });
    } catch (_) {
      try {
        await context.openLink(UpdatePolicy.storeUrl(release, AppConfig.APP_GALLERY_URL), { appLinkingOnly: false });
      } catch (_) {
        IBestToast.show(I18n.text(this.language,
          '无法打开 AppGallery，请确认已安装华为应用市场后重试',
          'Unable to open AppGallery. Install or enable AppGallery, then try again.'));
      }
    } finally {
      this.updateOpening = false;
    }
  }

  @Builder
  private sessionRecoveryError() {
    Column({ space: 14 }) {
      Column() { MerchantIcon({ name: 'warning-o', color: Color.White, iconSize: 25 }); }
        .width(54).height(54).justifyContent(FlexAlign.Center)
        .backgroundColor(DesignTokens.danger(this.darkMode)).borderRadius(27);
      Text(I18n.text(this.language, '暂时无法读取安全会话', 'Secure session is temporarily unavailable'))
        .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
      Text(I18n.text(this.language,
        '本地登录凭据没有被删除。请稍后重试，避免重复登录覆盖原会话。',
        'Your local credentials were not deleted. Retry shortly to avoid overwriting the existing session.'))
        .fontSize(13).lineHeight(20).fontColor(DesignTokens.muted(this.darkMode))
        .textAlign(TextAlign.Center).width('82%');
      Button(I18n.text(this.language, '重新读取', 'Retry'), { type: ButtonType.Capsule })
        .width(180).height(44).backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode))
        .onClick(() => this.retrySessionRecovery());
    }
    .width('100%').height('100%').justifyContent(FlexAlign.Center)
    .backgroundColor(DesignTokens.page(this.darkMode));
  }

  @Builder
  private updateOverlay(release: HarmonyRelease) {
    Column() {
      Blank();
      Stack() {
        AdaptiveMaterialSurface({
          thickness: 'regular',
          materialColor: DesignTokens.surface(this.darkMode),
          fallbackColor: DesignTokens.surface(this.darkMode),
          radius: 24,
          interactive: true,
          darkMode: this.darkMode
        });
        Column({ space: 12 }) {
          Row() {
            Text(I18n.text(this.language, '发现新版本', 'New version available')).fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
            Text(`v${release.version}`).fontSize(13).fontColor(DesignTokens.brand(this.darkMode));
          }.width('100%');
          Text(I18n.text(this.language,
            `安装包 ${UpdatePolicy.packageSize(release.size)} · 发布于 ${release.publishedAt.slice(0, 10)}`,
            `Package ${UpdatePolicy.packageSize(release.size)} · Published ${release.publishedAt.slice(0, 10)}`))
            .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          Text(release.changelog || I18n.text(this.language, '包含重要功能与体验优化', 'Important features and experience improvements'))
            .fontSize(14).lineHeight(22).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          Button(I18n.text(this.language, '前往 AppGallery 更新', 'Update in AppGallery'), { type: ButtonType.Capsule })
            .width('100%').height(46).backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode))
            .onClick(() => this.openStoreUpdate(release));
          if (!release.force) {
            Button(I18n.text(this.language, '稍后处理', 'Later'), { type: ButtonType.Capsule })
              .width('100%').height(42).backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode))
              .onClick(() => this.dismissUpdate(release));
          } else {
            Text(I18n.text(this.language, '这是必须安装的重要版本，更新前无法继续使用。',
              'This required update must be installed before you can continue.'))
              .fontSize(11).fontColor(DesignTokens.danger(this.darkMode)).textAlign(TextAlign.Center).width('100%');
          }
        }
        .width('100%')
        .padding(20);
      }
      .width('88%')
      .margin({ bottom: 34 })
      .borderRadius(24)
      .clip(true)
      .shadow({ color: '#38000000', radius: 28, offsetY: 8 });
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#66000000')
    .justifyContent(FlexAlign.End);
  }

  build() {
    Stack() {
      Navigation(this.pathStack) {
        if (!this.ready) {
          Column({ space: 14 }) {
            Stack() {
              Column().width(66).height(66).borderRadius(33).backgroundColor(DesignTokens.brand(this.darkMode));
              Text(I18n.text(this.language, '经纬', 'Jingwei')).fontSize(20).fontWeight(FontWeight.Bold).fontColor(DesignTokens.onBrand(this.darkMode));
            }
            .width(66)
            .height(66);
            Text(I18n.text(this.language, '正在恢复安全会话', 'Restoring secure session'))
              .fontSize(13)
              .fontColor(DesignTokens.muted(this.darkMode));
            LoadingProgress()
              .width(26)
              .height(26)
              .color(DesignTokens.brand(this.darkMode));
          }
          .width('100%')
          .height('100%')
          .justifyContent(FlexAlign.Center)
          .backgroundColor(DesignTokens.page(this.darkMode));
        } else if (this.sessionRecoveryFailed) {
          this.sessionRecoveryError();
        } else if (!this.authenticated) {
          LoginPage({ onAuthenticated: () => this.onAuthenticated() });
        } else {
          MainShell();
        }
      }
      .hideTitleBar(true)
      .mode(NavigationMode.Stack)
      .width('100%')
      .height('100%');
      if (this.pendingUpdate) this.updateOverlay(this.pendingUpdate);
    }.width('100%').height('100%');
  }
}
