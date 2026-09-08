import { DesignTokens } from '../theme/DesignTokens';
import { MerchantIcon } from '../theme/MerchantIcon';
import { I18n } from '../i18n/I18n';

@Component
export struct ResilientRemoteImage {
  @Prop @Watch('resetSource') thumbnailUrl: string = '';
  @Prop @Watch('resetSource') originalUrl: string = '';
  @Prop widthValue: number = 88;
  @Prop heightValue: number = 88;
  @Prop radius: number = 12;
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @State private currentUrl: string = '';
  @State private loading: boolean = true;
  @State private failed: boolean = false;
  private usingOriginal: boolean = false;

  aboutToAppear(): void {
    this.resetSource();
  }

  private resetSource(): void {
    this.usingOriginal = !this.thumbnailUrl;
    this.currentUrl = this.thumbnailUrl || this.originalUrl;
    this.loading = this.currentUrl.length > 0;
    this.failed = this.currentUrl.length === 0;
  }

  private onLoadFailed(): void {
    if (!this.usingOriginal && this.originalUrl && this.originalUrl !== this.currentUrl) {
      this.usingOriginal = true;
      this.loading = true;
      this.failed = false;
      this.currentUrl = this.originalUrl;
      return;
    }
    this.loading = false;
    this.failed = true;
  }

  private retry(): void {
    this.resetSource();
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      if (this.loading) {
        Column()
          .width('100%').height('100%')
          .backgroundColor(DesignTokens.subtle(this.darkMode));
        LoadingProgress().width(22).height(22).color(DesignTokens.brand(this.darkMode));
      }
      if (this.currentUrl && !this.failed) {
        Image(this.currentUrl)
          .width('100%').height('100%')
          .objectFit(ImageFit.Cover)
          .sourceSize({ width: 480, height: 480 })
          .opacity(this.loading ? 0 : 1)
          .onComplete((): void => {
            this.loading = false;
            this.failed = false;
          })
          .onError((): void => this.onLoadFailed());
      }
      if (this.failed) {
        Column({ space: 5 }) {
          MerchantIcon({ name: 'warning-o', color: DesignTokens.muted(this.darkMode), iconSize: 18 });
          Text(I18n.text(this.language, '点击重试', 'Tap to retry'))
            .fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%').height('100%').justifyContent(FlexAlign.Center).onClick(() => this.retry());
      }
    }
    .width(this.widthValue).height(this.heightValue)
    .borderRadius(this.radius).clip(true)
    .backgroundColor(DesignTokens.subtle(this.darkMode));
  }
}
