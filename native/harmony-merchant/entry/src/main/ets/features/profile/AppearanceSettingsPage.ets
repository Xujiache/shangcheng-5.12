import { IBestNavBar } from '@ibestservices/ibest-ui';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { HarmonyPushClient } from '../../core/push/HarmonyPushClient';
import { AppearanceService, LanguageMode, ThemeMode } from '../../core/theme/AppearanceService';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

// Each option owns a reactive subscription. Do not pass a boolean snapshot
// through an @Builder argument: it can leave the old selection rendered.
@Component
struct ThemeOption {
  @Prop mode: ThemeMode = 'system';
  @StorageLink('themeMode') private theme: ThemeMode = 'system';
  @StorageLink('language') private language: LanguageMode = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  onSelect: () => void = (): void => {};
  private title(): string {
    if (this.mode === 'light') return I18n.text(this.language, '浅色', 'Light');
    if (this.mode === 'dark') return I18n.text(this.language, '深色', 'Dark');
    return I18n.text(this.language, '跟随系统', 'System');
  }
  build() {
    Button({ type: ButtonType.Normal }) {
      Column({ space: 12 }) {
        Stack({ alignContent: Alignment.Center }) {
          Image(this.mode === 'light' ? $r('app.media.ui_sun') : this.mode === 'dark'
            ? $r('app.media.ui_moon') : $r('app.media.commerce_appearance_lite'))
            .width(38).height(38).objectFit(ImageFit.Contain);
        }.width('100%').height(72).borderRadius(14)
          .backgroundColor(this.mode === 'dark' ? '#242421' : this.mode === 'light' ? '#F6F3EB' : DesignTokens.subtle(this.darkMode));
        Text(this.title()).fontSize(14).fontWeight(this.theme === this.mode ? FontWeight.Bold : FontWeight.Medium)
          .fontColor(DesignTokens.text(this.darkMode)).maxLines(2).textAlign(TextAlign.Center);
        if (this.theme === this.mode) {
          MerchantIcon({ name: 'checked', color: DesignTokens.brand(this.darkMode), iconSize: 20 });
        } else { Blank().height(20); }
      }.width('100%').padding(10);
    }.layoutWeight(1).borderRadius(18).padding(0).backgroundColor(DesignTokens.card(this.darkMode))
      .border({ width: this.theme === this.mode ? 2 : 1, color: this.theme === this.mode ? DesignTokens.brand(this.darkMode) : DesignTokens.border(this.darkMode) })
      .accessibilityText(`${this.title()}${this.theme === this.mode ? I18n.text(this.language, '，已选中', ', selected') : ''}`)
      .onClick((): void => this.onSelect());
  }
}

