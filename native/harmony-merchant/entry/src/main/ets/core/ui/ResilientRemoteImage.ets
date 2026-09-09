import { DesignTokens } from '../theme/DesignTokens';
import { MerchantIcon } from '../theme/MerchantIcon';
import { I18n } from '../i18n/I18n';
import { ImageAttempt, RemoteImagePolicy } from './RemoteImagePolicy';

@Component
export struct ResilientRemoteImage {
  @Prop @Watch('resetSource') thumbnailUrl: string = '';
  @Prop @Watch('resetSource') originalUrl: string = '';
  @Prop widthValue: number = 88;
  @Prop heightValue: number = 88;
  @Prop radius: number = 12;
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  @State private attempts: ImageAttempt[] = [];
  @State private loading: boolean = true;
  @State private failed: boolean = false;
  private sequence: number = 0;

  aboutToAppear(): void { this.resetSource(); }
  aboutToDisappear(): void { this.sequence += 1; }
  private resetSource(): void {
    const url = RemoteImagePolicy.first((this.thumbnailUrl || '').trim(), (this.originalUrl || '').trim());
    this.start(url);
  }
  private start(url: string): void {
    this.sequence += 1;
    this.loading = !!url;
    this.failed = false;
    this.attempts = url ? [new ImageAttempt(this.sequence, url)] : [];
  }
  private onLoadFailed(attempt: ImageAttempt): void {
    if (attempt.id !== this.sequence) return;
    if (attempt.url === this.thumbnailUrl && this.originalUrl && this.originalUrl !== attempt.url) {
      RemoteImagePolicy.failedThumbnail(attempt.url);
      this.start(this.originalUrl);
    } else {
      this.loading = false;
      this.failed = true;
    }
  }
  build() {
    Stack({ alignContent: Alignment.Center }) {
      if (this.loading || this.attempts.length === 0) {
        Column({ space: 5 }) {
          MerchantIcon({ name: 'photo-o', color: DesignTokens.muted(this.darkMode), iconSize: 30 });
          if (!this.loading) {
            Text(I18n.text(this.language, '暂无图片', 'No image')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
          }
        }.opacity(0.55);
      }
      if (!this.failed) {
        ForEach(this.attempts, (attempt: ImageAttempt) => {
          Image(attempt.url).width('100%').height('100%').objectFit(ImageFit.Cover)
            .sourceSize({ width: Math.min(480, this.widthValue * 3), height: Math.min(480, this.heightValue * 3) })
            .syncLoad(false).draggable(false).opacity(this.loading ? 0 : 1)
            .onComplete((event): void => {
              if (attempt.id !== this.sequence || event?.loadingStatus !== 1) return;
              this.loading = false;
            })
            .onError((): void => this.onLoadFailed(attempt));
        }, (attempt: ImageAttempt): string => `${attempt.id}:${attempt.url}`);
      } else {
        Button({ type: ButtonType.Normal }) {
          Column({ space: 5 }) {
            MerchantIcon({ name: 'replay', color: DesignTokens.muted(this.darkMode), iconSize: 22 });
            Text(I18n.text(this.language, '重新加载', 'Retry')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
          }
        }.width('100%').height('100%').backgroundColor(Color.Transparent)
          .accessibilityText(I18n.text(this.language, '重新加载图片', 'Retry image'))
          .onClick((): void => this.resetSource());
      }
    }.width(this.widthValue).height(this.heightValue).borderRadius(this.radius).clip(true)
      .backgroundColor(DesignTokens.subtle(this.darkMode));
  }
}
