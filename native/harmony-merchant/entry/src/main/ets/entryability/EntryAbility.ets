import { AbilityConstant, Configuration, ConfigurationConstant, UIAbility, Want } from '@kit.AbilityKit';
import { display, window } from '@kit.ArkUI';
import { IBestInit } from '@ibestservices/ibest-ui';
import { AppearanceService } from '../core/theme/AppearanceService';
import { GeneratedIconRegistry } from '../core/theme/GeneratedIconRegistry';
import { ComponentThemeBridge } from '../core/theme/ComponentThemeBridge';
import { pushService } from '@kit.PushKit';
import { HarmonyPushClient } from '../core/push/HarmonyPushClient';
import { PushRouteService } from '../core/push/PushRouteService';
import { OfflineCacheStore } from '../core/storage/OfflineCacheStore';

export default class EntryAbility extends UIAbility {
  private mainWindow?: window.Window;
  private avoidAreaListener = (): void => this.updateSafeArea();
  private windowSizeListener = (size: window.Size): void => {
    try {
      const density = display.getDefaultDisplaySync().densityPixels || 1;
      AppStorage.setOrCreate<number>('windowWidth', size.width / density);
      AppStorage.setOrCreate<number>('windowHeight', size.height / density);
    } catch (_) {
      // updateSafeArea also refreshes the dimensions from WindowProperties.
    }
    this.updateSafeArea();
  };
  private tokenUpdateListener = (token: string): void => {
    HarmonyPushClient.updateToken(token);
  };

  onCreate(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    GeneratedIconRegistry.install();
    try {
      this.context.getApplicationContext().setColorMode(ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET);
    } catch (_) {
      // A system appearance failure must never prevent the first ArkUI frame.
    }
    AppStorage.setOrCreate<number>('safeTop', 24);
    AppStorage.setOrCreate<number>('safeBottom', 16);
    AppStorage.setOrCreate<number>('windowWidth', 390);
    AppStorage.setOrCreate<number>('windowHeight', 844);
    // ArkUI applies the system font scale because AppScope/profile/configuration.json
    // opts into followSystem. Keep the live value only as an observable acceptance
    // signal; page typography must not multiply it a second time.
    AppStorage.setOrCreate<number>('fontSizeScale', this.context.config.fontSizeScale || 1);
    // Appearance keys must exist before any @StorageProp/@StorageLink page is
    // constructed. Preferences later update these existing reactive entries.
    AppStorage.setOrCreate<string>('themeMode', 'system');
    AppStorage.setOrCreate<string>('appearanceSaveState', 'saved');
    AppStorage.setOrCreate<string>('language', 'zh-CN');
    AppStorage.setOrCreate<boolean>('darkMode', this.context.config.colorMode ===
      ConfigurationConstant.ColorMode.COLOR_MODE_DARK);
    AppStorage.setOrCreate<number>('sessionEpoch', 0);
    AppStorage.setOrCreate<number>('locationEpoch', 0);
    AppStorage.setOrCreate<number>('pushRouteEpoch', 0);
    AppStorage.setOrCreate<number>('foregroundEpoch', 0);
    AppStorage.setOrCreate<boolean>('appForeground', true);
    AppStorage.setOrCreate<number>('commerceEpoch', 0);
    AppStorage.setOrCreate<number>('pushPreferencesEpoch', 0);
    AppStorage.setOrCreate<string>('pendingPushRoute', '');
    AppStorage.setOrCreate<string>('pendingPushId', '');
    AppStorage.setOrCreate<string>('pendingPushStatus', '');
    AppStorage.setOrCreate<string>('pendingPushEventId', '');
    AppStorage.setOrCreate<string>('activeChatSessionId', '');
    AppStorage.setOrCreate<string>('pickedRegion', '');
    AppStorage.setOrCreate<string>('pickedAddress', '');
    AppStorage.setOrCreate<number>('pickedLatitude', 0);
    AppStorage.setOrCreate<number>('pickedLongitude', 0);
    AppStorage.setOrCreate<boolean>('pickedLocationSet', false);
    AppearanceService.initialize(this.context).catch((): void => {});
    OfflineCacheStore.initialize(this.context).catch((): void => {});
    PushRouteService.capture(want);
    try {
      pushService.on('tokenUpdate', this, this.tokenUpdateListener);
    } catch (_) {
      // Push Kit 未开通时不影响应用启动。
    }
  }

