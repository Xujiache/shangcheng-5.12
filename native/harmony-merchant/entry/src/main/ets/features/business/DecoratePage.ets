import { common } from '@kit.AbilityKit';
import { IBestActionSheet, IBestButton, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { FileUploadService } from '../../core/file/FileUploadService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { ProductRepository } from '../product/ProductRepository';
import { ProductSummary } from '../product/ProductModels';
import { BannerItem, ShopDecorate } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';

interface DecorateColorOption { value: string; }

@Builder
export function DecorateBuilder(_: string) { DecoratePage(); }

@Component
struct DecoratePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private merchantId: string = '';
  @State private themeColor: string = '#FF5A36';
  @State private fontStyle: string = 'modern';
  @State private layout: string = 'twoColumn';
  @State private banners: BannerItem[] = [];
  @State private previewProducts: ProductSummary[] = [];
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  @State private uploading: boolean = false;
  private readonly colors: DecorateColorOption[] = [
    { value: '#FF4D2D' }, { value: '#D93030' }, { value: '#FF6B9C' }, { value: '#8B5CF6' },
    { value: '#3B82F6' }, { value: '#10B981' }, { value: '#F59E0B' }, { value: '#374151' }
  ];

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    try {
      const data = await BusinessRepository.decorate();
      this.merchantId = data.merchantId;
      this.themeColor = data.themeColor;
      this.fontStyle = data.fontStyle;
      this.layout = data.productLayout;
      this.banners = data.banners;
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '装修配置加载失败', 'Failed to load store design'));
    }
    try {
      this.previewProducts = (await ProductRepository.list('active', '', 1, 4)).list;
    } catch (_) {
      this.previewProducts = [];
    } finally {
      this.loading = false;
    }
  }

  private addBanner(): void {
    if (this.uploading) return;
    if (this.banners.length >= 5) {
      IBestToast.show(I18n.text(this.language, '最多5张轮播图', 'Up to 5 banners'));
      return;
    }
    IBestActionSheet.show({
      actions: [
        I18n.text(this.language, '从相册选择', 'Choose from Photos'),
        I18n.text(this.language, '拍照', 'Take photo')
      ],
      cancelText: I18n.text(this.language, '取消', 'Cancel'),
      onSelect: (index: number): void => {
        if (index === 0) this.addBannerFromAlbum();
        else if (index === 1) this.captureBanner();
      }
    });
  }

  private async addBannerFromAlbum(): Promise<void> {
    if (this.uploading) return;
    this.uploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(5 - this.banners.length, 'product');
      const next = this.banners.slice();
      urls.forEach((url: string) => next.push({ image: url }));
      this.banners = next;
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '上传失败', 'Upload failed'));
    } finally {
      this.uploading = false;
    }
  }

  private async captureBanner(): Promise<void> {
    if (this.uploading) return;
    this.uploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'product');
      if (url) this.banners = this.banners.concat([{ image: url }]).slice(0, 5);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '拍照上传失败', 'Failed to capture and upload photo'));
    } finally {
      this.uploading = false;
    }
  }

  private remove(index: number): void {
    this.banners = this.banners.filter((_: BannerItem, itemIndex: number) => itemIndex !== index);
  }

  private async save(): Promise<void> {
    if (this.saving) return;
    if (this.uploading) {
      IBestToast.show(I18n.text(this.language, 'Banner 仍在上传，请稍候', 'A banner is still uploading. Please wait.'));
      return;
    }
    if (this.banners.some((item: BannerItem) => !/^https?:\/\//i.test(item.image))) {
      IBestToast.show(I18n.text(this.language, '存在未上传完成的轮播图，请重新选择', 'Some banners did not finish uploading. Select them again.'));
      return;
    }
    const body: ShopDecorate = {
      merchantId: this.merchantId,
      themeColor: this.themeColor,
      fontStyle: this.fontStyle,
      banners: this.banners,
      productLayout: this.layout
    };
    this.saving = true;
    try {
      await BusinessRepository.saveDecorate(body);
      IBestToast.show(I18n.text(this.language, '店铺装修已保存', 'Store design saved'));
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.saving = false;
    }
  }

  @Builder
  private option(value: string, label: string, current: string, onTap: () => void) {
    Text(label).fontSize(13).padding({ left: 12, right: 12, top: 9, bottom: 9 })
      .backgroundColor(current === value ? this.themeColor : DesignTokens.subtle(this.darkMode))
      .fontColor(current === value ? Color.White : DesignTokens.text(this.darkMode))
      .borderRadius(17).onClick(onTap);
  }

  @Builder
  private miniProduct(item: ProductSummary) {
    Column({ space: 4 }) {
      if (item.images.length > 0) {
        Image(item.images[0]).width('100%').height(this.layout === 'singleLarge' ? 88 : 62)
          .objectFit(ImageFit.Cover).borderRadius(6);
      } else {
        Row().width('100%').height(62).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(6);
      }
      Text(item.name).fontSize(8).maxLines(1).width('100%');
      Text(`¥${item.priceRetailMin.toFixed(0)}`).fontSize(9).fontColor(this.themeColor)
        .fontWeight(FontWeight.Bold).width('100%');
    }.width(this.layout === 'singleLarge' ? '100%' : '48%').padding(5).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(8);
  }

  @Builder
  private phonePreview() {
    Column({ space: 8 }) {
      Row() { Text('9:41').fontSize(8); Blank(); Text('5G').fontSize(8); }.width('100%');
      Column({ space: 6 }) {
        Text(I18n.text(this.language, '经纬科技 · 旗舰店', 'Jingwei · Flagship store')).fontSize(12)
          .fontWeight(FontWeight.Bold).fontColor(Color.White).width('100%');
        Text(I18n.text(this.language, '搜索商品', 'Search products')).fontSize(9).fontColor('#AAFFFFFF')
          .padding(6).width('100%').backgroundColor('#33FFFFFF').borderRadius(8);
      }.width('100%').padding(10).backgroundColor(this.themeColor);
      if (this.banners.length > 0) {
        Image(this.banners[0].image).width('100%').height(86).objectFit(ImageFit.Cover);
      } else {
        Column() { Text(I18n.text(this.language, '尚未添加 Banner', 'No banner added')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode)); }
          .width('100%').height(86).justifyContent(FlexAlign.Center).backgroundColor(DesignTokens.subtle(this.darkMode));
      }
      Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.SpaceBetween }) {
        ForEach(this.previewProducts, (item: ProductSummary) => { this.miniProduct(item); }, (item: ProductSummary) => item.id);
      }.width('100%');
      if (this.previewProducts.length === 0) {
        Text(I18n.text(this.language, '发布商品后预览将自动加载', 'Products appear here after publishing'))
          .fontSize(9).fontColor(DesignTokens.muted(this.darkMode));
      }
    }.width(230).padding(8).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(24).border({ width: 5, color: '#202124' });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({ title: I18n.text(this.language, '店铺装修', 'Store design'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 14 }) {
              this.phonePreview();
              Column({ space: 12 }) {
                Text(I18n.text(this.language, `主题色 · ${this.themeColor}`, `Theme colour · ${this.themeColor}`))
                  .fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Flex({ wrap: FlexWrap.Wrap }) {
                  ForEach(this.colors, (item: DecorateColorOption) => {
                    Column() {
                      if (this.themeColor === item.value) MerchantIcon({ name: 'success', color: Color.White, iconSize: 15 });
                    }.width(38).height(38).margin({ right: 10, bottom: 10 }).backgroundColor(item.value)
                      .borderRadius(19).justifyContent(FlexAlign.Center).onClick(() => this.themeColor = item.value);
                  }, (item: DecorateColorOption) => item.value);
                }.width('100%');
                Text(I18n.text(this.language, '字体风格', 'Typography')).fontSize(15).fontWeight(FontWeight.Medium).width('100%');
                Row({ space: 8 }) {
                  this.option('modern', I18n.text(this.language, '现代', 'Modern'), this.fontStyle, () => this.fontStyle = 'modern');
                  this.option('elegant', I18n.text(this.language, '雅致', 'Elegant'), this.fontStyle, () => this.fontStyle = 'elegant');
                  this.option('playful', I18n.text(this.language, '俏皮', 'Playful'), this.fontStyle, () => this.fontStyle = 'playful');
                  this.option('minimal', I18n.text(this.language, '极简', 'Minimal'), this.fontStyle, () => this.fontStyle = 'minimal');
                }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 12 }) {
                Text(I18n.text(this.language, `首页轮播图 · ${this.banners.length} / 5`, `Home banners · ${this.banners.length} / 5`))
                  .fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                ForEach(this.banners, (item: BannerItem, index: number) => {
                  Stack({ alignContent: Alignment.TopEnd }) {
                    Image(item.image).width('100%').height(150).objectFit(ImageFit.Cover).borderRadius(12);
                    Text(index === 0 ? I18n.text(this.language, '首张 · 删除', 'First · Delete') : I18n.text(this.language, '删除', 'Delete'))
                      .fontSize(12).fontColor(Color.White).padding(8).backgroundColor('#99000000')
                      .borderRadius({ topRight: 12, bottomLeft: 12 }).onClick(() => this.remove(index));
                  }.width('100%');
                }, (item: BannerItem) => item.image);
                IBestButton({
                  text: this.uploading ? I18n.text(this.language, '上传中…', 'Uploading…') : I18n.text(this.language, '添加轮播图', 'Add banner'),
                  plain: true, color: this.themeColor, btnWidth: '100%', loading: this.uploading,
                  disabled: this.uploading || this.banners.length >= 5, onBtnClick: () => this.addBanner()
                });
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 12 }) {
                Text(I18n.text(this.language, '商品布局', 'Product layout')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Row({ space: 8 }) {
                  this.option('waterfall', I18n.text(this.language, '瀑布流', 'Waterfall'), this.layout, () => this.layout = 'waterfall');
                  this.option('twoColumn', I18n.text(this.language, '双列', 'Two columns'), this.layout, () => this.layout = 'twoColumn');
                  this.option('singleLarge', I18n.text(this.language, '单列大图', 'Large single column'), this.layout, () => this.layout = 'singleLarge');
                }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              IBestButton({ text: I18n.text(this.language, '保存并发布', 'Save and publish'), type: 'primary',
                color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                btnWidth: '100%', loading: this.saving,
                disabled: this.saving || this.uploading, onBtnClick: () => this.save() });
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
