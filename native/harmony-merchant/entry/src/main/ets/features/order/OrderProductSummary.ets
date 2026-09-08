import { OrderItem } from './OrderModels';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { DesignTokens } from '../../core/theme/DesignTokens';

@Component
export struct OrderProductSummary {
  @Prop item: OrderItem = { id: '', productId: '', productName: '', productImage: '', specsLabel: '', unitPrice: 0, quantity: 0 };
  @StorageLink('darkMode') private darkMode: boolean = false;

  build() {
    Row({ space: 12 }) {
      ResilientRemoteImage({ originalUrl: this.item.productImage || '', widthValue: 64, heightValue: 64, radius: 10 })
        .onClick((): void => { /* Consume this tap without blocking parent scrolling. */ });
      Column({ space: 5 }) {
        Text(this.item.productName)
          .width('100%').fontSize(14).fontWeight(FontWeight.Medium)
          .fontColor(DesignTokens.text(this.darkMode)).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(this.item.specsLabel)
          .width('100%').fontSize(12).fontColor(DesignTokens.muted(this.darkMode))
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
        Row({ space: 6 }) {
          Text(`¥${this.item.unitPrice.toFixed(2)}`).layoutWeight(1).fontSize(13)
            .fontColor(DesignTokens.text(this.darkMode)).wordBreak(WordBreak.BREAK_ALL);
          Text(`×${this.item.quantity}`).constraintSize({ maxWidth: '38%' }).fontSize(12)
            .fontColor(DesignTokens.muted(this.darkMode)).wordBreak(WordBreak.BREAK_ALL);
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').alignItems(VerticalAlign.Top);
  }
}
