import { PrimaryNavigationMetrics } from '../shell/PrimaryNavigationMetrics';
import { IBestButton, IBestDialogUtil, IBestEmpty, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { ProductSummary } from './ProductModels';
import { ProductRepository } from './ProductRepository';
import { I18n } from '../../core/i18n/I18n';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { ProductDataSource } from './ProductDataSource';

interface ProductFilter {
  value: string;
}

@Component
struct ProductStatusOption {
  @Prop value: string = '';
  @Prop label: string = '';
  @Link selected: string;
  @StorageLink('darkMode') private darkMode: boolean = false;
  build() {
    Button(this.label, { type: ButtonType.Normal }).layoutWeight(1).height(46).fontSize(14)
      .fontColor(this.selected === this.value ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode))
      .backgroundColor(this.selected === this.value ? DesignTokens.selectedSurface(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .borderRadius(12).border({ width: this.selected === this.value ? 1 : 0, color: DesignTokens.brand(this.darkMode) })
      .accessibilityText(`${this.label}${this.selected === this.value ? ' selected' : ''}`)
      .onClick((): void => { this.selected = this.value; });
  }
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
  @StorageProp('sessionEpoch') @Watch('onSessionChanged') private sessionEpoch: number = 0;
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
  @State private panel: string = '';
  @State private draftStatus: string = '';
  private dataSource: ProductDataSource = new ProductDataSource();
  private searchTimer: number = -1;
  private failedAppend: boolean = false;
  private requestEpoch: number = 0;
  private readonly filters: ProductFilter[] = [
    { value: '' }, { value: 'active' }, { value: 'offline' }, { value: 'draft' },
    { value: 'auditing' }, { value: 'rejected' }
  ];

  aboutToAppear(): void {
    this.status = this.initialStatus;
    this.reload();
  }

  aboutToDisappear(): void {
    this.requestEpoch += 1;
    this.loading = false;
    if (this.searchTimer >= 0) clearTimeout(this.searchTimer);
  }

  private onSessionChanged(): void {
    this.requestEpoch += 1;
    this.loading = false;
    this.refreshing = false;
    if (this.searchTimer >= 0) { clearTimeout(this.searchTimer); this.searchTimer = -1; }
    this.products = [];
    this.dataSource.update([]);
    this.total = 0;
    this.selectedIds = [];
    this.selectionMode = false;
    this.panel = '';
    this.errorMessage = '';
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
    if (this.searchTimer >= 0) { clearTimeout(this.searchTimer); this.searchTimer = -1; }
    await this.load(false);
  }

  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedStatus = this.status;
    const requestedKeyword = this.keyword.trim();
    const requestedPage = append ? this.page + 1 : 1;
    const session = this.sessionEpoch;
    this.loading = true;
    this.failedAppend = append;
    this.errorMessage = '';
    try {
      const result = await ProductRepository.list(requestedStatus, requestedKeyword, requestedPage);
      if (epoch !== this.requestEpoch || session !== this.sessionEpoch) return;
      const incoming = Array.isArray(result.list) ? result.list : [];
      this.products = append ? this.products.concat(incoming.filter((item: ProductSummary): boolean =>
        !this.products.some((current: ProductSummary): boolean => current.id === item.id))) : incoming;
      this.dataSource.update(this.products);
      this.page = requestedPage;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
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
    await this.load(true);
  }

  private changeStatus(next: string): void {
    if (this.status === next) return;
    this.status = next;
    this.selectedIds = [];
    this.selectionMode = false;
    this.products = [];
    this.dataSource.update([]);
    this.reload();
  }

  private search(value: string): void {
    this.keyword = value;
    this.requestEpoch += 1;
    if (this.searchTimer >= 0) clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout((): void => this.applySearch(), 300);
  }

  private applySearch(): void {
    this.selectedIds = [];
    this.products = [];
    this.dataSource.update([]);
    this.reload();
  }

  private openPanel(next: string): void {
    if (this.panel === next) { this.panel = ''; return; }
    this.draftStatus = this.status;
    this.panel = next;
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
    Row({ space: 14 }) {
      if (this.selectionMode) {
        Stack() {
          if (this.selectedIds.includes(item.id)) {
            MerchantIcon({ name: 'checked', color: DesignTokens.brand(this.darkMode), iconSize: 20 });
          }
        }.width(24).height(24).borderRadius(8).border({ width: 1, color: DesignTokens.border(this.darkMode) });
      }
      ResilientRemoteImage({
        thumbnailUrl: item.imageThumbnailUrl || '',
        originalUrl: Array.isArray(item.images) ? (item.images[0] || '') : '',
        widthValue: 96, heightValue: 106, radius: 14
      });
      Column({ space: 8 }) {
        Text(item.name || I18n.text(this.language, '未命名商品', 'Unnamed product')).fontSize(16).fontWeight(FontWeight.Medium)
          .fontColor(DesignTokens.text(this.darkMode)).maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(this.statusLabel(item.status)).fontSize(10).fontColor(item.status === 'rejected' ? DesignTokens.danger(this.darkMode) : DesignTokens.brand(this.darkMode))
          .padding({ left: 7, right: 7, top: 3, bottom: 3 }).borderRadius(5).backgroundColor(DesignTokens.subtle(this.darkMode));
        Text(`¥${Number(item.priceRetailMin || 0).toFixed(2)}${item.priceRetailMax > item.priceRetailMin ? ' +' : ''}`)
          .fontSize(21).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
        Text(I18n.text(this.language, `库存 ${item.totalStock || 0}  ·  已售 ${item.sales || 0}`, `Stock ${item.totalStock || 0} · Sold ${item.sales || 0}`))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1);
        if (item.status === 'rejected' && item.rejectReason) {
          Text(item.rejectReason).fontSize(11).fontColor(DesignTokens.danger(this.darkMode)).maxLines(2);
        }
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(18)
      .border({ width: 1, color: this.selectedIds.includes(item.id) ? DesignTokens.brand(this.darkMode) : DesignTokens.border(this.darkMode) })
      .accessibilityText(`${item.name}, ${this.statusLabel(item.status)}`)
      .onClick((): void => {
        if (this.selectionMode) this.toggleSelection(item.id);
        else AppRouter.push('ProductEdit', new IdRouteParams(item.id));
      });
  }

  @Builder
  private filterPanel() {
    Column({ space: 18 }) {
      if (this.panel === 'status') {
        Row() {
          Text(I18n.text(this.language, '商品状态', 'Product status')).fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
          Text(I18n.text(this.language, '确认后生效', 'Apply to confirm')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%');
        Column({ space: 10 }) {
          Row({ space: 8 }) {
            ForEach(this.filters.slice(0, 3), (filter: ProductFilter) => {
              ProductStatusOption({ value: filter.value, label: this.filterLabel(filter.value), selected: $draftStatus });
            }, (filter: ProductFilter): string => filter.value);
          }.width('100%');
          Row({ space: 8 }) {
            ForEach(this.filters.slice(3), (filter: ProductFilter) => {
              ProductStatusOption({ value: filter.value, label: this.filterLabel(filter.value), selected: $draftStatus });
            }, (filter: ProductFilter): string => filter.value);
          }.width('100%');
        }
        Row({ space: 12 }) {
          Button(I18n.text(this.language, '重置', 'Reset'), { type: ButtonType.Normal }).height(46).width(88)
            .fontColor(DesignTokens.text(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12)
            .onClick((): void => { this.draftStatus = ''; });
          Button(I18n.text(this.language, '确定筛选', 'Apply filters'), { type: ButtonType.Normal }).layoutWeight(1).height(46)
            .fontColor(DesignTokens.onBrand(this.darkMode)).backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius(12)
            .onClick((): void => { this.panel = ''; this.changeStatus(this.draftStatus); });
        }.width('100%');
      } else {
        Text(I18n.text(this.language, '商品管理', 'Product management')).fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        Button(I18n.text(this.language, '分类管理', 'Manage categories'), { type: ButtonType.Normal }).width('100%').height(46)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(12)
          .onClick((): void => { this.panel = ''; AppRouter.push('CategoryManager'); });
        Button(I18n.text(this.language, '代理商品', 'Agency products'), { type: ButtonType.Normal }).width('100%').height(46)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(12)
          .onClick((): void => { this.panel = ''; AppRouter.push('AgencyProducts'); });
        Button(I18n.text(this.language, '价格规则', 'Pricing rules'), { type: ButtonType.Normal }).width('100%').height(46)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(12)
          .onClick((): void => { this.panel = ''; AppRouter.push('PriceRule'); });
      }
    }.width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius({ bottomLeft: 22, bottomRight: 22 });
  }

  build() {
    Column() {
      Row({ space: 12 }) {
        if (this.showBack) {
          Button({ type: ButtonType.Normal }) {
            MerchantIcon({ name: 'arrow-left', color: DesignTokens.text(this.darkMode), iconSize: 24 });
          }.width(38).height(42).backgroundColor(Color.Transparent).onClick((): void => AppRouter.back());
        }
        Column({ space: 4 }) {
          Text(I18n.text(this.language, '商品', 'Products')).fontSize(27).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Text(I18n.text(this.language, `共 ${this.total} 件商品`, `${this.total} products`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Button({ type: ButtonType.Normal }) {
          Row({ space: 5 }) {
            MerchantIcon({ name: 'add-o', color: DesignTokens.text(this.darkMode), iconSize: 19 });
            Text(I18n.text(this.language, '新增', 'Add')).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
          }.padding({ left: 14, right: 14 });
        }.height(42).borderRadius(13).backgroundColor(DesignTokens.selectedSurface(this.darkMode))
          .onClick((): void => AppRouter.push('ProductEdit', new IdRouteParams()));
      }.width('100%').padding({ top: this.safeTop + 12, left: 18, right: 18, bottom: 16 });

      Row({ space: 9 }) {
        MerchantIcon({ name: 'search', color: DesignTokens.muted(this.darkMode), iconSize: 20 });
        TextInput({ text: this.keyword, placeholder: I18n.text(this.language, '搜索商品名称', 'Search product name') })
          .layoutWeight(1).height(44).padding(0).fontSize(14).backgroundColor(Color.Transparent)
          .fontColor(DesignTokens.text(this.darkMode)).placeholderColor(DesignTokens.muted(this.darkMode))
          .enterKeyType(EnterKeyType.Search).onChange((value: string): void => this.search(value)).onSubmit((): void => this.applySearch());
        if (this.keyword) {
          Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'cross', color: DesignTokens.muted(this.darkMode), iconSize: 18 }); }
            .width(34).height(40).backgroundColor(Color.Transparent)
            .onClick((): void => { this.keyword = ''; this.applySearch(); });
        }
      }.margin({ left: 18, right: 18, bottom: 12 }).padding({ left: 12, right: 6 })
        .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(14).border({ width: 1, color: DesignTokens.border(this.darkMode) });

      Row() {
        Button({ type: ButtonType.Normal }) {
          Row({ space: 6 }) {
            Text(this.status ? this.statusLabel(this.status) : I18n.text(this.language, '全部状态', 'All statuses')).fontSize(13).maxLines(1);
            MerchantIcon({ name: 'arrow-down', color: DesignTokens.text(this.darkMode), iconSize: 12 });
          }
        }.layoutWeight(1).height(48).backgroundColor(Color.Transparent).fontColor(this.status ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode))
          .onClick((): void => this.openPanel('status'));
        Button(this.selectionMode ? I18n.text(this.language, '退出批量', 'Done') : I18n.text(this.language, '批量管理', 'Select'), { type: ButtonType.Normal })
          .layoutWeight(1).height(48).fontSize(13).backgroundColor(Color.Transparent).fontColor(DesignTokens.text(this.darkMode))
          .onClick((): void => { this.panel = ''; this.selectionMode = !this.selectionMode; this.selectedIds = []; });
        Button({ type: ButtonType.Normal }) {
          Row({ space: 6 }) {
            Text(I18n.text(this.language, '管理工具', 'Tools')).fontSize(13).maxLines(1);
            MerchantIcon({ name: 'arrow-down', color: DesignTokens.text(this.darkMode), iconSize: 12 });
          }
        }.layoutWeight(1).height(48).backgroundColor(Color.Transparent).fontColor(DesignTokens.text(this.darkMode))
          .onClick((): void => this.openPanel('tools'));
      }.width('100%').backgroundColor(DesignTokens.card(this.darkMode));

      Stack({ alignContent: Alignment.Top }) {
        Column() {
          if (this.errorMessage) {
            Row({ space: 8 }) {
              Text(I18n.state(this.language, this.errorMessage)).fontSize(12).maxLines(2).layoutWeight(1).fontColor(DesignTokens.danger(this.darkMode));
              Button(I18n.text(this.language, '重试', 'Retry')).fontSize(12).height(32).backgroundColor(DesignTokens.subtle(this.darkMode))
                .fontColor(DesignTokens.text(this.darkMode)).onClick((): void => { this.load(this.failedAppend); });
            }.padding(12).width('100%');
          }
          if (!this.loading && this.products.length === 0) {
            Column({ space: 8 }) {
              IBestEmpty({ description: this.errorMessage ? I18n.text(this.language, '暂时无法加载', 'Unable to load') : I18n.text(this.language, '暂无符合条件的商品', 'No matching products'), emptyImage: this.errorMessage ? 'network' : 'search' });
              Text(I18n.text(this.language, '试试调整筛选，或新增第一件商品', 'Change filters or add your first product')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            }.width('100%').layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            Refresh({ refreshing: $$this.refreshing }) {
              List({ space: 12 }) {
                LazyForEach(this.dataSource, (item: ProductSummary) => {
                  ListItem() { this.productCard(item); }
                }, (item: ProductSummary): string => `${item.id}:${item.updatedAt}:${item.status}:${item.priceRetailMin}:${(Array.isArray(item.images) ? item.images : []).join(',')}`);
                if (this.loading) {
                  ListItem() { Row({ space: 8 }) { LoadingProgress().width(20).height(20).color(DesignTokens.brand(this.darkMode)); Text(I18n.text(this.language, '正在加载', 'Loading')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }.width('100%').height(54).justifyContent(FlexAlign.Center); }
                }
              }.width('100%').height('100%').cachedCount(2).scrollBar(BarState.Off)
                .padding({ left: 16, right: 16, top: 14, bottom: this.selectionMode ? 12 : (this.windowWidth >= 720 ? 24 : PrimaryNavigationMetrics.contentInset(this.safeBottom)) })
                .onReachEnd((): void => { if (!this.errorMessage) this.loadMore(); });
            }.width('100%').layoutWeight(1).onRefreshing((): void => { this.refreshing = true; this.reload(); });
          }
        }.width('100%').height('100%');
        if (this.panel) {
          Column().width('100%').height('100%').backgroundColor('#66000000').onClick((): void => { this.panel = ''; });
          this.filterPanel();
        }
      }.width('100%').layoutWeight(1);

      if (this.selectionMode) {
        Column({ space: 10 }) {
          Row({ space: 8 }) {
            Button({ type: ButtonType.Normal }) {
              Row({ space: 6 }) {
                MerchantIcon({ name: this.allVisibleSelected() ? 'checked' : 'add-o', color: DesignTokens.brand(this.darkMode), iconSize: 20 });
                Text(I18n.text(this.language, '全选当前列表', 'Select loaded')).fontSize(13).fontColor(DesignTokens.text(this.darkMode));
              }
            }.height(32).backgroundColor(Color.Transparent).onClick((): void => this.toggleAllVisible());
            Blank();
            Text(I18n.text(this.language, `已选 ${this.selectedIds.length}`, `${this.selectedIds.length} selected`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          }.width('100%');
          Row({ space: 8 }) {
            IBestButton({ text: I18n.text(this.language, '上架', 'Publish'), plain: true, btnWidth: '100%', color: DesignTokens.brand(this.darkMode), disabled: this.processingBatch, onBtnClick: () => this.batch('online') }).layoutWeight(1);
            IBestButton({ text: I18n.text(this.language, '下架', 'Unpublish'), plain: true, btnWidth: '100%', color: DesignTokens.brand(this.darkMode), disabled: this.processingBatch, onBtnClick: () => this.batch('offline') }).layoutWeight(1);
            IBestButton({ text: I18n.text(this.language, '删除', 'Delete'), plain: true, btnWidth: '100%', type: 'danger', disabled: this.processingBatch, onBtnClick: () => this.confirmBatchDelete() }).layoutWeight(1);
          }.width('100%');
        }.width('100%').padding({ left: 16, right: 16, top: 8, bottom: this.windowWidth >= 720 ? this.safeBottom + 10 : PrimaryNavigationMetrics.contentInset(this.safeBottom) - 8 })
          .backgroundColor(DesignTokens.card(this.darkMode));
      }
    }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
  }
}
