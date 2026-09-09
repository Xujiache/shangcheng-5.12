import { common } from '@kit.AbilityKit';
import { KeyboardAvoidMode } from '@kit.ArkUI';
import { pasteboard } from '@kit.BasicServicesKit';
import { systemShare } from '@kit.ShareKit';
import { IBestActionSheet, IBestDialogUtil, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { PhoneService } from '../../core/device/PhoneService';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { SessionStore } from '../../core/storage/SessionStore';
import { OrderItem, OrderShareRequest, OrderSummary, ParsedAddress, ShipOrderRequest } from './OrderModels';
import { OrderRepository } from './OrderRepository';
import { I18n } from '../../core/i18n/I18n';
import { OrderProductSummary } from './OrderProductSummary';
import { OrderDetailPolicy, OrderDetailRequests } from './OrderDetailPolicy';
import { OrderInfoRow, OrderSectionHeading, OrderShareChoice, OrderStatusCard } from './OrderDetailCards';

@Builder
export function OrderDetailBuilder(_: string, raw: Object) { OrderDetailPage({ params: raw as IdRouteParams }); }

type OrderAction = 'ship' | 'parse' | 'share';

@Component
struct OrderDetailPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageProp('commerceEpoch') @Watch('onCommerceEvent') private commerceEpoch: number = 0;
  @State private order: OrderSummary | null = null;
  @State private loading: boolean = true;
  @State private refreshFailed: boolean = false;
  @State private recordsExpanded: boolean = false;
  @State private actionVisible: boolean = false;
  @State private actionMode: OrderAction = 'share';
  @State private company: string = '';
  @State private trackingNumber: string = '';
  @State private shareIntro: string = '';
  @State private shareDays: string = '30';
  @State private shareBasics: boolean = true;
  @State private shareCustomer: boolean = false;
  @State private sharePricing: boolean = true;
  @State private shareItems: boolean = true;
  @State private shareExtra: boolean = true;
  @State private currentShareCode: string = '';
  @State private shareLoading: boolean = false;
  @State private sharePrefillFailed: boolean = false;
  @State private parseInput: string = '';
  @State private parsedAddress: ParsedAddress | null = null;
  @State private parsing: boolean = false;
  @State private submitting: boolean = false;
  @State private actionError: string = '';
  private requests: OrderDetailRequests = new OrderDetailRequests();
  private owner: string = '';
  private disposed: boolean = false;
  private loadInFlight: boolean = false;
  private reloadPending: boolean = false;
  private ownsKeyboard: boolean = false;
  private previousKeyboard: KeyboardAvoidMode = KeyboardAvoidMode.OFFSET;

  aboutToAppear(): void { this.owner = SessionStore.shared().user?.id || ''; this.load(); }
  aboutToDisappear(): void { this.disposed = true; this.requests.close(); this.restoreKeyboard(); }
  private current(): boolean { return !this.disposed && this.owner === (SessionStore.shared().user?.id || ''); }
  private activateKeyboard(): void {
    if (this.ownsKeyboard) return;
    this.previousKeyboard = this.getUIContext().getKeyboardAvoidMode();
    this.getUIContext().setKeyboardAvoidMode(KeyboardAvoidMode.RESIZE); this.ownsKeyboard = true;
  }
  private restoreKeyboard(): void {
    if (!this.ownsKeyboard) return;
    this.getUIContext().setKeyboardAvoidMode(this.previousKeyboard); this.ownsKeyboard = false;
  }
  private onCommerceEvent(): void {
    if (!this.current()) return;
    this.reloadPending = true;
    if (!this.loadInFlight && !this.actionVisible && !this.submitting) this.load();
  }
  private async load(): Promise<void> {
    if (this.loadInFlight || !this.current()) return;
    this.loadInFlight = true; this.loading = true; this.reloadPending = false;
    const request = this.requests.next('detail');
    try {
      if (!this.params.id) throw new Error('Missing order ID');
      const order = await OrderRepository.detail(this.params.id);
      if (!this.current() || !this.requests.current('detail', request)) return;
      this.order = order; this.refreshFailed = false;
      if (this.params.action === 'ship') { this.params.action = ''; if (OrderDetailPolicy.canShip(order)) this.openShip(); }
    } catch (_) { if (this.current()) this.refreshFailed = true; }
    finally {
      this.loadInFlight = false;
      if (this.current()) {
        this.loading = false;
        if (this.reloadPending && !this.actionVisible && !this.submitting) this.load();
      }
    }
  }
  private openShip(): void {
    if (!this.current() || this.submitting || this.refreshFailed || !OrderDetailPolicy.canShip(this.order)) return;
    this.company = ''; this.trackingNumber = ''; this.actionError = ''; this.actionMode = 'ship'; this.actionVisible = true;
  }
  private openParse(): void {
    if (!this.current() || this.submitting) return;
    this.actionMode = 'parse'; this.actionError = ''; this.parseInput = ''; this.parsedAddress = null; this.actionVisible = true;
  }
  private closeAction(): void {
    if (this.submitting) return;
    this.requests.next('share'); this.requests.next('parse');
    this.actionVisible = false; this.shareLoading = false; this.parsing = false; this.actionError = '';
    if (this.reloadPending) this.load();
  }
  private leave(): void { if (this.actionVisible) this.closeAction(); else if (!this.submitting) AppRouter.back(); }

  private async openShare(): Promise<void> {
    if (!this.current() || !this.order || this.submitting || this.shareLoading) return;
    this.actionMode = 'share'; this.actionVisible = true; this.shareLoading = true; this.sharePrefillFailed = false; this.actionError = '';
    this.shareBasics = true; this.shareCustomer = false; this.sharePricing = true; this.shareItems = true; this.shareExtra = true;
    this.shareDays = '30'; this.shareIntro = ''; this.currentShareCode = '';
    const request = this.requests.next('share');
    try {
      const current = await OrderRepository.currentShare(this.params.id);
      if (!this.current() || !this.requests.current('share', request)) return;
      this.currentShareCode = current?.shareCode || '';
      if (current?.config) {
        const fields = current.config.visibleFields || [];
        this.shareBasics = fields.includes('basics'); this.shareCustomer = fields.includes('customer');
        this.sharePricing = fields.includes('pricing'); this.shareItems = fields.includes('items'); this.shareExtra = fields.includes('extra');
        this.shareIntro = current.config.intro || '';
        const expires = current.config.expiresAt;
        const remaining = expires ? Math.ceil((new Date(expires).getTime() - Date.now()) / 86400000) : 0;
        this.shareDays = !expires ? '0' : Number.isFinite(remaining) ? `${Math.min(365, Math.max(1, remaining))}` : '30';
      }
    } catch (_) { if (this.current() && this.requests.current('share', request)) this.sharePrefillFailed = true; }
    finally { if (this.current() && this.requests.current('share', request)) this.shareLoading = false; }
  }
  private async parseAddress(): Promise<void> {
    if (!this.current() || this.parsing || this.submitting) return;
    if (!this.parseInput.trim()) { this.actionError = 'address'; return; }
    const text = this.parseInput.trim(); const request = this.requests.next('parse');
    this.parsing = true; this.actionError = '';
    try {
      const value = await OrderRepository.parseAddress(text);
      if (!this.current() || !this.requests.current('parse', request) || text !== this.parseInput.trim()) return;
      if (!OrderDetailPolicy.addressText(value)) { this.parsedAddress = null; this.actionError = 'parse-empty'; }
      else this.parsedAddress = value;
    } catch (_) { if (this.current() && this.requests.current('parse', request)) this.actionError = 'parse-failed'; }
    finally { if (this.current() && this.requests.current('parse', request)) this.parsing = false; }
  }
  private async copyParsedAddress(): Promise<void> {
    if (!this.current() || this.submitting || !this.parsedAddress) return;
    this.submitting = true;
    try {
      const copied = await this.copyText(OrderDetailPolicy.addressText(this.parsedAddress));
      if (this.current() && copied) this.actionVisible = false;
    } finally { if (this.current()) { this.submitting = false; if (!this.actionVisible && this.reloadPending) this.load(); } }
  }
  private submitAction(): void {
    if (this.submitting || this.parsing || this.shareLoading) return;
    if (this.actionMode === 'ship') this.ship();
    else if (this.actionMode === 'parse') { if (this.parsedAddress) this.copyParsedAddress(); else this.parseAddress(); }
    else this.createShare();
  }
  private async ship(): Promise<void> {
    if (!this.current() || this.submitting || this.refreshFailed || !OrderDetailPolicy.canShip(this.order)) return;
    if (!this.company.trim()) { this.actionError = 'company'; return; }
    if (!this.trackingNumber.trim()) { this.actionError = 'tracking'; return; }
    const body: ShipOrderRequest = { company: this.company.trim(), trackingNumber: this.trackingNumber.trim() };
    this.submitting = true; this.actionError = '';
    try {
      await OrderRepository.ship(this.params.id, body);
      if (!this.current()) return;
      this.actionVisible = false; this.refreshFailed = true;
      IBestToast.show(I18n.text(this.language, '发货成功', 'Order shipped'));
      await this.load();
    } catch (_) {
      if (this.current()) { this.actionError = 'ship-failed'; this.reloadPending = true; }
    } finally { if (this.current()) { this.submitting = false; if (!this.actionVisible && this.reloadPending) this.load(); } }
  }
  private confirmRevokeShare(): void {
    if (!this.currentShareCode || this.submitting) return;
    IBestDialogUtil.open({ title: I18n.text(this.language, '撤销分享', 'Revoke share'),
      message: I18n.text(this.language, '旧链接将无法继续访问，已经保存的截图无法收回。', 'The old link will stop working. Existing screenshots cannot be recalled.'),
      showCancelButton: true, cancelButtonText: I18n.text(this.language, '取消', 'Cancel'), confirmButtonText: I18n.text(this.language, '撤销分享', 'Revoke share'),
      confirmButtonColor: DesignTokens.danger(this.darkMode), onConfirm: () => this.revokeShare() });
  }
  private async revokeShare(): Promise<void> {
    if (!this.current() || this.submitting || !this.currentShareCode) return;
    this.submitting = true; this.actionError = '';
    try {
      await OrderRepository.revokeShare(this.params.id);
      if (!this.current()) return;
      this.currentShareCode = ''; IBestToast.show(I18n.text(this.language, '分享已撤销', 'Share revoked'));
    } catch (_) { if (this.current()) this.actionError = 'revoke-failed'; }
    finally { if (this.current()) this.submitting = false; }
  }
  private async createShare(): Promise<void> {
    if (!this.current() || this.submitting || this.shareLoading) return;
    const visibleFields: string[] = [];
    if (this.shareBasics) visibleFields.push('basics'); if (this.shareCustomer) visibleFields.push('customer');
    if (this.sharePricing) visibleFields.push('pricing'); if (this.shareItems) visibleFields.push('items'); if (this.shareExtra) visibleFields.push('extra');
    this.actionError = OrderDetailPolicy.shareError(visibleFields, this.shareDays, this.shareIntro);
    if (this.actionError) return;
    const body: OrderShareRequest = { visibleFields, expiresInDays: Number(this.shareDays), intro: this.shareIntro.trim() };
    this.submitting = true;
    try {
      const result = await OrderRepository.createShare(this.params.id, body);
      if (!this.current()) return;
      this.currentShareCode = result.shareCode;
      const link = `https://ewsn.top/share?code=${result.shareCode}`;
      let copied = false;
      try { await pasteboard.getSystemPasteboard().setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, link)); copied = true; } catch (_) {}
      if (!this.current()) return;
      this.actionVisible = false;
      try {
        const record: systemShare.SharedRecord = { utd: 'general.plain-text', title: I18n.text(this.language, `订单 ${result.orderNo}`, `Order ${result.orderNo}`),
          content: `${body.intro || I18n.text(this.language, '请查看订单详情', 'View order details')}\n${link}`,
          description: I18n.text(this.language, '经纬订单分享', 'Jingwei order share') };
        await new systemShare.ShareController(new systemShare.SharedData(record)).show(this.getUIContext().getHostContext() as common.UIAbilityContext, {});
      } catch (_) { if (this.current()) IBestToast.show(copied ? I18n.text(this.language, '链接已复制，可粘贴发送', 'Link copied. Paste it to share.') : I18n.text(this.language, '链接已生成，可重新打开分享后复制', 'Link created. Reopen sharing to copy it.')); }
    } catch (_) { if (this.current()) this.actionError = 'share-failed'; }
    finally { if (this.current()) { this.submitting = false; if (!this.actionVisible && this.reloadPending) this.load(); } }
  }
  private async callCustomer(): Promise<void> {
    if (!this.current() || !this.order?.address?.phone) return;
    try { await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, this.order.address.phone); }
    catch (_) { if (this.current()) IBestToast.show(I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer')); }
  }
  private async copyText(value: string): Promise<boolean> {
    if (!this.current() || !value) return false;
    try {
      await pasteboard.getSystemPasteboard().setData(pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, value));
      if (this.current()) IBestToast.show(I18n.text(this.language, '已复制', 'Copied')); return true;
    } catch (_) { if (this.current()) IBestToast.show(I18n.text(this.language, '复制失败，请重试', 'Copy failed. Try again.')); return false; }
  }
  private moreActions(): void {
    IBestActionSheet.show({ actions: [I18n.text(this.language, '复制订单号', 'Copy order number'), I18n.text(this.language, '地址识别工具', 'Address parser'), I18n.text(this.language, '刷新订单', 'Refresh order')],
      cancelText: I18n.text(this.language, '取消', 'Cancel'), onSelect: (index: number) => {
        if (!this.current()) return;
        if (index === 0) this.copyText(this.order?.no || ''); else if (index === 1) this.openParse(); else this.load();
      } });
  }
  private shippingLabel(): string {
    if (this.order?.shippingMethod === 'factory') return I18n.text(this.language, '厂家物流', 'Factory shipping');
    if (this.order?.shippingMethod === 'local') return I18n.text(this.language, '同城配送', 'Local delivery');
    if (this.order?.shippingMethod === 'pickup') return I18n.text(this.language, '到店自提', 'Store pickup');
    return '—';
  }
  private errorText(): string {
    switch (this.actionError) {
      case 'company': return I18n.text(this.language, '请填写物流公司', 'Enter a carrier');
      case 'tracking': return I18n.text(this.language, '请填写物流单号', 'Enter a tracking number');
      case 'address': return I18n.text(this.language, '请先粘贴需要识别的地址', 'Paste an address first');
      case 'parse-empty': return I18n.text(this.language, '未识别到有效信息，请检查原文', 'No valid details found. Check the text.');
      case 'parse-failed': return I18n.text(this.language, '识别失败，原文已保留，请重试', 'Parsing failed. The text is kept. Try again.');
      case 'ship-failed': return I18n.text(this.language, '发货未确认，请关闭弹窗刷新订单后重试', 'Shipment not confirmed. Close and refresh before retrying.');
      case 'fields': return I18n.text(this.language, '至少选择一项分享内容', 'Select at least one section');
      case 'days': return I18n.text(this.language, '有效期需填写 0 至 365 的整数', 'Enter a whole number from 0 to 365');
      case 'intro': return I18n.text(this.language, '分享简介不能超过 40 字', 'The message cannot exceed 40 characters');
      case 'revoke-failed': return I18n.text(this.language, '撤销失败，请重试', 'Revocation failed. Try again.');
      case 'share-failed': return I18n.text(this.language, '分享创建未确认，请重试', 'Share creation not confirmed. Try again.');
      default: return '';
    }
  }

  @Builder private addressCard() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        OrderSectionHeading({ zh: '配送与收货', en: 'Delivery details', icon: 'location-o' }).layoutWeight(1);
        Text(this.shippingLabel()).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).constraintSize({ maxWidth: '40%' });
      }.width('100%');
      Row({ space: 12 }) {
        Text(this.order?.address?.name || I18n.text(this.language, '未提供收货人', 'Recipient not provided'))
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
        if (this.order?.address?.phone) Text(this.order.address.phone).fontSize(14).fontColor(DesignTokens.muted(this.darkMode))
          .wordBreak(WordBreak.BREAK_ALL).textAlign(TextAlign.End).layoutWeight(1.2);
      }.width('100%');
      Text([this.order?.address?.region || '', this.order?.address?.detail || ''].filter((part: string) => !!part).join(' ') || I18n.text(this.language, '未提供收货地址', 'Address not provided'))
        .fontSize(14).lineHeight(21).fontColor(DesignTokens.text(this.darkMode)).width('100%');
      if (this.order?.remark) {
        Column({ space: 4 }) {
          Text(I18n.text(this.language, '客户备注', 'Customer note')).fontSize(12).fontWeight(FontWeight.Medium).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
          Text(this.order.remark).fontSize(14).lineHeight(21).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        }.width('100%').padding(10).borderRadius(10).backgroundColor(DesignTokens.brandTint(this.darkMode));
      }
      Row({ space: 8 }) {
        Button(I18n.text(this.language, '联系客户', 'Contact customer'), { type: ButtonType.Normal }).height(44).layoutWeight(1).borderRadius(10).fontSize(13)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).enabled(!!this.order?.address?.phone).onClick(() => this.callCustomer());
        Button(I18n.text(this.language, '复制收货信息', 'Copy address'), { type: ButtonType.Normal }).height(44).layoutWeight(1).borderRadius(10).fontSize(13)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode))
          .enabled(!!OrderDetailPolicy.addressText(this.order?.address)).onClick(() => this.copyText(OrderDetailPolicy.addressText(this.order?.address)));
      }.width('100%');
      if (this.order?.trackingNumber) {
        Divider().color(DesignTokens.border(this.darkMode));
        this.trackingCard();
      }
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
  @Builder private trackingCard() {
    Row({ space: 10 }) {
      Column({ space: 4 }) {
        Text(this.order?.trackingCompany || this.shippingLabel()).fontSize(13).fontWeight(FontWeight.Medium).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        Text(this.order?.trackingNumber || '—').fontSize(14).wordBreak(WordBreak.BREAK_ALL).fontColor(DesignTokens.text(this.darkMode)).width('100%');
      }.layoutWeight(1);
      Button(I18n.text(this.language, '复制物流', 'Copy tracking'), { type: ButtonType.Normal }).constraintSize({ minHeight: 44, maxWidth: '35%' })
        .padding({ left: 8, right: 8 }).fontSize(13).borderRadius(10).backgroundColor(Color.Transparent)
        .fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.copyText(this.order?.trackingNumber || ''));
    }.width('100%');
  }
  @Builder private itemCard() {
    Column({ space: 10 }) {
      Row() {
        OrderSectionHeading({ zh: '商品与费用', en: 'Items and charges', icon: 'goods-collect-o' }).layoutWeight(1);
        Text(I18n.text(this.language, `${(this.order?.items || []).length} 项`, `${(this.order?.items || []).length} items`))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%');
      ForEach(this.order?.items || [], (item: OrderItem, index: number) => {
        OrderProductSummary({ item, previewEnabled: true });
        if (index < (this.order?.items?.length || 0) - 1) Divider().color(DesignTokens.border(this.darkMode));
      }, (item: OrderItem, index: number) => `${index}-${JSON.stringify(item)}`);
      if (!(this.order?.items || []).length) Text(I18n.text(this.language, '暂无商品明细', 'No item details available'))
        .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).padding({ top: 8, bottom: 8 });
      Divider().color(DesignTokens.border(this.darkMode));
      this.paymentCard();
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
  @Builder private paymentCard() {
    Column({ space: 4 }) {
      OrderInfoRow({ zh: '商品金额', en: 'Items subtotal', value: OrderDetailPolicy.money(this.order?.totalAmount) });
      OrderInfoRow({ zh: '运费', en: 'Shipping fee', value: OrderDetailPolicy.money(this.order?.shippingFee) });
      OrderInfoRow({ zh: '优惠金额', en: 'Discount', value: this.order?.discountAmount ? `−${OrderDetailPolicy.money(this.order.discountAmount)}` : OrderDetailPolicy.money(this.order?.discountAmount) });
      if (this.order?.status === 'refunded') Text(I18n.text(this.language, '此处为原订单金额，退款明细请在售后管理中查看。', 'Original order amounts are shown. View refund details in After-sales.'))
        .fontSize(12).lineHeight(19).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
    }.width('100%');
  }
  @Builder private recordCard() {
    Column({ space: 4 }) {
      Button({ type: ButtonType.Normal }) {
        Row({ space: 8 }) {
          Text(I18n.text(this.language, '订单时间记录', 'Order timeline')).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1).textAlign(TextAlign.Start);
          Text(I18n.text(this.language, this.recordsExpanded ? '收起' : '展开', this.recordsExpanded ? 'Collapse' : 'Expand')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
          MerchantIcon({ name: 'arrow', iconSize: 16, color: DesignTokens.muted(this.darkMode) }).rotate({ angle: this.recordsExpanded ? -90 : 90 });
        }.width('100%');
      }.width('100%').height(48).padding(0).backgroundColor(Color.Transparent).onClick(() => { this.recordsExpanded = !this.recordsExpanded; });
      if (this.recordsExpanded) {
        OrderInfoRow({ zh: '创建时间', en: 'Created at', value: OrderDetailPolicy.timestamp(this.order?.createdAt) });
        if (this.order?.paidAt) OrderInfoRow({ zh: '付款时间', en: 'Paid at', value: OrderDetailPolicy.timestamp(this.order.paidAt) });
        if (this.order?.shippedAt) OrderInfoRow({ zh: '发货时间', en: 'Shipped at', value: OrderDetailPolicy.timestamp(this.order.shippedAt) });
      }
    }.width('100%').padding({ left: 14, right: 14, top: 4, bottom: this.recordsExpanded ? 12 : 4 })
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }
  @Builder private actionBar() {
    Row({ space: 12 }) {
      Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'more-o', iconSize: 24, color: DesignTokens.text(this.darkMode) }); }
        .width(48).height(48).borderRadius(12).backgroundColor(DesignTokens.subtle(this.darkMode)).onClick(() => this.moreActions())
        .accessibilityText(I18n.text(this.language, '更多订单工具', 'More order tools'));
      Button(I18n.text(this.language, '分享订单', 'Share order'), { type: ButtonType.Normal }).layoutWeight(1).height(48).fontSize(14).borderRadius(12)
        .backgroundColor(OrderDetailPolicy.canShip(this.order) ? DesignTokens.subtle(this.darkMode) : DesignTokens.brand(this.darkMode))
        .fontColor(OrderDetailPolicy.canShip(this.order) ? DesignTokens.text(this.darkMode) : DesignTokens.onBrand(this.darkMode)).onClick(() => this.openShare());
      if (OrderDetailPolicy.canShip(this.order)) Button(I18n.text(this.language, '去发货', 'Ship order'), { type: ButtonType.Normal })
        .layoutWeight(1.2).height(48).fontSize(14).fontWeight(FontWeight.Medium).borderRadius(12)
        .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode))
        .enabled(!this.loading && !this.refreshFailed).opacity(this.loading || this.refreshFailed ? 0.45 : 1).onClick(() => this.openShip());
    }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 10 })
      .backgroundColor(DesignTokens.card(this.darkMode)).enabled(!this.submitting);
  }
  @Builder private shippingForm() {
    Column({ space: 16 }) {
      Text(I18n.text(this.language, '核对订单后填写物流信息，确认后将更新发货状态。', 'Check the order and tracking details. Confirming updates shipment status.'))
        .fontSize(13).lineHeight(21).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      Column({ space: 6 }) {
        OrderInfoRow({ zh: '订单编号', en: 'Order number', value: this.order?.no || '' });
        Text(OrderDetailPolicy.addressText(this.order?.address) || I18n.text(this.language, '未提供收货信息', 'Delivery details not provided'))
          .fontSize(14).lineHeight(21).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        if (this.order?.remark) Text(`${I18n.text(this.language, '客户备注', 'Customer note')}: ${this.order.remark}`)
          .fontSize(13).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
      }.width('100%').padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
      IBestField({ value: $company, label: I18n.text(this.language, '物流公司', 'Carrier'), placeholder: I18n.text(this.language, '填写物流公司', 'Enter carrier name') });
      IBestField({ value: $trackingNumber, label: I18n.text(this.language, '物流单号', 'Tracking no.'), placeholder: I18n.text(this.language, '填写完整单号', 'Enter tracking number') });
    }.width('100%');
  }
  @Builder private parseForm() {
    Column({ space: 16 }) {
      Text(I18n.text(this.language, '识别后仅复制文字，不会修改订单的收货信息。', 'This tool copies parsed text only. It does not change the order address.'))
        .fontSize(13).lineHeight(21).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      TextArea({ text: this.parseInput, placeholder: I18n.text(this.language, '粘贴姓名、电话和完整地址', 'Paste a name, phone and full address') })
        .height(150).maxLength(500).padding(14).fontSize(14).fontColor(DesignTokens.text(this.darkMode))
        .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12).enabled(!this.parsing)
        .onChange((value: string) => { this.parseInput = value; this.parsedAddress = null; this.actionError = ''; });
      if (this.parsedAddress) {
        Column({ space: 10 }) {
          OrderSectionHeading({ zh: '识别结果', en: 'Parsed details', icon: 'success' });
          OrderInfoRow({ zh: '姓名', en: 'Name', value: this.parsedAddress.name || '' });
          OrderInfoRow({ zh: '电话', en: 'Phone', value: this.parsedAddress.phone || '' });
          OrderInfoRow({ zh: '地区', en: 'Region', value: this.parsedAddress.region || '' });
          OrderInfoRow({ zh: '详细地址', en: 'Address', value: this.parsedAddress.detail || '' });
        }.width('100%').padding(16).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14);
      }
    }.width('100%');
  }
  @Builder private sharingForm() {
    Column({ space: 14 }) {
      if (this.shareLoading) {
        Row({ space: 10 }) {
          LoadingProgress().width(22).height(22).color(DesignTokens.brand(this.darkMode));
          Text(I18n.text(this.language, '正在读取分享设置', 'Loading sharing settings')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%').padding(16);
      }
      if (this.sharePrefillFailed) Text(I18n.text(this.language, '原设置读取失败，请重新核对下方可见内容再生成链接。', 'Previous settings could not load. Review visible sections before creating a link.'))
        .fontSize(12).fontColor(DesignTokens.warning(this.darkMode)).width('100%').padding(12).backgroundColor(DesignTokens.warningTint(this.darkMode)).borderRadius(12);
      Column({ space: 6 }) {
        Text(I18n.text(this.language, '客户可见内容', 'Visible to the customer')).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        OrderShareChoice({ zh: '订单基础', en: 'Order summary', hintZh: '订单号、状态和时间', hintEn: 'Number, status and dates', selected: $shareBasics });
        OrderShareChoice({ zh: '客户信息', en: 'Customer details', hintZh: '姓名、电话、地址（敏感信息）', hintEn: 'Name, phone and address (private)', selected: $shareCustomer });
        OrderShareChoice({ zh: '价格明细', en: 'Pricing', hintZh: '金额、优惠与运费', hintEn: 'Amounts, discount and shipping fee', selected: $sharePricing });
        OrderShareChoice({ zh: '商品清单', en: 'Items', hintZh: '图片、规格和数量', hintEn: 'Images, options and quantities', selected: $shareItems });
        OrderShareChoice({ zh: '备注与物流', en: 'Notes and shipping', hintZh: '客户备注与物流信息', hintEn: 'Customer notes and shipment details', selected: $shareExtra });
        IBestField({ value: $shareDays, label: I18n.text(this.language, '有效天数', 'Valid days'), placeholder: '0–365', type: 'number' });
        Row({ space: 8 }) {
          ForEach(['7', '30', '90', '0'], (days: string) => {
            Button(days === '0' ? I18n.text(this.language, '永久', 'Always') : I18n.text(this.language, `${days} 天`, `${days} days`), { type: ButtonType.Normal })
              .height(44).layoutWeight(1).fontSize(12).borderRadius(10)
              .backgroundColor(this.shareDays === days ? DesignTokens.brandTint(this.darkMode) : DesignTokens.subtle(this.darkMode))
              .fontColor(this.shareDays === days ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode))
              .onClick(() => { this.shareDays = days; this.actionError = ''; });
          }, (days: string) => days);
        }.width('100%');
        TextArea({ text: this.shareIntro, placeholder: I18n.text(this.language, '可选：添加分享简介', 'Optional sharing message') })
          .height(90).maxLength(40).padding(12).fontSize(14).fontColor(DesignTokens.text(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode))
          .borderRadius(12).onChange((value: string) => { this.shareIntro = value; this.actionError = ''; });
        Text(I18n.text(this.language, `${this.shareIntro.length}/40 · 将打开系统分享并复制链接`, `${this.shareIntro.length}/40 · Opens system sharing and copies the link`))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        if (this.currentShareCode) {
          Row({ space: 12 }) {
            Text(I18n.text(this.language, '已有生效的分享链接', 'An active link exists')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
            Button(I18n.text(this.language, '复制链接', 'Copy link'), { type: ButtonType.Normal }).height(44).fontSize(12).backgroundColor(Color.Transparent)
              .fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.copyText(`https://ewsn.top/share?code=${this.currentShareCode}`));
          }.width('100%');
          Button(I18n.text(this.language, '撤销旧分享', 'Revoke existing link'), { type: ButtonType.Normal }).height(44).width('100%').fontSize(13)
            .backgroundColor(DesignTokens.dangerTint(this.darkMode)).fontColor(DesignTokens.danger(this.darkMode)).borderRadius(10).onClick(() => this.confirmRevokeShare());
        }
      }.width('100%').enabled(!this.shareLoading);
    }.width('100%');
  }
  @Builder private actionPanel() {
    Column() {
      Row({ space: 12 }) {
        OrderSectionHeading({ zh: this.actionMode === 'ship' ? '物流发货' : this.actionMode === 'parse' ? '地址识别工具' : '分享订单',
          en: this.actionMode === 'ship' ? 'Ship order' : this.actionMode === 'parse' ? 'Address parser' : 'Share order',
          icon: this.actionMode === 'ship' ? 'tosend' : this.actionMode === 'parse' ? 'location-o' : 'share-o' }).layoutWeight(1);
        Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'cross', iconSize: 22, color: DesignTokens.muted(this.darkMode) }); }
          .width(44).height(44).backgroundColor(Color.Transparent).enabled(!this.submitting).onClick(() => this.closeAction())
          .accessibilityText(I18n.text(this.language, '关闭', 'Close'));
      }.width('100%').padding({ left: 18, right: 10, top: 10, bottom: 8 }).border({ width: { bottom: 0.5 }, color: DesignTokens.border(this.darkMode) });
      Scroll() {
        Column({ space: 12 }) {
          if (this.actionMode === 'ship') this.shippingForm();
          else if (this.actionMode === 'parse') this.parseForm();
          else this.sharingForm();
        }.width('100%').padding(18).enabled(!this.submitting);
      }.layoutWeight(1).width('100%').align(Alignment.Top).scrollBar(BarState.Off);
      if (this.actionError) Text(this.errorText()).fontSize(12).fontColor(DesignTokens.danger(this.darkMode)).width('100%').padding({ left: 18, right: 18, top: 8 });
      Row({ space: 12 }) {
        Button(I18n.text(this.language, '取消', 'Cancel'), { type: ButtonType.Normal }).height(48).layoutWeight(1).fontSize(14).borderRadius(12)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).enabled(!this.submitting).onClick(() => this.closeAction());
        Button(this.submitting || this.parsing ? I18n.text(this.language, '处理中…', 'Working…') : this.actionMode === 'ship' ? I18n.text(this.language, '确认发货', 'Confirm shipment')
          : this.actionMode === 'parse' ? (this.parsedAddress ? I18n.text(this.language, '复制识别结果', 'Copy result') : I18n.text(this.language, '开始识别', 'Parse address'))
            : I18n.text(this.language, '生成并分享', 'Create and share'), { type: ButtonType.Normal })
          .height(48).layoutWeight(2).fontSize(14).fontWeight(FontWeight.Medium).borderRadius(12)
          .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode))
          .enabled(!this.submitting && !this.parsing && !this.shareLoading && this.actionError !== 'ship-failed').onClick(() => this.submitAction());
      }.width('100%').padding({ left: 18, right: 18, top: 12, bottom: this.safeBottom + 12 });
    }.width('100%').height('85%').constraintSize({ maxHeight: '85%', maxWidth: 720 })
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 }).clip(true);
  }
  @Builder private skeleton() {
    Column({ space: 14 }) {
      Column().width('100%').height(144).borderRadius(16).backgroundColor(DesignTokens.subtle(this.darkMode));
      Column().width('100%').height(180).borderRadius(20).backgroundColor(DesignTokens.card(this.darkMode));
      Column().width('100%').height(170).borderRadius(20).backgroundColor(DesignTokens.card(this.darkMode));
    }.width('100%').padding(16);
  }
  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: I18n.text(this.language, '订单详情', 'Order details'), isShowStatusBar: true,
            navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.leave() });
          if (this.loading && !this.order) {
            Scroll() { this.skeleton(); }.layoutWeight(1).width('100%').align(Alignment.Top);
          } else if (this.order) {
            Scroll() {
              Column({ space: 10 }) {
                if (this.refreshFailed) {
                  Button(I18n.text(this.language, '更新失败，当前为上次记录 · 点击重试', 'Update failed. Showing previous details · Retry'), { type: ButtonType.Normal })
                    .width('100%').padding(14).fontSize(12).borderRadius(12).backgroundColor(DesignTokens.warningTint(this.darkMode))
                    .fontColor(DesignTokens.warning(this.darkMode)).onClick(() => this.load());
                } else if (this.loading) {
                  Row({ space: 8 }) { LoadingProgress().width(16).height(16).color(DesignTokens.brand(this.darkMode));
                    Text(I18n.text(this.language, '正在更新订单', 'Updating order')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)); }.width('100%');
                }
                OrderStatusCard({ order: this.order, onCopy: () => this.copyText(this.order?.no || '') });
                if (this.order.status === 'after_sale' || this.order.status === 'refunded') {
                  Button(I18n.text(this.language, '前往售后管理', 'Open After-sales'), { type: ButtonType.Normal }).width('100%').height(46).fontSize(13)
                    .backgroundColor(DesignTokens.card(this.darkMode)).fontColor(DesignTokens.brand(this.darkMode)).borderRadius(12).onClick(() => AppRouter.push('AfterSale'));
                }
                this.addressCard(); this.itemCard(); this.recordCard();
              }.width('100%').constraintSize({ maxWidth: 960 }).padding({ left: 16, right: 16, top: 14, bottom: 20 });
            }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
            this.actionBar();
          } else {
            Column({ space: 18 }) {
              MerchantIcon({ name: 'orders-o', iconSize: 54, color: DesignTokens.muted(this.darkMode) });
              Text(I18n.text(this.language, '暂时无法加载订单', 'Unable to load this order')).fontSize(16).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
              Text(I18n.text(this.language, '请检查网络后重试，订单信息不会丢失。', 'Check your connection and try again. Your order is unchanged.')).fontSize(13).textAlign(TextAlign.Center).fontColor(DesignTokens.muted(this.darkMode));
              Button(I18n.text(this.language, '重新加载', 'Try again'), { type: ButtonType.Normal }).height(46).width(170).fontSize(14).borderRadius(12)
                .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode)).onClick(() => this.load());
            }.layoutWeight(1).width('100%').padding(28).justifyContent(FlexAlign.Center);
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode)).enabled(!this.actionVisible);
        if (this.actionVisible) {
          Column().width('100%').height('100%').backgroundColor('#99000000').onClick(() => this.closeAction());
          this.actionPanel();
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onShown(() => this.activateKeyboard()).onHidden(() => this.restoreKeyboard())
      .onBackPressed((): boolean => { if (!this.actionVisible && !this.submitting) return false; this.closeAction(); return true; });
  }
}
