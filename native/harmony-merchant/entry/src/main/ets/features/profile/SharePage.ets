import { common } from '@kit.AbilityKit';
import { pasteboard } from '@kit.BasicServicesKit';
import { systemShare } from '@kit.ShareKit';
import { IBestButton, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppConfig } from '../../core/config/AppConfig';
import { ImageSaveService } from '../../core/file/ImageSaveService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function ShareAppBuilder(_: string) { SharePage(); }

@Component
struct SharePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private saving: boolean = false;

  private async copyLink(): Promise<void> {
    try {
      const record = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, AppConfig.APP_GALLERY_URL);
      await pasteboard.getSystemPasteboard().setData(record);
      IBestToast.show(I18n.text(this.language, '下载链接已复制', 'Download link copied'));
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '复制失败', 'Copy failed'));
    }
  }

  private async share(): Promise<void> {
    try {
      const record: systemShare.SharedRecord = {
        utd: 'general.plain-text',
        title: I18n.text(this.language, '经纬科技-商家端', 'Jingwei Merchant'),
        content: I18n.text(this.language,
          `经纬科技门窗电商商家端：${AppConfig.APP_GALLERY_URL}`,
          `Jingwei Merchant for the windows and doors marketplace: ${AppConfig.APP_GALLERY_URL}`),
        description: I18n.text(this.language, '商品、订单、客服与经营管理', 'Products, orders, customer service and business management')
      };
      const data = new systemShare.SharedData(record);
      const controller = new systemShare.ShareController(data);
      await controller.show(this.getUIContext().getHostContext() as common.UIAbilityContext, {});
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '分享失败', 'Sharing failed'));
    }
  }

  private async savePoster(result: SaveButtonOnClickResult): Promise<void> {
    if (result !== SaveButtonOnClickResult.SUCCESS || this.saving) {
      if (result !== SaveButtonOnClickResult.SUCCESS) {
        IBestToast.show(I18n.text(this.language, '未获得保存图片授权', 'Permission to save the image was not granted'));
      }
      return;
    }
    this.saving = true;
    try {
      await ImageSaveService.saveComponent(
        this.getUIContext().getHostContext() as common.UIAbilityContext,
        this.getUIContext(),
        'merchant-share-poster',
        I18n.text(this.language, `经纬商家端_${Date.now()}`, `Jingwei_Merchant_${Date.now()}`)
      );
      IBestToast.show(I18n.text(this.language, '分享海报已保存到图库', 'Share poster saved to Photos'));
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '海报保存失败', 'Failed to save the poster'));
    } finally {
      this.saving = false;
    }
  }

  @Builder
  private poster() {
    Column({ space: 15 }) {
      Column() {
        Text(I18n.text(this.language, '经', 'J')).fontSize(34).fontWeight(FontWeight.Bold).fontColor(DesignTokens.onBrand(this.darkMode));
      }.width(78).height(78).borderRadius(22).backgroundColor(DesignTokens.brand(this.darkMode))
        .justifyContent(FlexAlign.Center);
      Text(I18n.text(this.language, '经纬科技-商家端', 'Jingwei Merchant')).fontSize(22).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
      Text(I18n.text(this.language, '门窗电商经营管理工作台', 'Windows and doors commerce workbench')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
      Stack({ alignContent: Alignment.Center }) {
        Column().width(206).height(206).backgroundColor('#FFFDF8F0').borderRadius(16);
        QRCode(AppConfig.APP_GALLERY_URL).width(180).height(180).color('#FF17130C').backgroundColor('#FFFDF8F0');
      }.width(218).height(218).backgroundColor('#FFFDF8F0')
        .borderRadius(20).shadow({ color: '#28000000', radius: 18, offsetY: 6 });
      Text(I18n.text(this.language, '使用系统相机扫码，前往 AppGallery 下载', 'Scan with the system camera to download from AppGallery')).fontSize(12)
        .fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
      Text(AppConfig.APP_GALLERY_URL).fontSize(9).fontColor(DesignTokens.muted(this.darkMode)).maxLines(2).textAlign(TextAlign.Center);
    }.id('merchant-share-poster').width('100%').padding({ left: 28, right: 28, top: 28, bottom: 28 })
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(26)
      .border({ width: 1, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '分享应用', 'Share app'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            this.poster();
            IBestButton({
              text: I18n.text(this.language, '打开系统分享', 'Open system share'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
              btnWidth: '100%', onBtnClick: () => this.share()
            });
            IBestButton({
              text: I18n.text(this.language, '复制 AppGallery 链接', 'Copy AppGallery link'), plain: true,
              color: DesignTokens.brand(this.darkMode), btnWidth: '100%', onBtnClick: () => this.copyLink()
            });
            SaveButton({
              icon: SaveIconStyle.FULL_FILLED,
              text: SaveDescription.SAVE_IMAGE,
              buttonType: ButtonType.Capsule
            })
              .width('100%').height(48).fontSize(15).fontColor(DesignTokens.brand(this.darkMode))
              .backgroundColor(DesignTokens.brandTint(this.darkMode))
              .onClick((_event: ClickEvent, result: SaveButtonOnClickResult) => this.savePoster(result));
            Text(I18n.text(this.language,
              '二维码和分享链接均指向正式 AppGallery 详情页。',
              'The QR code and share link both open the official AppGallery listing.'))
              .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).textAlign(TextAlign.Center);
          }.width('100%').padding({ left: 20, right: 20, top: 18, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