@Component
struct LanguageOption {
  @Prop mode: LanguageMode = 'zh-CN';
  @StorageLink('language') private language: LanguageMode = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  onSelect: () => void = (): void => {};
  build() {
    Button({ type: ButtonType.Normal }) {
      Row({ space: 14 }) {
        Image($r('app.media.ui_language')).width(36).height(36).objectFit(ImageFit.Contain);
        Column({ space: 4 }) {
          Text(this.mode === 'zh-CN' ? '简体中文' : 'English').fontSize(16).fontWeight(FontWeight.Medium)
            .fontColor(DesignTokens.text(this.darkMode));
          Text(this.mode === 'zh-CN' ? 'Chinese · Simplified' : I18n.text(this.language, '英语', 'English'))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        if (this.language === this.mode) {
          MerchantIcon({ name: 'checked', color: DesignTokens.brand(this.darkMode), iconSize: 24 });
        }
      }.width('100%').padding(16);
    }.width('100%').padding(0).borderRadius(16)
      .backgroundColor(this.language === this.mode ? DesignTokens.selectedSurface(this.darkMode) : DesignTokens.card(this.darkMode))
      .border({ width: 1, color: this.language === this.mode ? DesignTokens.brand(this.darkMode) : DesignTokens.border(this.darkMode) })
      .accessibilityText(`${this.mode === 'zh-CN' ? '简体中文' : 'English'}${this.language === this.mode ? I18n.text(this.language, '，已选中', ', selected') : ''}`)
      .onClick((): void => this.onSelect());
  }
}

@Builder
export function AppearanceSettingsBuilder(_: string) { AppearanceSettingsPage(); }

@Component
struct AppearanceSettingsPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: LanguageMode = 'zh-CN';
  @StorageLink('themeMode') private theme: ThemeMode = 'system';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('appearanceSaveState') private saveState: string = 'saved';
  private selectTheme(mode: ThemeMode): void {
    this.theme = mode;
    AppearanceService.setTheme(mode);
  }
  private selectLanguage(mode: LanguageMode): void {
    this.language = mode;
    AppearanceService.setLanguage(mode);
    HarmonyPushClient.updateLocale(mode).catch((): void => {});
  }
  build() {
    NavDestination() {
      Column() {
        IBestNavBar({ title: I18n.text(this.language, '主题与语言', 'Theme and language'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
        Scroll() {
          Column({ space: 24 }) {
            Row({ space: 14 }) {
              Image($r('app.media.commerce_appearance_lite')).width(48).height(48).objectFit(ImageFit.Contain);
              Column({ space: 5 }) {
                Text(I18n.text(this.language, '让工作界面更合心意', 'Make it feel like yours')).fontSize(20).fontWeight(FontWeight.Bold)
                  .fontColor(DesignTokens.text(this.darkMode));
                Text(I18n.text(this.language, '外观与语言分别设置，选择即生效', 'Independent preferences. Changes apply instantly.'))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).lineHeight(19);
              }.layoutWeight(1).alignItems(HorizontalAlign.Start);
            }.width('100%');
            Column({ space: 12 }) {
              Text(I18n.text(this.language, '外观模式', 'Appearance')).width('100%').fontSize(16).fontWeight(FontWeight.Bold)
                .fontColor(DesignTokens.text(this.darkMode));
              Row({ space: 10 }) {
                ThemeOption({ mode: 'system', onSelect: (): void => this.selectTheme('system') });
                ThemeOption({ mode: 'light', onSelect: (): void => this.selectTheme('light') });
                ThemeOption({ mode: 'dark', onSelect: (): void => this.selectTheme('dark') });
              }.width('100%').alignItems(VerticalAlign.Top);
              Text(this.theme === 'system'
                ? I18n.text(this.language, '已跟随设备外观，系统切换后自动更新。', 'Automatically follows your device appearance.')
                : I18n.text(this.language, '仅改变此 App 的外观，不修改手机设置。', 'Only this app changes. Device settings stay unchanged.'))
                .width('100%').fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).lineHeight(19);
            }.width('100%');
            Column({ space: 10 }) {
              Text(I18n.text(this.language, '显示语言', 'Display language')).width('100%').fontSize(16).fontWeight(FontWeight.Bold)
                .fontColor(DesignTokens.text(this.darkMode)).margin({ bottom: 2 });
              LanguageOption({ mode: 'zh-CN', onSelect: (): void => this.selectLanguage('zh-CN') });
              LanguageOption({ mode: 'en-US', onSelect: (): void => this.selectLanguage('en-US') });
            }.width('100%');
            Row({ space: 8 }) {
              MerchantIcon({ name: this.saveState === 'failed' ? 'warning-o' : 'shield-o', color: DesignTokens.muted(this.darkMode), iconSize: 18 });
              Text(this.saveState === 'failed' ? I18n.text(this.language, '偏好未保存，点击重试', 'Not saved. Tap to retry')
                : this.saveState === 'saving' ? I18n.text(this.language, '正在保存偏好…', 'Saving preferences…')
                  : I18n.text(this.language, '已保存到本机 · 无需重启', 'Saved on this device · No restart needed'))
                .fontSize(12).fontColor(this.saveState === 'failed' ? DesignTokens.danger(this.darkMode) : DesignTokens.muted(this.darkMode))
                .layoutWeight(1).lineHeight(19);
            }.width('100%').padding(14).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14)
              .onClick((): void => { if (this.saveState === 'failed') AppearanceService.retryPersistence(); });
          }.width('100%').constraintSize({ maxWidth: 680 }).padding({ left: 20, right: 20, top: 24, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}