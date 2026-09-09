import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { ProductImageItem } from './ProductImageQueue';

@Component
export struct ProductMediaEditor {
  @Link items: ProductImageItem[];
  @Prop detail: boolean = false;
  @Prop busy: boolean = false;
  onAdd: () => void = () => {};
  onPreview: (index: number) => void = () => {};
  onMenu: (index: number) => void = () => {};
  onRetry: (index: number) => void = () => {};
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @Builder private picture(item: ProductImageItem, size: number) {
    ResilientRemoteImage({ originalUrl: item.preview || item.url, widthValue: size, heightValue: size, radius: 12 });
  }
  @Builder private addTile() {
    Button({ type: ButtonType.Normal }) {
      Column({ space: 8 }) {
        MerchantIcon({ name: 'add-o', iconSize: 24, color: DesignTokens.brand(this.darkMode) });
        Text(I18n.text(this.language, '添加图片', 'Add image')).fontSize(13).fontColor(DesignTokens.text(this.darkMode));
        Text(`${this.items.length}/${this.detail ? 20 : 10}`).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%');
    }.width(88).height(88).borderRadius(12).backgroundColor(DesignTokens.subtle(this.darkMode))
      .enabled(!this.busy).onClick(this.onAdd);
  }
  build() {
    Column({ space: 6 }) {
      if (this.items.length > 0) {
        Scroll() {
          Row({ space: 10 }) {
            ForEach(this.items, (item: ProductImageItem, index: number) => {
              Column() {
                Stack({ alignContent: Alignment.TopStart }) {
                  this.picture(item, 88);
                  if (!this.detail && index === 0) Text(I18n.text(this.language, '封面', 'Cover')).fontSize(11)
                    .fontColor(DesignTokens.onBrand(this.darkMode)).backgroundColor(DesignTokens.brand(this.darkMode))
                    .padding({ left: 6, right: 6, top: 3, bottom: 3 }).borderRadius({ topLeft: 12, bottomRight: 8 });
                  if (item.state === 'uploading' || item.state === 'queued') {
                    Column() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }
                      .width(88).height(88).justifyContent(FlexAlign.Center).backgroundColor('#44000000').borderRadius(12);
                  }
                }.onClick(() => this.onPreview(index));
                Button({ type: ButtonType.Normal }) {
                  Row({ space: 4 }) {
                    Text(item.state === 'failed' ? I18n.text(this.language, '重试', 'Retry') : I18n.text(this.language, '管理', 'Manage'))
                      .fontSize(13).fontColor(item.state === 'failed' ? DesignTokens.danger(this.darkMode) : DesignTokens.muted(this.darkMode));
                    MerchantIcon({ name: item.state === 'failed' ? 'replay' : 'more-o', iconSize: 14, color: DesignTokens.muted(this.darkMode) });
                  }
                }.width(88).height(44).backgroundColor(Color.Transparent).enabled(!this.busy)
                  .onClick(() => { if (item.state === 'failed') this.onRetry(index); else this.onMenu(index); });
              }.width(88);
            }, (item: ProductImageItem, index: number) => `${item.id}-${index}-${item.state}-${item.url}`);
            if (this.items.length < (this.detail ? 20 : 10)) this.addTile();
          }.alignItems(VerticalAlign.Top);
        }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off).width('100%');
      } else {
        Button({ type: ButtonType.Normal }) {
          Row({ space: 12 }) {
            MerchantIcon({ name: 'photo-o', iconSize: 30, color: DesignTokens.brand(this.darkMode) });
            Column({ space: 5 }) {
              Text(I18n.text(this.language, '添加商品图片', 'Add product images')).fontSize(14).fontColor(DesignTokens.text(this.darkMode));
              Text(I18n.text(this.language, this.detail ? '最多 20 张，按展示顺序排列' : '首张为封面，最多 10 张',
                this.detail ? 'Up to 20 images, in display order' : 'First image is the cover · up to 10'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            }.layoutWeight(1).alignItems(HorizontalAlign.Start);
            MerchantIcon({ name: 'add-o', iconSize: 20, color: DesignTokens.brand(this.darkMode) });
          }.width('100%');
        }.width('100%').constraintSize({ minHeight: 76 }).padding(12).borderRadius(12)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).enabled(!this.busy).onClick(this.onAdd);
      }
    }.width('100%').alignItems(HorizontalAlign.Start);
  }
}
