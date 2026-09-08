import { common } from '@kit.AbilityKit';
import {
  IBestButton, IBestDialogUtil, IBestEmpty, IBestNavBar, IBestSearch, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { PhoneService } from '../../core/device/PhoneService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { FilterRouteParams, IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { StoreAuthConfig, StoreItem } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

interface StoreFilter {
  value: string;
}

@Builder
export function StoresBuilder(_: string, raw: Object) {
  StorePage({ params: raw as FilterRouteParams });
}

@Component
struct StorePage {
  params: FilterRouteParams = new FilterRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private keyword: string = '';
  @State private status: string = '';
  @State private stores: StoreItem[] = [];
  @State private loading: boolean = false;
  @State private refreshing: boolean = false;
  @State private page: number = 1;
  @State private total: number = 0;
  @State private processingId: string = '';
  private requestEpoch: number = 0;
  private readonly filters: StoreFilter[] = [
    { value: '' }, { value: 'active' }, { value: 'pending' }, { value: 'cancelled' }
  ];

  aboutToAppear(): void {
    if (this.filters.some((item: StoreFilter): boolean => item.value === this.params.status)) {
      this.status = this.params.status;
    }
    this.reload(false);
  }

  private visible(): StoreItem[] {
    return this.status ? this.stores.filter((item: StoreItem): boolean => item.status === this.status) : this.stores;
  }

  private count(status: string): number {
    if (!status) return this.stores.length;
    return this.stores.filter((item: StoreItem): boolean => item.status === status).length;
  }

  private async reload(fromRefresh: boolean): Promise<void> {
    this.page = 1;
    if (fromRefresh) this.refreshing = true;
    this.stores = [];
    await this.load(false);
    this.refreshing = false;
  }

  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedKeyword = this.keyword.trim();
    const requestedPage = this.page;
    this.loading = true;
    try {
      const result = await BusinessRepository.stores(requestedKeyword, requestedPage, 100);
      if (epoch !== this.requestEpoch) return;
      this.stores = append ? this.stores.concat(result.list) : result.list;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        if (append && this.page === requestedPage) this.page = Math.max(1, requestedPage - 1);
        IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '门店加载失败', 'Failed to load stores'));
      }
    } finally {
      if (epoch === this.requestEpoch) this.loading = false;
    }
  }

  private remove(item: StoreItem): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '驳回门店申请', 'Reject store request'),
      message: I18n.text(this.language, `确定驳回“${item.name}”的申请吗？驳回后申请记录将被删除。`, `Reject “${item.name}”? The pending request will be deleted.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => { this.deleteStore(item.id); }
    });
  }

  private async deleteStore(id: string): Promise<void> {
    if (this.processingId) return;
    this.processingId = id;
    try {
      await BusinessRepository.deleteStore(id);
      IBestToast.show(I18n.text(this.language, '门店申请已驳回', 'Store request rejected'));
      await this.reload(false);
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '删除失败', 'Failed to delete'));
    } finally {
      this.processingId = '';
    }
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private approve(item: StoreItem): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '通过门店申请', 'Approve store request'),
      message: I18n.text(this.language, `通过“${item.name}”入驻申请，并颁发 ${item.level || 'A'} 级一年授权？`, `Approve “${item.name}” with one-year level ${item.level || 'A'} authorisation?`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => { this.approveStore(item); }
    });
  }

  private async approveStore(item: StoreItem): Promise<void> {
    if (this.processingId) return;
    this.processingId = item.id;
    const start = new Date();
    const end = new Date(start.getTime());
    end.setFullYear(end.getFullYear() + 1);
    const body: StoreAuthConfig = {
      storeId: item.id,
      level: item.level || 'A',
      visiblePriceTiers: ['retail', 'wholesale'],
      productPolicies: [],
      authValidFrom: this.formatDate(start),
      authValidTo: this.formatDate(end)
    };
    try {
      await BusinessRepository.saveStoreAuth(item.id, body);
      IBestToast.show(I18n.text(this.language, '门店申请已通过', 'Store request approved'));
      await this.reload(false);
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '审核失败', 'Review failed'));
    } finally {
      this.processingId = '';
    }
  }

  private async call(item: StoreItem): Promise<void> {
    try {
      await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, item.phone);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer'));
    }
  }

  private statusLabel(value: string): string {
    if (!value) return I18n.text(this.language, '全部', 'All');
    if (value === 'active') return I18n.text(this.language, '已授权', 'Authorised');
    if (value === 'pending') return I18n.text(this.language, '待审核', 'Pending');
    if (value === 'cancelled') return I18n.text(this.language, '已取消', 'Cancelled');
    return value;
  }

  @Builder
  private card(item: StoreItem) {
    Column({ space: 9 }) {
      Row() {
        Text(item.name).fontSize(16).fontWeight(FontWeight.Medium).layoutWeight(1);
        IBestTag({
          text: this.statusLabel(item.status), plain: true,
          color: item.status === 'active' ? DesignTokens.success(this.darkMode) : item.status === 'pending' ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode)
        });
      }.width('100%');
      Text(`${item.contact}  ${item.phone}`).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      Text(`${item.region}${item.address}`).fontSize(13).fontColor(DesignTokens.muted(this.darkMode))
        .width('100%').maxLines(2);
      Row({ space: 8 }) {
        Text(I18n.text(this.language, `等级 ${item.level || 'C'}`, `Level ${item.level || 'C'}`)).fontSize(12).fontColor(DesignTokens.brand(this.darkMode));
        if (item.authValidTo) {
          Text(I18n.text(this.language, `有效至 ${item.authValidTo.slice(0, 10)}`, `Valid until ${item.authValidTo.slice(0, 10)}`)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }
        Blank();
        if (item.status === 'pending') {
          IBestButton({
            text: I18n.text(this.language, '驳回', 'Reject'), plain: true, type: 'danger', loading: this.processingId === item.id,
            onBtnClick: () => this.remove(item)
          });
          IBestButton({
            text: I18n.text(this.language, '通过', 'Approve'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), loading: this.processingId === item.id,
            onBtnClick: () => this.approve(item)
          });
        } else if (item.status === 'active') {
          IBestButton({ text: I18n.text(this.language, '联系', 'Contact'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.call(item) });
          IBestButton({
            text: I18n.text(this.language, '授权', 'Authorise'), plain: true, color: DesignTokens.brand(this.darkMode),
            onBtnClick: () => AppRouter.push('StoreAuth', new IdRouteParams(item.id))
          });
        }
      }.width('100%');
    }.width('100%').alignItems(HorizontalAlign.Start).padding(14)
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '门店管理', 'Store management'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Row() {
          Column({ space: 3 }) {
            Text(`${this.count('')}`).fontSize(23).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
            Text(I18n.text(this.language, '合作门店', 'Partner stores')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
          }.layoutWeight(1);
          Divider().vertical(true).height(36).color(DesignTokens.border(this.darkMode));
          Column({ space: 3 }) {
            Text(`${this.count('active')}`).fontSize(23).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
            Text(I18n.text(this.language, '已授权', 'Authorised')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
          }.layoutWeight(1);
          Divider().vertical(true).height(36).color(DesignTokens.border(this.darkMode));
          Column({ space: 3 }) {
            Text(`${this.count('pending')}`).fontSize(23).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
            Text(I18n.text(this.language, '待审核', 'Pending')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
          }.layoutWeight(1);
        }.width('94%').padding(18).margin({ top: 8, bottom: 10 }).backgroundColor(DesignTokens.card(this.darkMode))
          .borderRadius(16).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
        IBestSearch({
          value: $keyword, placeholder: I18n.text(this.language, '搜索门店或联系人', 'Search store or contact'), isRound: true,
          outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode),
          showRightButton: true, rightButtonText: I18n.text(this.language, '搜索', 'Search'),
          onSearch: () => this.reload(false), onRightButtonClick: () => this.reload(false)
        });
        Row({ space: 8 }) {
          ForEach(this.filters, (filter: StoreFilter) => {
            Text(`${this.statusLabel(filter.value)}${this.stores.length > 0 ? ` ${this.count(filter.value)}` : ''}`)
              .fontSize(12).fontColor(this.status === filter.value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
              .padding({ left: 13, right: 13, top: 8, bottom: 8 })
              .backgroundColor(this.status === filter.value ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
              .borderRadius(17).onClick(() => { this.status = filter.value; });
          }, (filter: StoreFilter) => filter.value);
        }.width('100%').padding({ left: 16, right: 16, bottom: 10 });
        Refresh({ refreshing: $$this.refreshing }) {
          if (!this.loading && this.visible().length === 0) {
            Column() {
              IBestEmpty({ description: this.status ? I18n.text(this.language, `暂无${this.statusLabel(this.status)}门店`, `No ${this.statusLabel(this.status).toLowerCase()} stores`) : I18n.text(this.language, '暂无门店', 'No stores') });
            }.height('100%').justifyContent(FlexAlign.Center);
          } else {
            List({ space: 10 }) {
              ForEach(this.visible(), (item: StoreItem) => {
                ListItem() { this.card(item); }
              }, (item: StoreItem) => item.id);
              if (this.loading) {
                ListItem() { Row() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }
                  .height(52).justifyContent(FlexAlign.Center); }
              }
            }.width('100%').height('100%').padding({ left: 16, right: 16, bottom: this.safeBottom + 16 })
              .onReachEnd(() => {
                if (!this.loading && this.stores.length < this.total) {
                  this.page += 1;
                  this.load(true);
                }
              });
          }
        }.layoutWeight(1).onRefreshing(() => this.reload(true));
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
