import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';

@Component
export struct EditorHeading {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop step: string = '';
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 8 }) {
      if (this.step) Text(this.step).fontSize(11).fontWeight(FontWeight.Medium).fontColor(DesignTokens.brand(this.darkMode))
        .width(24).height(24).textAlign(TextAlign.Center).backgroundColor(DesignTokens.brandTint(this.darkMode)).borderRadius(8);
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(16).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
    }.width('100%');
  }
}

@Component
export struct EditorActionRow {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop value: string = '';
  @Prop hintZh: string = '';
  @Prop hintEn: string = '';
  @Prop inline: boolean = false;
  action: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 12 }) {
      if (this.inline) {
        Text(I18n.text(this.language, this.zh, this.en)).fontSize(14).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        Text(this.value || I18n.text(this.language, this.hintZh, this.hintEn)).fontSize(13).layoutWeight(1.3)
          .fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.End).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
      } else {
        Column({ space: 4 }) {
          Text(I18n.text(this.language, this.zh, this.en)).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
          if (this.value || this.hintZh || this.hintEn) Text(this.value || I18n.text(this.language, this.hintZh, this.hintEn)).fontSize(13)
            .fontColor(DesignTokens.muted(this.darkMode)).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      }
      MerchantIcon({ name: 'arrow', iconSize: 18, color: DesignTokens.muted(this.darkMode) });
    }.width('100%').constraintSize({ minHeight: 52 }).padding({ top: 8, bottom: 8 })
      .border({ width: { bottom: 0.5 }, color: DesignTokens.border(this.darkMode) }).onClick(this.action);
  }
}

@Component
export struct EditorChoice {
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop selected: boolean = false;
  action: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Row({ space: 12 }) {
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(14).layoutWeight(1).fontColor(DesignTokens.text(this.darkMode));
      if (this.selected) MerchantIcon({ name: 'success', iconSize: 22, color: DesignTokens.brand(this.darkMode) });
      else Column().width(20).height(20).borderRadius(10).border({ width: 1, color: DesignTokens.border(this.darkMode) });
    }.width('100%').constraintSize({ minHeight: 50 }).padding({ left: 14, right: 14, top: 10, bottom: 10 })
      .borderRadius(12).backgroundColor(this.selected ? DesignTokens.brandTint(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .accessibilityText(I18n.text(this.language, this.zh, this.en)).accessibilityChecked(this.selected).onClick(this.action);
  }
}

@Component
export struct EditorNumberField {
  @Link value: string;
  @Prop zh: string = '';
  @Prop en: string = '';
  @Prop integer: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column({ space: 6 }) {
      Text(I18n.text(this.language, this.zh, this.en)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      TextInput({ text: this.value, placeholder: this.integer ? '0' : '0.00' })
        .type(this.integer ? InputType.Number : InputType.NUMBER_DECIMAL).height(48).fontSize(15).padding({ left: 12, right: 12 })
        .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(10)
        .accessibilityText(I18n.text(this.language, this.zh, this.en)).onChange((value: string) => { this.value = value; });
    }.width('100%').alignItems(HorizontalAlign.Start);
  }
}
