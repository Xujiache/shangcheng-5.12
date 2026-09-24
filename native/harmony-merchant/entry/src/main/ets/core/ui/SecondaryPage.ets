import { DesignTokens } from '../theme/DesignTokens';
import { MerchantIcon } from '../theme/MerchantIcon';
import { I18n } from '../i18n/I18n';

/** Shared chrome only. Business forms, lists, maps and chat keep their own layout. */
@Component
export struct SecondaryHeader {
  @Prop title: string = '';
  @Prop rightLabel: string = '';
  @Prop isShowRight: boolean = false;
  @Prop isShowStatusBar: boolean = true;
  @Prop navBarBgColor: string = '';
  @Prop titleColor: string = '';
  @Prop leftIconColor: string = '';
  @Prop rightLabelColor: string = '';
  @Prop rightIcon: string = '';
  @Prop rightIconColor: string = '';
  @Prop rightIconSize: number = 20;
  @Prop rightEnabled: boolean = true;
  onLeftClick: () => void = () => {};
  onRightClick: () => void = () => {};
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column() {
      Row({ space: 6 }) {
        Button({ type: ButtonType.Normal }) {
          MerchantIcon({ name: 'arrow-left', iconSize: 22, color: DesignTokens.text(this.darkMode) });
        }.width(44).height(44).borderRadius(12).backgroundColor(Color.Transparent)
          .accessibilityText(I18n.text(this.language, '返回', 'Back')).onClick(this.onLeftClick);
        Text(this.title).fontSize(20).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode))
          .layoutWeight(1).padding({ top: 8, bottom: 8 });
        if (this.isShowRight && this.rightLabel) {
          Button(this.rightLabel, { type: ButtonType.Normal }).constraintSize({ minHeight: 44, maxWidth: '34%' })
            .fontSize(13).fontColor(DesignTokens.brand(this.darkMode)).backgroundColor(Color.Transparent)
            .borderRadius(10).padding({ left: 10, right: 10 }).enabled(this.rightEnabled).onClick(this.onRightClick);
        }
      }.width('100%').constraintSize({ minHeight: 52 }).padding({ left: 4, right: 12 });
      Divider().color(DesignTokens.border(this.darkMode)).opacity(0.55);
    }.width('100%').padding({ top: this.isShowStatusBar ? this.safeTop : 0 }).backgroundColor(DesignTokens.page(this.darkMode));
  }
}

@Component
export struct SecondaryFeedback {
  @Prop errorKind: string = '';
  @Prop updating: boolean = false;
  onRetry: () => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    if (this.errorKind) {
      Row({ space: 10 }) {
        MerchantIcon({ name: 'warning-o', iconSize: 20, color: DesignTokens.warning(this.darkMode) });
        Text(this.errorKind === 'permission' ? I18n.text(this.language, '当前账号无权访问此内容。', 'This account cannot access this content.')
          : this.errorKind === 'unavailable' ? I18n.text(this.language, '此功能暂不可用，请稍后重试。', 'This feature is unavailable. Please retry later.')
            : I18n.text(this.language, '未能完成更新，请重试。已有内容仍为上次成功结果。', 'Unable to update. Existing content is from the last successful load.'))
          .fontSize(13).lineHeight(19).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        Button(I18n.text(this.language, '重试', 'Retry'), { type: ButtonType.Normal }).height(44).fontSize(14)
          .fontColor(DesignTokens.brand(this.darkMode)).backgroundColor(Color.Transparent).enabled(!this.updating).onClick(this.onRetry);
      }.width('100%').padding({ left: 16, right: 12, top: 6, bottom: 6 }).backgroundColor(DesignTokens.warningTint(this.darkMode));
    }
  }
}

@Component
export struct SecondarySaveBar {
  @Prop saving: boolean = false;
  @Prop canSave: boolean = true;
  @Prop changed: boolean = false;
  onSave: () => void = () => {};
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Column({ space: 6 }) {
      Text(this.changed ? I18n.text(this.language, '有未保存的修改', 'Unsaved changes') : I18n.text(this.language, '修改后点击保存生效', 'Save to apply your changes'))
        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      Button(this.saving ? I18n.text(this.language, '保存中…', 'Saving…') : I18n.text(this.language, '保存修改', 'Save changes'), { type: ButtonType.Normal })
        .height(48).width('100%').fontSize(15).fontWeight(FontWeight.Medium).borderRadius(12)
        .fontColor(DesignTokens.onBrand(this.darkMode)).backgroundColor(DesignTokens.brand(this.darkMode))
        .enabled(this.canSave && !this.saving).opacity(this.canSave ? 1 : 0.45).onClick(this.onSave);
    }.width('100%').padding({ left: 16, right: 16, top: 10, bottom: this.safeBottom + 10 }).backgroundColor(DesignTokens.card(this.darkMode));
  }
}
