import { common } from '@kit.AbilityKit';
import { IBestButton, IBestDialogUtil, IBestEmpty, IBestNavBar, IBestSearch, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { PhoneService } from '../../core/device/PhoneService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantCustomer } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

interface CustomerKind { value: string; }

@Builder
export function CustomersBuilder(_: string) { CustomerPage(); }

@Component
struct CustomerPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private kind: string = '';
  @State private keyword: string = '';
  @State private customers: MerchantCustomer[] = [];
  @State private page: number = 1;
  @State private total: number = 0;
  @State private loading: boolean = false;
  @State private processingId: string = '';
  private requestEpoch: number = 0;
  private readonly kinds: CustomerKind[] = [
    { value: '' }, { value: 'normal' }, { value: 'promoter' }, { value: 'member' }, { value: 'blacklist' }
  ];

  aboutToAppear(): void { this.reload(); }
  private async reload(): Promise<void> { this.page = 1; this.customers = []; await this.load(false); }
  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedKind = this.kind;
    const requestedKeyword = this.keyword.trim();
    const requestedPage = this.page;
    this.loading = true;
    try {
      const result = await BusinessRepository.customers(requestedKind, requestedKeyword, requestedPage);
      if (epoch !== this.requestEpoch) return;
      this.customers = append ? this.customers.concat(result.list) : result.list;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        if (append && this.page === requestedPage) this.page = Math.max(1, requestedPage - 1);
        IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '客户加载失败', 'Failed to load customers'));
      }
    } finally {
      if (epoch === this.requestEpoch) this.loading = false;
    }
  }
  private async setTier(item: MerchantCustomer, tier: string): Promise<void> {
    if (this.processingId) return;
    this.processingId = item.id;
    try { await BusinessRepository.setCustomerTier(item.id, tier); IBestToast.show(I18n.text(this.language, '价格层级已更新', 'Price tier updated')); await this.reload(); }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '更新失败', 'Update failed')); }
    finally { this.processingId = ''; }
  }
  private async toggleAuth(item: MerchantCustomer): Promise<void> {
    if (this.processingId) return;
    this.processingId = item.id;
    try { await BusinessRepository.authorizeCustomer(item.id, !item.priceAuthorized); IBestToast.show(item.priceAuthorized ? I18n.text(this.language, '已取消价格授权', 'Price access revoked') : I18n.text(this.language, '已授权价格', 'Price access granted')); await this.reload(); }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '操作失败', 'Operation failed')); }
    finally { this.processingId = ''; }
  }
  private confirmBlacklist(item: MerchantCustomer): void {
    const next = !item.blocked;
    IBestDialogUtil.open({
      title: next ? I18n.text(this.language, '加入黑名单', 'Add to blacklist') : I18n.text(this.language, '移出黑名单', 'Remove from blacklist'),
      message: next
        ? I18n.text(this.language, `加入后，“${item.nickname || '该客户'}”将无法在本店继续下单，确定继续吗？`, `“${item.nickname || 'This customer'}” will no longer be able to order from this store. Continue?`)
        : I18n.text(this.language, `确定恢复“${item.nickname || '该客户'}”在本店的购买权限吗？`, `Restore purchasing access for “${item.nickname || 'this customer'}”?`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: next ? DesignTokens.danger(this.darkMode) : DesignTokens.brand(this.darkMode),
      onConfirm: () => this.toggleBlacklist(item, next)
    });
  }
  private async toggleBlacklist(item: MerchantCustomer, next: boolean): Promise<void> {
    if (this.processingId) return;
    this.processingId = item.id;
    try {
      await BusinessRepository.setCustomerBlacklist(item.id, next);
      IBestToast.show(next ? I18n.text(this.language, '已加入本店黑名单', 'Added to this store\'s blacklist') : I18n.text(this.language, '已移出本店黑名单', 'Removed from this store\'s blacklist'));
      await this.reload();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '黑名单操作失败', 'Blacklist operation failed'));
    } finally {
      this.processingId = '';
    }
  }
  private async call(item: MerchantCustomer): Promise<void> {
    try { await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, item.phone); }
    catch (error) { IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer')); }
  }

  private kindLabel(value: string): string {
    if (!value) return I18n.text(this.language, '全部', 'All');
    if (value === 'normal') return I18n.text(this.language, '普通客户', 'Customers');
    if (value === 'promoter') return I18n.text(this.language, '推广客户', 'Promoters');
    if (value === 'member') return I18n.text(this.language, '会员客户', 'Members');
    if (value === 'blacklist') return I18n.text(this.language, '黑名单', 'Blacklist');
    return value;
  }
  private maskedPhone(phone: string): string {
    if (phone.length !== 11) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }
  @Builder private card(item: MerchantCustomer) {
    Column({ space: 10 }) {
      Row({ space: 10 }) {
        if (item.avatar) Image(item.avatar).width(48).height(48).borderRadius(24).objectFit(ImageFit.Cover); else Column() { Text(item.nickname.slice(0, 1)).fontColor(DesignTokens.onBrand(this.darkMode)); }.width(48).height(48).borderRadius(24).backgroundColor(DesignTokens.brand(this.darkMode)).justifyContent(FlexAlign.Center);
        Column({ space: 4 }) { Row({ space: 6 }) { Text(item.nickname || I18n.text(this.language, '未命名客户', 'Unnamed customer')).fontSize(15).fontWeight(FontWeight.Medium); if (item.groupTag) IBestTag({ text: item.groupTag, plain: true, color: DesignTokens.brand(this.darkMode) }); if (item.blocked) IBestTag({ text: I18n.text(this.language, '黑名单', 'Blacklist'), plain: true, color: DesignTokens.danger(this.darkMode) }); }.width('100%'); Text(item.phone ? this.maskedPhone(item.phone) : I18n.text(this.language, '未绑定手机', 'No phone number')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Text(`¥${item.totalSpent.toFixed(2)}`).fontSize(15).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
      }.width('100%');
      Row() { Text(I18n.text(this.language, `订单 ${item.orderCount}`, `Orders ${item.orderCount}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); Blank(); Text(I18n.text(this.language, `最近 ${item.lastOrderAt ? item.lastOrderAt.slice(0, 10) : '--'}`, `Latest ${item.lastOrderAt ? item.lastOrderAt.slice(0, 10) : '--'}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }.width('100%');
      Row({ space: 7 }) {
        Text(I18n.text(this.language, '零售', 'Retail')).fontSize(12).padding({ left: 10, right: 10, top: 6, bottom: 6 }).borderRadius(14).backgroundColor(item.priceTier === 'retail' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode)).fontColor(item.priceTier === 'retail' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).onClick(() => this.setTier(item, 'retail'));
        Text(I18n.text(this.language, '批发', 'Wholesale')).fontSize(12).padding({ left: 10, right: 10, top: 6, bottom: 6 }).borderRadius(14).backgroundColor(item.priceTier === 'wholesale' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode)).fontColor(item.priceTier === 'wholesale' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).onClick(() => this.setTier(item, 'wholesale'));
        Text(I18n.text(this.language, '会员', 'Member')).fontSize(12).padding({ left: 10, right: 10, top: 6, bottom: 6 }).borderRadius(14).backgroundColor(item.priceTier === 'member' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode)).fontColor(item.priceTier === 'member' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).onClick(() => this.setTier(item, 'member'));
        Blank();
        IBestButton({ text: item.priceAuthorized ? I18n.text(this.language, '取消授权', 'Revoke') : I18n.text(this.language, '授权价格', 'Grant access'), plain: true, color: item.priceAuthorized ? DesignTokens.brand(this.darkMode) : DesignTokens.brand(this.darkMode), onBtnClick: () => this.toggleAuth(item) });
      }.width('100%');
      Row() {
        Text(item.blocked ? I18n.text(this.language, '该客户已被限制在本店下单', 'This customer cannot order from this store') : I18n.text(this.language, '黑名单仅对当前店铺生效', 'The blacklist only applies to this store'))
          .fontSize(11).fontColor(item.blocked ? DesignTokens.danger(this.darkMode) : DesignTokens.muted(this.darkMode)).layoutWeight(1);
        IBestButton({
          text: item.blocked ? I18n.text(this.language, '恢复购买', 'Restore access') : I18n.text(this.language, '加入黑名单', 'Blacklist'),
          plain: true,
          type: item.blocked ? 'primary' : 'danger',
          color: item.blocked ? DesignTokens.brand(this.darkMode) : DesignTokens.danger(this.darkMode),
          onBtnClick: () => this.confirmBlacklist(item)
        });
      }.width('100%');
      if (item.phone) {
        IBestButton({ text: I18n.text(this.language, '联系客户', 'Contact customer'), plain: true, color: DesignTokens.brand(this.darkMode), btnWidth: '100%', onBtnClick: () => this.call(item) });
      }
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }
  build() {
    NavDestination() {
      Column() {
        IBestNavBar({ title: I18n.text(this.language, '客户管理', 'Customer management'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
        IBestSearch({ value: $keyword, placeholder: I18n.text(this.language, '搜索姓名或手机号', 'Search name or phone'), isRound: true, outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode), showRightButton: true, rightButtonText: I18n.text(this.language, '搜索', 'Search'), onSearch: () => this.reload(), onRightButtonClick: () => this.reload() });
        Scroll() { Row({ space: 8 }) { ForEach(this.kinds, (item: CustomerKind) => { Text(this.kindLabel(item.value)).fontSize(13).padding({ left: 14, right: 14, top: 8, bottom: 8 }).backgroundColor(this.kind === item.value ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode)).fontColor(this.kind === item.value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).borderRadius(18).onClick(() => { this.kind = item.value; this.reload(); }); }, (item: CustomerKind) => item.value); }.padding({ left: 16, right: 16, bottom: 10 }); }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);
        if (!this.loading && this.customers.length === 0) Column() { IBestEmpty({ description: I18n.text(this.language, '暂无客户', 'No customers') }); }.layoutWeight(1).justifyContent(FlexAlign.Center);
        else List({ space: 10 }) { ForEach(this.customers, (item: MerchantCustomer) => { ListItem() { this.card(item); } }, (item: MerchantCustomer) => item.id); if (this.loading) ListItem() { Row() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }.height(52).justifyContent(FlexAlign.Center); } }.layoutWeight(1).padding({ left: 16, right: 16, bottom: this.safeBottom + 16 }).onReachEnd(() => { if (!this.loading && this.customers.length < this.total) { this.page += 1; this.load(true); } });
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
