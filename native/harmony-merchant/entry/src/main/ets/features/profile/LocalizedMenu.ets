import { I18n } from '../../core/i18n/I18n';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

// Pass untranslated copy across Builder boundaries. Each leaf owns its locale subscription.
export class MenuCopy {
  zh: string;
  en: string;
  constructor(zh: string = '', en: string = '') { this.zh = zh; this.en = en; }
}

@Component
export struct MenuHeading {
  @Prop copy: MenuCopy = new MenuCopy();
  @Prop detail: string = '';
  @Prop account: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column({ space: 3 }) {
      Text(I18n.text(this.language, this.copy.zh, this.copy.en)).fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).width('100%');
      if (this.detail || this.account) Text(this.detail || I18n.text(this.language, '正在同步', 'Syncing')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
    }.width('100%').alignItems(HorizontalAlign.Start).padding({ left: 2, bottom: 8 });
  }
}

@Component
export struct MenuRow {
  icon: Resource = $r('app.media.commerce_settings_lite');
  @Prop copy: MenuCopy = new MenuCopy();
  @Prop detail: MenuCopy = new MenuCopy();
  @Prop appearanceSummary: boolean = false;
  @Prop showBorder: boolean = true;
  action: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('themeMode') private theme: string = 'system';
  @StorageLink('darkMode') private darkMode: boolean = false;
  private subtitle(): string {
    if (!this.appearanceSummary) return I18n.text(this.language, this.detail.zh, this.detail.en);
    const theme = this.theme === 'dark' ? I18n.text(this.language, '深色', 'Dark')
      : this.theme === 'light' ? I18n.text(this.language, '浅色', 'Light') : I18n.text(this.language, '跟随系统', 'System');
    return `${theme} · ${this.language === 'en-US' ? 'English' : '简体中文'}`;
  }
  build() {
    Row({ space: 12 }) {
      Image(this.icon).width(42).height(42).objectFit(ImageFit.Contain);
      Column({ space: 4 }) {
        Text(I18n.text(this.language, this.copy.zh, this.copy.en)).fontSize(14).fontWeight(FontWeight.Medium)
          .fontColor(DesignTokens.text(this.darkMode)).width('100%');
        if (this.subtitle()) Text(this.subtitle()).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 16 });
    }.width('100%').constraintSize({ minHeight: 64 }).padding({ left: 14, right: 14, top: 10, bottom: 10 })
      .border({ width: { bottom: this.showBorder ? 1 : 0 }, color: DesignTokens.border(this.darkMode) }).onClick(this.action);
  }
}

@Component
export struct MenuTile {
  icon: Resource = $r('app.media.commerce_settings_lite');
  @Prop copy: MenuCopy = new MenuCopy();
  @Prop compact: boolean = false;
  action: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column({ space: 7 }) {
      Image(this.icon).width(this.compact ? 43 : 48).height(this.compact ? 43 : 48).objectFit(ImageFit.Contain);
      Text(I18n.text(this.language, this.copy.zh, this.copy.en)).fontSize(this.compact ? 11 : 12)
        .fontColor(DesignTokens.text(this.darkMode)).maxLines(2).textAlign(TextAlign.Center);
    }.width('100%').constraintSize({ minHeight: this.compact ? 78 : 86 }).justifyContent(FlexAlign.Center).onClick(this.action);
  }
}
