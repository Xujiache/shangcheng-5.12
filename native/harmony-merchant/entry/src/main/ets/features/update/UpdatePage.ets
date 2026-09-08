import { common } from '@kit.AbilityKit';
import { updateManager } from '@kit.AppGalleryKit';
import { IBestButton, IBestNavBar, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { AppConfig } from '../../core/config/AppConfig';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { HarmonyRelease } from './UpdateModels';
import { UpdateRepository } from './UpdateRepository';
import { UpdatePolicy } from './UpdatePolicy';
import { I18n } from '../../core/i18n/I18n';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function UpdateBuilder(_: string) {
  UpdatePage();
}

@Component
struct UpdatePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private checking: boolean = true;
  @State private errorMessage: string = '';
  @State private genericError: boolean = false;
  @State private noPublishedRelease: boolean = false;
  @State private latestVersion: string = '';
  @State private latestCode: number = 0;
  @State private latestSize: number = 0;
  @State private changelog: string = '';
  @State private publishedAt: string = '';
  @State private forceUpdate: boolean = false;
  @State private storeUrl: string = '';
  @State private openingStore: boolean = false;

  aboutToAppear(): void {
    this.check();
  }

  private async check(): Promise<void> {
    this.checking = true;
    this.errorMessage = '';
    this.genericError = false;
    this.noPublishedRelease = false;
    try {
      const release: HarmonyRelease | null = await UpdateRepository.latest();
      if (!release) {
        this.latestVersion = AppConfig.CLIENT_VERSION;
        this.latestCode = AppConfig.CLIENT_VERSION_CODE;
        this.latestSize = 0;
        this.changelog = '';
        this.noPublishedRelease = true;
        this.publishedAt = '';
        this.forceUpdate = false;
        this.storeUrl = '';
        return;
      }
      this.latestVersion = release.version;
      this.latestCode = release.versionCode;
      this.latestSize = release.size;
      this.changelog = release.changelog;
      this.publishedAt = release.publishedAt;
      this.forceUpdate = release.force;
      this.storeUrl = UpdatePolicy.storeUrl(release, AppConfig.APP_GALLERY_URL);
    } catch (error) {
      this.errorMessage = error instanceof ApiError ? error.message : '';
      this.genericError = !(error instanceof ApiError);
    } finally {
      this.checking = false;
    }
  }

  private visibleError(): string {
    if (this.genericError) return I18n.text(this.language, '版本信息获取失败', 'Failed to retrieve version information');
    return this.errorMessage;
  }

  private visibleChangelog(): string {
    if (this.noPublishedRelease) {
      return I18n.text(this.language,
        '当前暂无已发布的 AppGallery 新版本', 'No newer AppGallery release is currently published');
    }
    return this.changelog || I18n.text(this.language, '暂无更新说明', 'No release notes');
  }

  private async openStoreUpdate(): Promise<void> {
    if (this.openingStore) return;
    this.openingStore = true;
    const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
    try {
      const result = await updateManager.checkAppUpdate(context);
      if (result.updateAvailable === 1) {
        await updateManager.showUpdateDialog(context);
        return;
      }
      await context.openLink(this.storeUrl || AppConfig.APP_GALLERY_URL, { appLinkingOnly: false });
    } catch (_) {
      try {
        await context.openLink(this.storeUrl || AppConfig.APP_GALLERY_URL, { appLinkingOnly: false });
      } catch (_) {
        IBestToast.show(I18n.text(this.language,
          '无法打开 AppGallery，请确认已安装华为应用市场后重试',
          'Unable to open AppGallery. Install or enable AppGallery, then try again.'));
      }
    } finally {
      this.openingStore = false;
    }
  }

  private hasNewVersion(): boolean {
    return UpdatePolicy.hasNewVersion({
      platform: AppConfig.CLIENT_PLATFORM,
      version: this.latestVersion,
      versionCode: this.latestCode,
      url: '',
      size: this.latestSize,
      changelog: this.changelog,
      force: this.forceUpdate,
      publishedAt: this.publishedAt
    }, AppConfig.CLIENT_VERSION_CODE);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '版本中心', 'Update center'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Column({ space: 16 }) {
          if (this.checking) {
            Column() { MerchantIcon({ name: 'upgrade', color: DesignTokens.brand(this.darkMode), iconSize: 34 }); }
              .width(68).height(68).justifyContent(FlexAlign.Center)
              .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(23);
            LoadingProgress().width(38).height(38).color(DesignTokens.brand(this.darkMode));
            Text(I18n.text(this.language, '正在检查新版本', 'Checking for updates')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
          } else if (this.errorMessage || this.genericError) {
            MerchantIcon({ name: 'replay', color: DesignTokens.brand(this.darkMode), iconSize: 34 });
            Text(I18n.text(this.language, '检查更新遇到问题', 'Unable to check for updates'))
              .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
            Text(this.visibleError()).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
            IBestButton({ text: I18n.text(this.language, '重新检查', 'Check again'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.check() });
          } else {
            Column() { MerchantIcon({ name: 'upgrade', color: DesignTokens.brand(this.darkMode), iconSize: 34 }); }
              .width(68).height(68).justifyContent(FlexAlign.Center)
              .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(23);
            Row({ space: 8 }) {
              Text(`v${this.latestVersion}`).fontSize(25).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
              if (this.forceUpdate) IBestTag({ text: I18n.text(this.language, '重要更新', 'Required update'), type: 'danger' });
            }
            Text(I18n.text(this.language,
              `当前版本 v${AppConfig.CLIENT_VERSION} · versionCode ${AppConfig.CLIENT_VERSION_CODE}`,
              `Current version v${AppConfig.CLIENT_VERSION} · versionCode ${AppConfig.CLIENT_VERSION_CODE}`))
              .fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            if (this.publishedAt) {
              Text(I18n.text(this.language, `发布时间：${this.publishedAt}`, `Published: ${this.publishedAt}`))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            }
            Text(I18n.text(this.language,
              `安装包大小：${UpdatePolicy.packageSize(this.latestSize)}`,
              `Package size: ${UpdatePolicy.packageSize(this.latestSize)}`))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            Text(this.visibleChangelog())
              .fontSize(15).fontColor(DesignTokens.text(this.darkMode)).lineHeight(24).width('100%')
              .padding(14).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14);
            IBestButton({
              text: this.hasNewVersion()
                ? I18n.text(this.language, '前往 AppGallery 更新', 'Update in AppGallery')
                : I18n.text(this.language, '已是最新版本', 'Up to date'),
              type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%',
              loading: this.openingStore,
              disabled: !this.hasNewVersion() || this.openingStore,
              onBtnClick: () => this.openStoreUpdate()
            });
          }
        }
        .layoutWeight(1)
        .width('92%')
        .constraintSize({ maxWidth: 620 })
        .justifyContent(FlexAlign.Start)
        .padding({ left: 24, right: 24, top: 24, bottom: this.safeBottom + 24 })
        .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_XL)
        .border({ width: 1, color: DesignTokens.border(this.darkMode) })
        .margin({ top: 18, bottom: this.safeBottom + 18 });
      }
      .width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
