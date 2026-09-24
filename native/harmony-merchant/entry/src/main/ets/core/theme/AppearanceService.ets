import { common, ConfigurationConstant } from '@kit.AbilityKit';
import { preferences } from '@kit.ArkData';
import { window } from '@kit.ArkUI';
import { ComponentThemeBridge } from './ComponentThemeBridge';

export type ThemeMode = 'system' | 'light' | 'dark';
export type LanguageMode = 'zh-CN' | 'en-US';

export class AppearanceService {
  private static context?: common.UIAbilityContext;
  private static mainWindow?: window.Window;
  private static themeMode: ThemeMode = 'system';
  private static languageMode: LanguageMode = 'zh-CN';
  private static systemDark: boolean = false;
  private static appliedNativeTheme: string = '';
  private static appliedNativeLanguage: string = '';
  private static nativeThemeTimer: number = -1;
  private static persistRevision: number = 0;
  private static persistChain: Promise<void> = Promise.resolve();

  static async initialize(context: common.UIAbilityContext): Promise<void> {
    AppearanceService.context = context;
    const initializeRevision = AppearanceService.persistRevision;
    AppearanceService.systemDark = context.config.colorMode ===
      ConfigurationConstant.ColorMode.COLOR_MODE_DARK;
    try {
      const store = await preferences.getPreferences(context, 'jingwei_appearance');
      const theme = String(await store.get('themeMode', 'system'));
      const language = String(await store.get('language', 'zh-CN'));
      if (initializeRevision === AppearanceService.persistRevision) {
        AppearanceService.themeMode = theme === 'dark' || theme === 'light' ? theme : 'system';
        AppearanceService.languageMode = language === 'en-US' ? 'en-US' : 'zh-CN';
      }
    } catch (_) {
    }
    // Native language resources are applied only during cold-start bootstrap.
    // Runtime language changes stay inside the reactive ArkUI state tree so a
    // settings tap can never trigger a full application configuration reload.
    if (initializeRevision === AppearanceService.persistRevision) AppearanceService.applyColdStartNativeLanguage();
    AppearanceService.publishLanguage();
    AppearanceService.publishTheme(true);
    AppearanceService.applyNativeTheme();
  }

  static attachWindow(mainWindow: window.Window): void {
    AppearanceService.mainWindow = mainWindow;
    AppearanceService.applySystemBars();
  }

  static detachWindow(mainWindow: window.Window): void {
    if (AppearanceService.mainWindow === mainWindow) {
      AppearanceService.mainWindow = undefined;
    }
  }

  static currentTheme(): ThemeMode { return AppearanceService.themeMode; }
  static currentLanguage(): LanguageMode { return AppearanceService.languageMode; }

  static setTheme(mode: ThemeMode): void {
    AppearanceService.themeMode = mode;
    AppearanceService.publishTheme(false);
    AppearanceService.scheduleNativeTheme();
    AppearanceService.enqueuePersist();
  }

  static setLanguage(language: LanguageMode): void {
    AppearanceService.languageMode = language;
    AppearanceService.publishLanguage();
    AppearanceService.enqueuePersist();
  }

  static syncSystemColorMode(isDark: boolean): void {
    // Ignore configuration echoes caused by an explicit in-app theme.
    if (AppearanceService.themeMode !== 'system') return;
    AppearanceService.systemDark = isDark;
    if (AppearanceService.themeMode === 'system') {
      AppearanceService.publishTheme(false);
    }
  }

  private static publishLanguage(): void {
    AppearanceService.setStorage('language', AppearanceService.languageMode);
  }

  private static publishTheme(forceBridge: boolean): void {
    AppearanceService.setStorage('themeMode', AppearanceService.themeMode);
    const dark = AppearanceService.resolvedDarkMode();
    const changed = AppStorage.get<boolean>('darkMode') !== dark;
    AppearanceService.setStorage('darkMode', dark);
    if (changed || forceBridge) ComponentThemeBridge.apply(dark);
    AppearanceService.applySystemBars();
  }

