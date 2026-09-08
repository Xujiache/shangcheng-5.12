import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { IBestButton, IBestDialogUtil, IBestEmpty, IBestSearch, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { ProductSummary } from './ProductModels';
import { ProductRepository } from './ProductRepository';
import { I18n } from '../../core/i18n/I18n';

interface ProductFilter {
  value: string;
}

@Component
export struct ProductListPage {
  @Prop @Watch('onInitialStatus') initialStatus: string = '';
  @Prop @Watch('onActivation') activationEpoch: number = 0;
  showBack: boolean = false;
  @StorageProp('safeTop') private safeTop: number = 24;
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private status: string = '';
  @State private keyword: string = '';
  @State private products: ProductSummary[] = [];
  @State private page: number = 1;
  @State private total: number = 0;
  @State private loading: boolean = false;
  @State private refreshing: boolean = false;
  @State private errorMessage: string = '';
  @State private selectionMode: boolean = false;
  @State private selectedIds: string[] = [];
  @State private processingBatch: boolean = false;
  private requestEpoch: number = 0;
  private readonly filters: ProductFilter[] = [
    { value: '' }, { value: 'active' }, { value: 'offline' }, { value: 'draft' },
    { value: 'auditing' }, { value: 'rejected' }
  ];

  aboutToAppear(): void {
    this.status = this.initialStatus;
    this.reload();
  }

  private onInitialStatus(): void {
    if (this.status === this.initialStatus) return;
    this.status = this.initialStatus;
    this.selectedIds = [];
    this.selectionMode = false;
    this.reload();
  }

  private onActivation(): void { this.reload(); }

  private async reload(): Promise<void> {
    this.page = 1;
    this.products = [];
    await this.load(false);
  }

  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedStatus = this.status;
    const requestedKeyword = this.keyword.trim();
    const requestedPage = this.page;
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await ProductRepository.list(requestedStatus, requestedKeyword, requestedPage);
      if (epoch !== this.requestEpoch) return;
      this.products = append ? this.products.concat(result.list) : result.list;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        if (append && this.page === requestedPage) this.page = Math.max(1, requestedPage - 1);
        this.errorMessage = error instanceof ApiError ? error.message : 'i18n:product-load';
      }
    } finally {
      if (epoch === this.requestEpoch) {
        this.loading = false;
        this.refreshing = false;
      }
    }
  }

  private async loadMore(): Promise<void> {
    if (this.products.length >= this.total || this.loading) return;
    this.page += 1;
    await this.load(true);
  }

  private changeStatus(next: string): void {
    if (this.status === next) return;
    this.status = next;
    this.selectedIds = [];
    this.reload();
  }

  private toggleSelection(id: string): void {
    if (this.selectedIds.includes(id)) {
      this.selectedIds = this.selectedIds.filter((value: string) => value !== id);
    } else {
      this.selectedIds = this.selectedIds.concat([id]);
    }
  }

  private allVisibleSelected(): boolean {
    return this.products.length > 0 && this.products.every((item: ProductSummary): boolean => this.selectedIds.includes(item.id));
  }

  private toggleAllVisible(): void {
    if (this.allVisibleSelected()) {
      const visibleIds = this.products.map((item: ProductSummary): string => item.id);
      this.selectedIds = this.selectedIds.filter((id: string): boolean => !visibleIds.includes(id));
      return;
    }
    const next = this.selectedIds.slice();
    this.products.forEach((item: ProductSummary): void => {
      if (!next.includes(item.id)) next.push(item.id);
    });
    this.selectedIds = next;
  }

  private confirmBatchDelete(): void {
    if (this.selectedIds.length === 0) {
      IBestToast.show(I18n.text(this.language, '请先选择商品', 'Select products first'));
      return;
    }
    IBestDialogUtil.open({
      title: I18n.text(this.language, '批量删除商品', 'Delete selected products'),
      message: I18n.text(this.language,
        `确定删除已选的 ${this.selectedIds.length} 件商品吗？删除后不可恢复。`,
        `Delete ${this.selectedIds.length} selected product(s)? This cannot be undone.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => { this.batch('delete'); }
    });
  }

  private async batch(action: string): Promise<void> {
    if (this.processingBatch) return;
    if (this.selectedIds.length === 0) {
      IBestToast.show(I18n.text(this.language, '请先选择商品', 'Select products first'));
      return;
    }
    this.processingBatch = true;
    try {
      if (action === 'online') await ProductRepository.batchOnline(this.selectedIds);
      else if (action === 'offline') await ProductRepository.batchOffline(this.selectedIds);
      else await ProductRepository.batchDelete(this.selectedIds);
      IBestToast.show(I18n.text(this.language, '操作成功', 'Operation completed'));
      this.selectionMode = false;
      this.selectedIds = [];
      await this.reload();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '操作失败', 'Operation failed'));
    } finally {
      this.processingBatch = false;
    }
  }

  private statusLabel(status: string): string {
    if (status === 'active') return I18n.text(this.language, '在售', 'On sale');
    if (status === 'offline') return I18n.text(this.language, '已下架', 'Offline');
    if (status === 'draft') return I18n.text(this.language, '草稿', 'Draft');
    if (status === 'auditing') return I18n.text(this.language, '审核中', 'Under review');
    if (status === 'rejected') return I18n.text(this.language, '已驳回', 'Rejected');
    return status;
  }

  private filterLabel(status: string): string {
    if (!status) return I18n.text(this.language, '全部', 'All');
    return this.statusLabel(status);
  }

  @Builder
  private productCard(item: ProductSummary) {
    Row({ space: 12 }) {
      if (this.selectionMode) {
        Checkbox({ name: item.id, group: 'product-selection' })
          .select(this.selectedIds.includes(item.id))
          .selectedColor(DesignTokens.brand(this.darkMode))
          .onChange(() => this.toggleSelection(item.id));
      }
      if (item.images.length > 0) {
        Image(item.images[0]).width(88).height(88).objectFit(ImageFit.Cover).borderRadius(12);
      } else {
        Column() { Text(I18n.text(this.language, '无图', 'No image')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }
          .width(88).height(88).justifyContent(FlexAlign.Center)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
      }
      Column({ space: 8 }) {
        Row({ space: 8 }) {
          Text(item.name).fontSize(15).fontWeight(FontWeight.Medium)
            .fontColor(DesignTokens.text(this.darkMode)).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis })
            .layoutWeight(1);
          IBestTag({ text: this.statusLabel(item.status), tagSize: 'small', plain: true, color: DesignTokens.brand(this.darkMode) });
        }
        Text(`¥${item.priceRetailMin.toFixed(2)}${item.priceRetailMax > item.priceRetailMin ? ` ~ ¥${item.priceRetailMax.toFixed(2)}` : ''}`)
          .fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
        Row() {
          Text(I18n.text(this.language, `库存 ${item.totalStock}`, `Stock ${item.totalStock}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          Blank();
          Text(I18n.text(this.language, `销量 ${item.sales}`, `Sales ${item.sales}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%');
        if (item.status === 'rejected' && item.rejectReason) {
          Text(I18n.text(this.language, `驳回：${item.rejectReason}`, `Rejected: ${item.rejectReason}`)).fontSize(12).fontColor(DesignTokens.danger(this.darkMode)).maxLines(2);
        }
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }
    .width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
    .onClick(() => {
      if (this.selectionMode) this.toggleSelection(item.id);
      else AppRouter.push('ProductEdit', new IdRouteParams(item.id));
    });
  }

  build() {
    Column() {
      Row() {
        if (this.showBack) {
          Column() { MerchantIcon({ name: 'arrow-left', color: DesignTokens.text(this.darkMode), iconSize: 25 }); }
            .width(34).height(38).justifyContent(FlexAlign.Center).onClick(() => AppRouter.back());
        }
        Column({ space: 2 }) {
          Text(I18n.text(this.language, '商品', 'Products')).fontSize(26).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Text(I18n.text(this.language, `共 ${this.total} 件`, `${this.total} total`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.alignItems(HorizontalAlign.Start);
        Blank();
        IBestButton({ text: I18n.text(this.language, '分类', 'Categories'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('CategoryManager') });
        IBestButton({
          text: this.selectionMode ? I18n.text(this.language, '取消', 'Cancel') : I18n.text(this.language, '批量', 'Select'), plain: true, color: DesignTokens.brand(this.darkMode),
          onBtnClick: () => { this.selectionMode = !this.selectionMode; this.selectedIds = []; }
        });
        IBestButton({ text: I18n.text(this.language, '新增', 'Add'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => AppRouter.push('ProductEdit', new IdRouteParams()) });
      }
      .width('100%').padding({ top: this.safeTop + 12, left: 16, right: 16, bottom: 10 });

      IBestSearch({
        value: $keyword, placeholder: I18n.text(this.language, '搜索商品名称', 'Search product name'), isRound: true,
        outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode),
        showRightButton: true, rightButtonText: I18n.text(this.language, '搜索', 'Search'), onSearch: () => this.reload(),
        onRightButtonClick: () => this.reload(), onClear: () => this.reload()
      });

      Scroll() {
        Row({ space: 8 }) {
          ForEach(this.filters, (filter: ProductFilter) => {
            Text(this.filterLabel(filter.value)).fontSize(13)
              .fontColor(this.status === filter.value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
              .padding({ left: 14, right: 14, top: 8, bottom: 8 })
              .backgroundColor(this.status === filter.value ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
              .borderRadius(18).onClick(() => this.changeStatus(filter.value));
          }, (filter: ProductFilter) => filter.value);
        }.padding({ left: 16, right: 16, top: 4, bottom: 10 });
      }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);

      Row({ space: 8 }) {
        IBestButton({ text: I18n.text(this.language, '代理商品', 'Agency products'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('AgencyProducts') });
        IBestButton({ text: I18n.text(this.language, '价格规则', 'Pricing rules'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => AppRouter.push('PriceRule') });
        Blank();
        Text(I18n.text(this.language, '商品经营设置', 'Product settings')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%').padding({ left: 16, right: 16, bottom: 10 });

      if (this.errorMessage) {
        Column({ space: 12 }) {
          IBestEmpty({ description: I18n.state(this.language, this.errorMessage), emptyImage: 'network' });
          IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.reload() });
        }.layoutWeight(1).justifyContent(FlexAlign.Center);
      } else if (!this.loading && this.products.length === 0) {
        Column() { IBestEmpty({ description: I18n.text(this.language, '暂无商品', 'No products') }); }
          .layoutWeight(1).justifyContent(FlexAlign.Center);
      } else {
        Refresh({ refreshing: $$this.refreshing }) {
          List({ space: 10 }) {
            ForEach(this.products, (item: ProductSummary) => {
              ListItem() { this.productCard(item); }
            }, (item: ProductSummary) => item.id);
            if (this.loading) {
              ListItem() { Row() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }.height(56).justifyContent(FlexAlign.Center); }
            }
          }
          .padding({
            left: this.windowWidth >= 720 ? 24 : 16,
            right: this.windowWidth >= 720 ? 24 : 16,
            bottom: this.selectionMode ? (this.windowWidth >= 720 ? 96 : PrimaryNavigationMetrics.contentInset(this.safeBottom) + 64) : (this.windowWidth >= 720 ? 28 : PrimaryNavigationMetrics.contentInset(this.safeBottom))
          })
          .onReachEnd(() => this.loadMore());
        }
        .layoutWeight(1)
        .onRefreshing(() => { this.refreshing = true; this.reload(); });
      }

      if (this.selectionMode) {
        Row({ space: 8 }) {
          Checkbox({ name: 'select-all-products' })
            .select(this.allVisibleSelected()).selectedColor(DesignTokens.brand(this.darkMode))
            .onChange(() => this.toggleAllVisible());
          Text(I18n.text(this.language, '全选', 'Select all')).fontSize(13).onClick(() => this.toggleAllVisible());
          Text(I18n.text(this.language, `已选 ${this.selectedIds.length}`, `${this.selectedIds.length} selected`)).fontSize(13).layoutWeight(1);
          IBestButton({ text: I18n.text(this.language, '上架', 'Publish'), plain: true, color: DesignTokens.success(this.darkMode), loading: this.processingBatch, disabled: this.processingBatch, onBtnClick: () => this.batch('online') });
          IBestButton({ text: I18n.text(this.language, '下架', 'Unpublish'), plain: true, color: DesignTokens.brand(this.darkMode), loading: this.processingBatch, disabled: this.processingBatch, onBtnClick: () => this.batch('offline') });
          IBestButton({ text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', loading: this.processingBatch, disabled: this.processingBatch, onBtnClick: () => this.confirmBatchDelete() });
        }
        .width('100%').padding({
          left: 16, right: 16, top: 10,
          bottom: this.windowWidth >= 720 ? this.safeBottom + 10 : PrimaryNavigationMetrics.contentInset(this.safeBottom) - 8
        })
        .backgroundColor(DesignTokens.card(this.darkMode));
      }
    }
    .width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
  }
}
