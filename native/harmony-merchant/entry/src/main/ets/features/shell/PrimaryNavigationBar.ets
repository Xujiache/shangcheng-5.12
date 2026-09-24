import { DesignTokens } from '../../core/theme/DesignTokens';
import { I18n } from '../../core/i18n/I18n';
import { primaryNavigationIcon } from './PrimaryNavigationAssets';

@Component
export struct PrimaryNavigationBar {
  @Prop activeTab: number = 0;
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('language') private language: string = 'zh-CN';
  onSelect: (index: number) => void = () => {};

  @Builder
  private item(index: number, label: string) {
    Column({ space: 3 }) {
      Stack({ alignContent: Alignment.Center }) {
        if (this.activeTab === index) {
          Row()
            .width(44)
            .height(28)
            .borderRadius(14)
            .backgroundColor(DesignTokens.brandTint(this.darkMode));
        }
        Image(primaryNavigationIcon(index))
          .width(this.activeTab === index ? 31 : 28)
          .height(this.activeTab === index ? 31 : 28)
          .objectFit(ImageFit.Contain)
          .animation({ duration: 160, curve: Curve.EaseOut });
      }.width(50).height(33);
      Text(label)
        .width('100%').textAlign(TextAlign.Center).textOverflow({ overflow: TextOverflow.Ellipsis })
        .fontSize(11)
        .fontWeight(this.activeTab === index ? FontWeight.Medium : FontWeight.Regular)
        .fontColor(this.activeTab === index ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode))
        .maxLines(1);
    }
    .layoutWeight(1)
    .height('100%')
    .justifyContent(FlexAlign.Center)
    .onClick((): void => this.onSelect(index));
  }

  build() {
    Stack({ alignContent: Alignment.Center }) {
      Row() {
        this.item(0, I18n.text(this.language, '首页', 'Home'));
        this.item(1, I18n.text(this.language, '商品', 'Products'));
        this.item(2, I18n.text(this.language, '订单', 'Orders'));
        this.item(3, I18n.text(this.language, '数据', 'Analytics'));
        this.item(4, I18n.text(this.language, '我的', 'Me'));
      }.width('100%').height('100%').padding({ left: 4, right: 4 });
    }
    .width('100%')
    .height('100%')
    .backgroundColor(DesignTokens.elevatedSurface(this.darkMode))
    .border({ width: 1, color: DesignTokens.border(this.darkMode) })
    .borderRadius(38)
    .shadow({
      color: this.darkMode ? '#70000000' : '#22000000',
      radius: this.darkMode ? 20 : 24,
      offsetY: -4
    });
  }
}