  onWindowStageCreate(windowStage: window.WindowStage): void {
    try {
      this.mainWindow = windowStage.getMainWindowSync();
      this.mainWindow.setWindowLayoutFullScreen(true);
      AppearanceService.attachWindow(this.mainWindow);
      this.mainWindow.on('avoidAreaChange', this.avoidAreaListener);
      this.mainWindow.on('windowSizeChange', this.windowSizeListener);
      this.updateSafeArea();
    } catch (_) {
      // Continue with a regular system-managed window instead of showing a blank launch screen.
    }
    windowStage.loadContent('pages/Index', () => {
      try {
        IBestInit(windowStage, this.context);
        ComponentThemeBridge.apply(AppStorage.get<boolean>('darkMode') || false);
      } catch (_) {
        // The owned ArkUI shell and fallback materials remain usable even if
        // optional component-library global initialization fails.
      }
    });
  }

  onForeground(): void {
    AppStorage.setOrCreate<boolean>('appForeground', true);
    this.updateSafeArea();
    const epoch = AppStorage.get<number>('foregroundEpoch') || 0;
    AppStorage.setOrCreate<number>('foregroundEpoch', epoch + 1);
  }

  onBackground(): void {
    AppStorage.setOrCreate<boolean>('appForeground', false);
  }

  onNewWant(want: Want, _launchParam: AbilityConstant.LaunchParam): void {
    PushRouteService.capture(want);
  }

  onConfigurationUpdate(configuration: Configuration): void {
    AppearanceService.syncSystemColorMode(
      configuration.colorMode === ConfigurationConstant.ColorMode.COLOR_MODE_DARK
    );
    AppStorage.setOrCreate<number>('fontSizeScale', configuration.fontSizeScale || 1);
  }

  onDestroy(): void {
    if (this.mainWindow) AppearanceService.detachWindow(this.mainWindow);
    this.mainWindow?.off('avoidAreaChange', this.avoidAreaListener);
    this.mainWindow?.off('windowSizeChange', this.windowSizeListener);
    try {
      pushService.off('tokenUpdate', this.tokenUpdateListener);
    } catch (_) {
    }
  }

  private updateSafeArea(): void {
    if (!this.mainWindow) return;
    try {
      const density = display.getDefaultDisplaySync().densityPixels || 1;
      const rect = this.mainWindow.getWindowProperties().windowRect;
      AppStorage.setOrCreate<number>('windowWidth', rect.width / density);
      AppStorage.setOrCreate<number>('windowHeight', rect.height / density);
      const system = this.mainWindow.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM);
      const cutout = this.mainWindow.getWindowAvoidArea(window.AvoidAreaType.TYPE_CUTOUT);
      const gesture = this.mainWindow.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM_GESTURE);
      const indicator = this.mainWindow.getWindowAvoidArea(window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR);
      const top = Math.max(system.topRect.height, cutout.topRect.height) / density;
      const bottom = Math.max(
        system.bottomRect.height,
        gesture.bottomRect.height,
        indicator.bottomRect.height
      ) / density;
      AppStorage.setOrCreate<number>('safeTop', Math.max(12, top));
      AppStorage.setOrCreate<number>('safeBottom', Math.max(8, bottom));
    } catch (_) {
      AppStorage.setOrCreate<number>('safeTop', 24);
      AppStorage.setOrCreate<number>('safeBottom', 16);
    }
  }
}
