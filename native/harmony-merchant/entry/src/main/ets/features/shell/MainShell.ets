import { DesignTokens } from '../../core/theme/DesignTokens';
import { OrderListPage } from '../order/OrderListPage';
import { ProductListPage } from '../product/ProductListPage';
import { StatsPage } from '../stats/StatsPage';
import { MePage } from '../profile/MePage';
import { WorkbenchPage } from './WorkbenchPage';
import { PrimaryTabTarget } from './PrimaryTabCoordinator';
import { I18n } from '../../core/i18n/I18n';
import { PrimaryNavigationBar } from './PrimaryNavigationBar';
import { PrimaryNavigationMetrics } from './PrimaryNavigationMetrics';
import { primaryNavigationIcon } from './PrimaryNavigationAssets';

@Component
export struct MainShell {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageProp('primaryTabIntentEpoch') @Watch('consumeTabIntent') private tabIntentEpoch: number = 0;
  @StorageProp('commerceEpoch') @Watch('refreshCommerceTabs') private commerceEpoch: number = 0;
  @State private activeTab: number = 0;
  @State private productStatus: string = '';
  @State private orderStatus: string = '';
  @State private loadedTabs: number[] = [0];
  @State private activationEpochs: number[] = [1, 0, 0, 0, 0];
  aboutToAppear(): void {
    this.consumeTabIntent();
  }

  private refreshCommerceTabs(): void {
    // Hidden primary pages stay frozen. The target page receives a fresh
    // activation epoch when the merchant returns to it, so background events
    // never trigger network/layout work in an invisible component.
    if (![0, 2, 3].includes(this.activeTab) || !this.loadedTabs.includes(this.activeTab)) return;
    const epochs = this.activationEpochs.slice();
    epochs[this.activeTab] = epochs[this.activeTab] + 1;
    this.activationEpochs = epochs;
  }

  private consumeTabIntent(): void {
    const target = AppStorage.get<PrimaryTabTarget>('primaryTabTarget');
    const status = AppStorage.get<string>('primaryTabStatus') || '';
    if (!target) return;
    if (target === 'home') this.activateTab(0);
    else if (target === 'product') { this.productStatus = status; this.activateTab(1); }
    else if (target === 'order') { this.orderStatus = status; this.activateTab(2); }
    else if (target === 'stats') this.activateTab(3);
    else this.activateTab(4);
    AppStorage.setOrCreate('primaryTabTarget', '');
    AppStorage.setOrCreate('primaryTabStatus', '');
  }

  private activateTab(index: number): void {
    if (!this.loadedTabs.includes(index)) this.loadedTabs = this.loadedTabs.concat([index]);
    const epochs = this.activationEpochs.slice();
    epochs[index] = epochs[index] + 1;
    this.activationEpochs = epochs;
    this.activeTab = index;
  }

  @Builder
  private content() {
    Stack() {
      if (this.loadedTabs.includes(0)) {
        Column() { WorkbenchPage({ activationEpoch: this.activationEpochs[0], isActive: this.activeTab === 0 }); }.width('100%').height('100%')
          .visibility(this.activeTab === 0 ? Visibility.Visible : Visibility.None);
      }
      if (this.loadedTabs.includes(1)) {
        Column() { ProductListPage({ initialStatus: this.productStatus, activationEpoch: this.activationEpochs[1] }); }.width('100%').height('100%')
          .visibility(this.activeTab === 1 ? Visibility.Visible : Visibility.None);
      }
      if (this.loadedTabs.includes(2)) {
        Column() { OrderListPage({ initialStatus: this.orderStatus, activationEpoch: this.activationEpochs[2] }); }.width('100%').height('100%')
          .visibility(this.activeTab === 2 ? Visibility.Visible : Visibility.None);
      }
      if (this.loadedTabs.includes(3)) {
        Column() { StatsPage({ activationEpoch: this.activationEpochs[3] }); }.width('100%').height('100%')
          .visibility(this.activeTab === 3 ? Visibility.Visible : Visibility.None);
      }
      if (this.loadedTabs.includes(4)) {
        Column() { MePage({ activationEpoch: this.activationEpochs[4] }); }.width('100%').height('100%')
          .visibility(this.activeTab === 4 ? Visibility.Visible : Visibility.None);
      }
    }.width('100%').height('100%');
  }

  @Builder
  private railItem(index: number, label: string) {
    Column({ space: 6 }) {
      Image(primaryNavigationIcon(index))
        .width(this.activeTab === index ? 31 : 28)
        .height(this.activeTab === index ? 31 : 28)
        .objectFit(ImageFit.Contain)
        .scale({ x: this.activeTab === index ? 1.06 : 1, y: this.activeTab === index ? 1.06 : 1 })
        .animation({ duration: 160, curve: Curve.EaseOut });
      Text(label).fontSize(11)
        .fontColor(this.activeTab === index ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
    }
    .width(68).height(62).justifyContent(FlexAlign.Center)
    .backgroundColor(this.activeTab === index ? DesignTokens.brandTint(this.darkMode) : Color.Transparent)
    .borderRadius(18).onClick(() => { this.activateTab(index); });
  }

  // On expanded and unfolded windows the primary business navigation is the
  // stable master pane. The selected native business surface is the detail
  // pane; it keeps the same route/state instance when the window folds again.
  @Builder
  private expandedMasterPane() {
    Column({ space: 8 }) {
      Text(I18n.text(this.language, '经纬', 'Jingwei')).fontSize(17).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.brand(this.darkMode)).margin({ bottom: 18 });
      this.railItem(0, I18n.text(this.language, '首页', 'Home'));
      this.railItem(1, I18n.text(this.language, '商品', 'Products'));
      this.railItem(2, I18n.text(this.language, '订单', 'Orders'));
      this.railItem(3, I18n.text(this.language, '数据', 'Analytics'));
      this.railItem(4, I18n.text(this.language, '我的', 'Me'));
      Blank();
    }
    .width(92).height('100%').padding({ top: this.safeTop + 14, bottom: this.safeBottom + 12 })
    .backgroundColor(DesignTokens.surface(this.darkMode)).alignItems(HorizontalAlign.Center)
    .shadow({ color: this.darkMode ? '#52000000' : '#14000000', radius: 18, offsetX: 4 });
  }

  @Builder
  private expandedDetailPane() {
    Column() { this.content(); }.layoutWeight(1).height('100%');
  }

  build() {
    if (this.windowWidth >= 720) {
      Row() {
        this.expandedMasterPane();
        this.expandedDetailPane();
      }.width('100%').height('100%');
    } else {
      Stack({ alignContent: Alignment.Bottom }) {
        this.content();
        PrimaryNavigationBar({
          activeTab: this.activeTab,
          onSelect: (index: number): void => this.activateTab(index)
        })
          .width('92%')
          .height(PrimaryNavigationMetrics.HEIGHT)
          .position({ left: '4%', bottom: this.safeBottom + PrimaryNavigationMetrics.FLOAT_GAP })
          .zIndex(20);
      }.width('100%').height('100%');
    }
  }
}
