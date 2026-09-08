import { IBestNavBar } from '@ibestservices/ibest-ui';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { HarmonyPushClient } from '../../core/push/HarmonyPushClient';
import { AppearanceService, LanguageMode, ThemeMode } from '../../core/theme/AppearanceService';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function AppearanceSettingsBuilder(_: string) { AppearanceSettingsPage(); }

@Component
struct AppearanceSettingsPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: LanguageMode = 'zh-CN';
  @StorageLink('themeMode') private theme: ThemeMode = 'system';
  @StorageLink('darkMode') private darkMode: boolean = false;
  private selectTheme(mode: ThemeMode): void {
    this.theme = mode;
    AppearanceService.setTheme(mode);
  }

  private selectLanguage(mode: LanguageMode): void {
    this.language = mode;
    AppearanceService.setLanguage(mode);
    HarmonyPushClient.updateLocale(mode).catch((): void => {});
  }

  @Builder
  private choice(title: string, description: string, selected: boolean, action: () => void, border: boolean = true) {
    Row({ space: 12 }) {
      Column({ space: 4 }) {
        Text(title).fontSize(15).fontWeight(FontWeight.Medium)
          .fontColor(selected ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode)).width('100%');
        Text(description).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      Column() {
        if (selected) MerchantIcon({ name: 'checked', color: DesignTokens.onBrand(this.darkMode), iconSize: 15 });
      }.width(26).height(26).justifyContent(FlexAlign.Center)
        .backgroundColor(selected ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
        .border({ width: selected ? 0 : 1, color: DesignTokens.border(this.darkMode) }).borderRadius(13);
    }.width('100%').height(66).padding({ left: 16, right: 16 })
      .backgroundColor(selected ? DesignTokens.selectedSurface(this.darkMode) : Color.Transparent)
      .border({ width: { bottom: border ? 1 : 0 }, color: DesignTokens.border(this.darkMode) }).onClick(action);
  }

  @Builder
  private section(title: string) {
    Text(title).fontSize(13).fontWeight(FontWeight.Medium).fontColor(DesignTokens.muted(this.darkMode))
      .width('100%').padding({ left: 4, bottom: 8 });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '主题与语言', 'Theme and language'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            Column() {
              this.section(I18n.text(this.language, '主题模式', 'Theme'));
              Column() {
                this.choice(I18n.text(this.language, '跟随系统', 'Use system setting'),
                  I18n.text(this.language, '随系统外观自动切换', 'Switch automatically with the system'),
                  this.theme === 'system', () => this.selectTheme('system'));
                this.choice(I18n.text(this.language, '浅色模式', 'Light mode'),
                  I18n.text(this.language, '象牙白与深金色界面', 'Ivory surfaces with deep-gold accents'),
                  this.theme === 'light', () => this.selectTheme('light'));
                this.choice(I18n.text(this.language, '深色模式', 'Dark mode'),
                  I18n.text(this.language, '纯黑、炭黑与香槟金界面', 'Black surfaces with champagne-gold accents'),
                  this.theme === 'dark', () => this.selectTheme('dark'), false);
              }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20)
                .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            }.width('100%');
            Column() {
              this.section(I18n.text(this.language, '显示语言', 'Display language'));
              Column() {
                this.choice(I18n.text(this.language, '简体中文', 'Chinese (Simplified)'), 'Chinese (Simplified)', this.language === 'zh-CN',
                  () => this.selectLanguage('zh-CN'));
                this.choice('English', I18n.text(this.language, '英语', 'English'), this.language === 'en-US',
                  () => this.selectLanguage('en-US'), false);
              }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20)
                .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            }.width('100%');
            Row({ space: 10 }) {
              MerchantIcon({ name: 'info-o', color: DesignTokens.brand(this.darkMode), iconSize: 18 });
              Text(I18n.text(this.language,
                '选择后立即生效，不需要退出或重启应用。',
                'Changes take effect immediately without restarting the app.'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1).lineHeight(19);
            }.width('100%').padding(14).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(16);
          }.width('100%').constraintSize({ maxWidth: 680 })
            .padding({ left: 16, right: 16, top: 16, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