  private static setStorage<T>(key: string, value: T): void {
    if (AppStorage.has(key)) AppStorage.set<T>(key, value);
    else AppStorage.setOrCreate<T>(key, value);
  }

  private static applyColdStartNativeLanguage(): void {
    const application = AppearanceService.context?.getApplicationContext();
    if (!application) return;
    if (AppearanceService.appliedNativeLanguage === AppearanceService.languageMode) return;
    try {
      application.setLanguage(AppearanceService.languageMode);
      AppearanceService.appliedNativeLanguage = AppearanceService.languageMode;
    } catch (_) {
      // App-owned text remains correct even if a platform resource locale is unavailable.
    }
  }

  private static scheduleNativeTheme(): void {
    if (AppearanceService.nativeThemeTimer >= 0) {
      clearTimeout(AppearanceService.nativeThemeTimer);
    }
    AppearanceService.nativeThemeTimer = setTimeout((): void => {
      AppearanceService.nativeThemeTimer = -1;
      AppearanceService.applyNativeTheme();
    }, 16);
  }

  private static applyNativeTheme(): void {
    const application = AppearanceService.context?.getApplicationContext();
    if (!application || AppearanceService.appliedNativeTheme === AppearanceService.themeMode) return;
    const colorMode = AppearanceService.themeMode === 'dark'
      ? ConfigurationConstant.ColorMode.COLOR_MODE_DARK
      : AppearanceService.themeMode === 'light'
        ? ConfigurationConstant.ColorMode.COLOR_MODE_LIGHT
        : ConfigurationConstant.ColorMode.COLOR_MODE_NOT_SET;
    try {
      application.setColorMode(colorMode);
      AppearanceService.appliedNativeTheme = AppearanceService.themeMode;
    } catch (_) {
    }
  }

  private static resolvedDarkMode(): boolean {
    if (AppearanceService.themeMode === 'dark') return true;
    if (AppearanceService.themeMode === 'light') return false;
    return AppearanceService.systemDark;
  }

  private static applySystemBars(): void {
    if (!AppearanceService.mainWindow) return;
    const dark = AppearanceService.resolvedDarkMode();
    const contentColor = dark ? '#FFF5F1E8' : '#FF211E18';
    try {
      AppearanceService.mainWindow.setWindowSystemBarProperties({
        statusBarColor: '#00000000',
        navigationBarColor: '#00000000',
        isStatusBarLightIcon: dark,
        statusBarContentColor: contentColor,
        isNavigationBarLightIcon: dark,
        navigationBarContentColor: contentColor
      });
    } catch (_) {
      // System bar styling is visual only and must never block application startup.
    }
  }

  static retryPersistence(): void { AppearanceService.enqueuePersist(); }

  private static enqueuePersist(): Promise<void> {
    const revision = ++AppearanceService.persistRevision;
    AppearanceService.setStorage<string>('appearanceSaveState', 'saving');
    const theme = AppearanceService.themeMode;
    const language = AppearanceService.languageMode;
    const write = async (): Promise<void> => {
      if (revision !== AppearanceService.persistRevision) return;
      if (!AppearanceService.context) {
        AppearanceService.setStorage<string>('appearanceSaveState', 'failed');
        return;
      }
      try {
        const store = await preferences.getPreferences(AppearanceService.context, 'jingwei_appearance');
        if (revision !== AppearanceService.persistRevision) return;
        await store.put('themeMode', theme);
        await store.put('language', language);
        await store.flush();
        if (revision === AppearanceService.persistRevision) AppearanceService.setStorage<string>('appearanceSaveState', 'saved');
      } catch (_) {
        // Keep the live selection and offer retry instead of silently claiming it was saved.
        if (revision === AppearanceService.persistRevision) AppearanceService.setStorage<string>('appearanceSaveState', 'failed');
      }
    };
    AppearanceService.persistChain = AppearanceService.persistChain.then(write, write);
    return AppearanceService.persistChain;
  }
}
