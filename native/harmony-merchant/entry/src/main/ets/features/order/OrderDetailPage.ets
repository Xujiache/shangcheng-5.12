import { common } from '@kit.AbilityKit';
import { pasteboard } from '@kit.BasicServicesKit';
import { systemShare } from '@kit.ShareKit';
import { IBestButton, IBestDialogUtil, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { PhoneService } from '../../core/device/PhoneService';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { OrderItem, OrderShareRequest, OrderSummary, ParsedAddress, ShipOrderRequest } from './OrderModels';
import { OrderRepository } from './OrderRepository';
import { I18n } from '../../core/i18n/I18n';
import { OrderProductSummary } from './OrderProductSummary';

@Builder
export function OrderDetailBuilder(_: string, raw: Object) { OrderDetailPage({ params: raw as IdRouteParams }); }

@Component
struct OrderDetailPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageProp('commerceEpoch') @Watch('onCommerceEvent') private commerceEpoch: number = 0;
  @State private order: OrderSummary | null = null;
  @State private loading: boolean = true;
  @State private actionVisible: boolean = false;
  @State private actionMode: string = '';
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
  @State private parseInput: string = '';
  @State private parsedAddress: ParsedAddress | null = null;
  @State private parsing: boolean = false;
  @State private submitting: boolean = false;

  aboutToAppear(): void { this.load(); }

  private onCommerceEvent(): void {
    if (!this.loading && !this.actionVisible && !this.submitting) this.load();
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.order = await OrderRepository.detail(this.params.id);
      if (this.params.action === 'ship' && this.order.status === 'pending_shipment') {
        this.params.action = '';
        this.openShip();
      }
    }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message
      : I18n.text(this.language, '订单详情加载失败', 'Failed to load order details')); }
    finally { this.loading = false; }
  }

  private openShip(): void { this.actionMode = 'ship'; this.actionVisible = true; }
  private openParse(): void {
    this.actionMode = 'parse';
    this.parseInput = '';
    this.parsedAddress = null;
    this.actionVisible = true;
  }

  private async openShare(): Promise<void> {
    this.actionMode = 'share';
    if (!this.shareIntro && this.order) this.shareIntro = I18n.text(this.language,
      `请查看您的订单详情（实付 ¥${this.order.payAmount.toFixed(2)}）`,
      `View your order details (paid ¥${this.order.payAmount.toFixed(2)})`);
    try {
      const current = await OrderRepository.currentShare(this.params.id);
      this.currentShareCode = current?.shareCode || '';
      if (current?.config) {
        const fields = current.config.visibleFields;
        this.shareBasics = fields.includes('basics');
        this.shareCustomer = fields.includes('customer');
        this.sharePricing = fields.includes('pricing');
        this.shareItems = fields.includes('items');
        this.shareExtra = fields.includes('extra');
        this.shareIntro = current.config.intro || this.shareIntro;
        if (!current.config.expiresAt) {
          this.shareDays = '0';
        } else {
          const remaining = Math.ceil((new Date(current.config.expiresAt).getTime() - Date.now()) / 86400000);
          this.shareDays = `${Math.max(1, remaining)}`;
        }
      }
    } catch (_) {
      // A failed prefill must not block creating a new share link.
    }
    this.actionVisible = true;
  }

  private async parseAddress(): Promise<void> {
    if (this.parsing || this.submitting) return;
    if (!this.parseInput.trim()) { IBestToast.show(I18n.text(this.language, '请粘贴客户地址', 'Paste the customer address')); return; }
    this.parsing = true;
    try {
      const value = await OrderRepository.parseAddress(this.parseInput.trim());
      if (!value.name && !value.phone && !value.region && !value.detail) {
        IBestToast.show(I18n.text(this.language, '未识别到有效信息', 'No valid details found'));
        this.parsedAddress = null;
      } else {
        this.parsedAddress = value;
      }
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '地址解析失败', 'Failed to parse address'));
    } finally {
      this.parsing = false;
    }
  }

  private async applyParsedAddress(): Promise<void> {
    if (!this.order || !this.parsedAddress) return;
    const value = this.parsedAddress;
    this.order.address = {
      name: value.name || this.order.address.name,
      phone: value.phone || this.order.address.phone,
      region: value.region || this.order.address.region,
      detail: value.detail || this.order.address.detail
    };
    this.order = this.order;
    const text = [value.name || '', value.phone || '', value.region || '', value.detail || '']
      .filter((part: string): boolean => part.length > 0).join(' ');
    if (text) await this.copyText(text, I18n.text(this.language, '已解析并复制，请粘贴使用', 'Parsed and copied. Paste it where needed.'));
    this.actionVisible = false;
  }

  private submitAction(): void {
    if (this.submitting || this.parsing) return;
    if (this.actionMode === 'ship') this.ship();
    else if (this.actionMode === 'parse') {
      if (this.parsedAddress) this.applyParsedAddress();
      else this.parseAddress();
    } else this.createShare();
  }

  private confirmRevokeShare(): void {
    if (!this.currentShareCode) return;
    IBestDialogUtil.open({
      title: I18n.text(this.language, '撤销分享', 'Revoke share'),
      message: I18n.text(this.language,
        '撤销后，客户使用旧链接将无法继续查看。已截屏的内容无法收回。',
        'The old link will stop working after revocation. Existing screenshots cannot be recalled.'),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => { this.revokeShare(); }
    });
  }

  private async revokeShare(): Promise<void> {
    if (this.submitting) return;
    this.submitting = true;
    try {
      await OrderRepository.revokeShare(this.params.id);
      this.currentShareCode = '';
      IBestToast.show(I18n.text(this.language, '订单分享已撤销', 'Order share revoked'));
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '撤销失败', 'Failed to revoke'));
    } finally {
      this.submitting = false;
    }
  }

  private async ship(): Promise<void> {
    if (this.submitting) return;
    if (!this.company.trim() || !this.trackingNumber.trim()) { IBestToast.show(I18n.text(this.language, '请填写物流公司和单号', 'Enter the carrier and tracking number')); return; }
    const body: ShipOrderRequest = { company: this.company.trim(), trackingNumber: this.trackingNumber.trim() };
    this.submitting = true;
    try { await OrderRepository.ship(this.params.id, body); this.actionVisible = false; IBestToast.show(I18n.text(this.language, '发货成功', 'Order shipped')); await this.load(); }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message
      : I18n.text(this.language, '发货失败', 'Failed to ship order')); }
    finally { this.submitting = false; }
  }

  private async createShare(): Promise<void> {
    if (this.submitting) return;
    const visibleFields: string[] = [];
    if (this.shareBasics) visibleFields.push('basics');
    if (this.shareCustomer) visibleFields.push('customer');
    if (this.sharePricing) visibleFields.push('pricing');
    if (this.shareItems) visibleFields.push('items');
    if (this.shareExtra) visibleFields.push('extra');
    const expiresInDays = Number(this.shareDays);
    if (visibleFields.length === 0) { IBestToast.show(I18n.text(this.language, '请至少选择一项可见内容', 'Select at least one visible section')); return; }
    if (!Number.isFinite(expiresInDays) || expiresInDays < 0 || expiresInDays > 365) {
      IBestToast.show(I18n.text(this.language, '有效期应为 0 至 365 天', 'Validity must be between 0 and 365 days')); return;
    }
    if (this.shareIntro.trim().length > 40) { IBestToast.show(I18n.text(this.language, '分享简介最多 40 个字', 'Share message cannot exceed 40 characters')); return; }
    const body: OrderShareRequest = {
      visibleFields,
      expiresInDays: Math.floor(expiresInDays), intro: this.shareIntro.trim()
    };
    this.submitting = true;
    try {
      const result = await OrderRepository.createShare(this.params.id, body);
      const link = `https://ewsn.top/share?code=${result.shareCode}`;
      let copied = false;
      try {
        const record = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, link);
        await pasteboard.getSystemPasteboard().setData(record);
        copied = true;
      } catch (_) {
        // The system share sheet can still deliver the link when clipboard
        // access is unavailable, so do not turn a valid server share into a
        // false creation failure.
      }
      this.actionVisible = false;
      try {
        const defaultShareText = I18n.text(this.language, '请查看订单详情', 'View order details');
        const sharedRecord: systemShare.SharedRecord = {
          utd: 'general.plain-text',
          title: I18n.text(this.language, `订单 ${result.orderNo}`, `Order ${result.orderNo}`),
          content: `${this.shareIntro.trim() || defaultShareText}\n${link}`,
          description: I18n.text(this.language, '经纬门窗订单分享', 'Jingwei Windows & Doors order share')
        };
        const controller = new systemShare.ShareController(new systemShare.SharedData(sharedRecord));
        await controller.show(this.getUIContext().getHostContext() as common.UIAbilityContext, {});
      } catch (_error) {
        IBestToast.show(copied
          ? I18n.text(this.language, '分享链接已复制，可粘贴发送给客户', 'Share link copied. Paste it to send to the customer.')
          : I18n.text(this.language, '系统分享暂时不可用，请稍后重试', 'System sharing is temporarily unavailable. Try again later.'));
      }
    } catch (error) { IBestToast.show(error instanceof ApiError ? error.message
      : I18n.text(this.language, '创建分享失败', 'Failed to create share link')); }
    finally { this.submitting = false; }
  }

  private statusLabel(status: string): string {
    if (status === 'pending_payment') return I18n.text(this.language, '待付款', 'Pending payment');
    if (status === 'pending_shipment') return I18n.text(this.language, '待发货', 'Pending shipment');
    if (status === 'shipped') return I18n.text(this.language, '已发货', 'Shipped');
    if (status === 'completed') return I18n.text(this.language, '已完成', 'Completed');
    if (status === 'cancelled') return I18n.text(this.language, '已取消', 'Cancelled');
    if (status === 'after_sale') return I18n.text(this.language, '售后中', 'After-sales');
    if (status === 'refunded') return I18n.text(this.language, '已退款', 'Refunded');
    return status;
  }

  private async callCustomer(): Promise<void> {
    if (!this.order) return;
    try { await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, this.order.address.phone); }
    catch (error) { IBestToast.show(error instanceof Error ? error.message
      : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer')); }
  }

  private async copyText(value: string, message: string): Promise<void> {
    if (!value) return;
    try {
      const record = pasteboard.createData(pasteboard.MIMETYPE_TEXT_PLAIN, value);
      await pasteboard.getSystemPasteboard().setData(record);
      IBestToast.show(message);
    } catch (_) {
      IBestToast.show(I18n.text(this.language, '复制失败，请稍后重试', 'Copy failed. Try again later.'));
    }
  }

  @Builder
  private section(title: string) { Text(title).width('100%').fontSize(17).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)); }

  @Builder
  private amountRow(label: string, value: string, important: boolean = false) {
    Row({ space: 12 }) {
      Text(label).layoutWeight(1).fontSize(important ? 15 : 13).fontColor(DesignTokens.muted(this.darkMode));
      Text(value).layoutWeight(1).fontSize(important ? 18 : 13).textAlign(TextAlign.End)
        .wordBreak(WordBreak.BREAK_ALL).fontWeight(important ? FontWeight.Bold : FontWeight.Regular)
        .fontColor(important ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode));
    }.width('100%').alignItems(VerticalAlign.Top);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: I18n.text(this.language, '订单详情', 'Order details'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
          if (this.loading && !this.order) {
            Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.order) {
            Scroll() {
              Column({ space: 14 }) {
                Row() {
                  Column({ space: 4 }) {
                    Text(this.statusLabel(this.order.status)).fontSize(23).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
                    Text(I18n.text(this.language, `订单号 ${this.order.no}`, `Order ${this.order.no}`)).width('100%').wordBreak(WordBreak.BREAK_ALL).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                  }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                }.width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 10 }) {
                  this.section(I18n.text(this.language, '收货信息', 'Delivery details'));
                  Text(`${this.order.address.name}  ${this.order.address.phone}`).fontSize(15).fontWeight(FontWeight.Medium).width('100%');
                  Text(`${this.order.address.region}${this.order.address.detail}`).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  Row({ space: 8 }) {
                    IBestButton({ text: I18n.text(this.language, '联系客户', 'Contact'), btnWidth: '48%', plain: true, color: DesignTokens.muted(this.darkMode), onBtnClick: () => this.callCustomer() });
                    IBestButton({ text: I18n.text(this.language, '复制地址', 'Copy address'), btnWidth: '48%', plain: true, color: DesignTokens.muted(this.darkMode), onBtnClick: () => this.copyText(`${this.order?.address.region || ''}${this.order?.address.detail || ''}`, I18n.text(this.language, '收货地址已复制', 'Delivery address copied')) });
                  }.width('100%');
                  Row({ space: 8 }) {
                    IBestButton({ text: I18n.text(this.language, '识别地址', 'Parse address'), btnWidth: '48%', plain: true, color: DesignTokens.muted(this.darkMode), onBtnClick: () => this.openParse() });
                    IBestButton({ text: I18n.text(this.language, '复制订单号', 'Copy order no.'), btnWidth: '48%', plain: true, color: DesignTokens.muted(this.darkMode), onBtnClick: () => this.copyText(this.order?.no || '', I18n.text(this.language, '订单号已复制', 'Order number copied')) });
                  }.width('100%');
                }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 12 }) {
                  this.section(I18n.text(this.language, '商品明细', 'Items'));
                  ForEach(this.order.items || [], (item: OrderItem) => {
                    OrderProductSummary({ item: item });
                  }, (item: OrderItem) => item.id);
                }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 10 }) {
                  this.section(I18n.text(this.language, '费用明细', 'Payment details'));
                  this.amountRow(I18n.text(this.language, '商品金额', 'Items subtotal'), `¥${this.order.totalAmount.toFixed(2)}`);
                  this.amountRow(I18n.text(this.language, '优惠', 'Discount'), `-¥${this.order.discountAmount.toFixed(2)}`);
                  this.amountRow(I18n.text(this.language, '运费', 'Shipping'), `¥${this.order.shippingFee.toFixed(2)}`);
                  Divider().color(DesignTokens.border(this.darkMode));
                  this.amountRow(I18n.text(this.language, '实付', 'Paid'), `¥${this.order.payAmount.toFixed(2)}`, true);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                if (this.order.trackingNumber) {
                  Column({ space: 8 }) {
                    this.section(I18n.text(this.language, '物流信息', 'Shipping details'));
                    Text(`${this.order.trackingCompany || ''}  ${this.order.trackingNumber}`).fontSize(14).width('100%');
                  }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                }
              }.width('100%').constraintSize({ maxWidth: 960 }).padding({ left: 16, right: 16, top: 12, bottom: 20 });
            }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '分享订单', 'Share order'), plain: true, btnWidth: this.order.status === 'pending_shipment' ? '44%' : '100%', onBtnClick: () => this.openShare() });
              if (this.order.status === 'pending_shipment') IBestButton({ text: I18n.text(this.language, '物流发货', 'Ship order'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '52%', onBtnClick: () => this.openShip() });
            }.width('100%').padding({ left: 16, right: 16, top: 10, bottom: this.safeBottom + 10 }).backgroundColor(DesignTokens.card(this.darkMode));
          } else {
            Column({ space: 12 }) {
              Text(I18n.text(this.language, '暂时无法加载订单', 'Unable to load this order'))
                .width('100%').textAlign(TextAlign.Center).fontColor(DesignTokens.muted(this.darkMode));
              IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), plain: true,
                color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.load() });
            }.layoutWeight(1).width('100%').padding(24).justifyContent(FlexAlign.Center);
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
        if (this.actionVisible) {
          Column().width('100%').height('100%').backgroundColor('#99000000')
            .onClick(() => { if (!this.submitting && !this.parsing) this.actionVisible = false; });
          Scroll() {
          Column({ space: 14 }) {
            Text(this.actionMode === 'ship' ? I18n.text(this.language, '物流发货', 'Ship order')
              : this.actionMode === 'parse' ? I18n.text(this.language, '一键识别地址', 'Parse address')
                : I18n.text(this.language, '分享订单', 'Share order')).fontSize(20).fontWeight(FontWeight.Bold);
            if (this.actionMode === 'ship') {
              IBestField({ value: $company, label: I18n.text(this.language, '物流公司', 'Carrier'), placeholder: I18n.text(this.language, '例：顺丰速运', 'Example: SF Express') });
              IBestField({ value: $trackingNumber, label: I18n.text(this.language, '物流单号', 'Tracking number'), placeholder: I18n.text(this.language, '请输入物流单号', 'Enter the tracking number') });
            } else if (this.actionMode === 'parse') {
              Text(I18n.text(this.language, '粘贴包含姓名、手机号和地址的整段文字，系统会自动拆分。',
                'Paste text containing a name, phone number and address. It will be split automatically.'))
                .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              TextArea({ text: $parseInput, placeholder: I18n.text(this.language, '例：张三 18100000000 陕西省西安市雁塔区...', 'Example: Alex 18100000000 Yanta District, Xi\'an...') })
                .height(110).maxLength(500).padding(12).fontColor(DesignTokens.text(this.darkMode))
                .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(DesignTokens.RADIUS_FIELD);
              if (this.parsedAddress) {
                Column({ space: 7 }) {
                  Text(I18n.text(this.language, '识别结果', 'Parsed result')).fontSize(14).fontWeight(FontWeight.Medium).width('100%');
                  Text(I18n.text(this.language, `姓名：${this.parsedAddress.name || '未识别'}`, `Name: ${this.parsedAddress.name || 'Not found'}`)).fontSize(13).width('100%');
                  Text(I18n.text(this.language, `手机：${this.parsedAddress.phone || '未识别'}`, `Phone: ${this.parsedAddress.phone || 'Not found'}`)).fontSize(13).width('100%');
                  Text(I18n.text(this.language, `地区：${this.parsedAddress.region || '未识别'}`, `Region: ${this.parsedAddress.region || 'Not found'}`)).fontSize(13).width('100%');
                  Text(I18n.text(this.language, `详细地址：${this.parsedAddress.detail || '未识别'}`, `Address: ${this.parsedAddress.detail || 'Not found'}`)).fontSize(13).width('100%');
                }.width('100%').padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
              }
            } else {
              Text(I18n.text(this.language, '客户只能看到你勾选的内容', 'Customers can only see the sections you select')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              Column({ space: 2 }) {
                Row({ space: 10 }) {
                  Checkbox({ name: 'share-basics' }).select(this.shareBasics).selectedColor(DesignTokens.brand(this.darkMode))
                    .onChange((value: boolean) => { this.shareBasics = value; });
                  Column({ space: 2 }) {
                    Text(I18n.text(this.language, '订单基础', 'Order summary')).fontSize(14).fontWeight(FontWeight.Medium);
                    Text(I18n.text(this.language, '订单号、状态和时间', 'Number, status and time')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                  }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                }.width('100%').padding({ top: 7, bottom: 7 });
                Row({ space: 10 }) {
                  Checkbox({ name: 'share-customer' }).select(this.shareCustomer).selectedColor(DesignTokens.brand(this.darkMode))
                    .onChange((value: boolean) => { this.shareCustomer = value; });
                  Column({ space: 2 }) {
                    Text(I18n.text(this.language, '客户信息', 'Customer details')).fontSize(14).fontWeight(FontWeight.Medium);
                    Text(I18n.text(this.language, '姓名、电话和收货地址（默认隐藏）', 'Name, phone and address (hidden by default)')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                  }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                }.width('100%').padding({ top: 7, bottom: 7 });
                Row({ space: 10 }) {
                  Checkbox({ name: 'share-pricing' }).select(this.sharePricing).selectedColor(DesignTokens.brand(this.darkMode))
                    .onChange((value: boolean) => { this.sharePricing = value; });
                  Text(I18n.text(this.language, '价格明细', 'Pricing')).fontSize(14).layoutWeight(1);
                  Text(I18n.text(this.language, '总价、优惠、实付', 'Total, discount and paid amount')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                }.width('100%').padding({ top: 7, bottom: 7 });
                Row({ space: 10 }) {
                  Checkbox({ name: 'share-items' }).select(this.shareItems).selectedColor(DesignTokens.brand(this.darkMode))
                    .onChange((value: boolean) => { this.shareItems = value; });
                  Text(I18n.text(this.language, '商品清单', 'Item list')).fontSize(14).layoutWeight(1);
                  Text(I18n.text(this.language, '图片、规格、数量', 'Images, options and quantity')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                }.width('100%').padding({ top: 7, bottom: 7 });
                Row({ space: 10 }) {
                  Checkbox({ name: 'share-extra' }).select(this.shareExtra).selectedColor(DesignTokens.brand(this.darkMode))
                    .onChange((value: boolean) => { this.shareExtra = value; });
                  Text(I18n.text(this.language, '备注与物流', 'Notes and shipping')).fontSize(14).layoutWeight(1);
                  Text(I18n.text(this.language, '买家备注、配送、物流单号', 'Buyer notes, delivery and tracking')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                }.width('100%').padding({ top: 7, bottom: 7 });
              }.width('100%').padding(10).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
              IBestField({ value: $shareDays, label: I18n.text(this.language, '有效天数', 'Valid for'), placeholder: I18n.text(this.language, '0 为永久，最多 365 天', '0 is permanent, up to 365 days'), type: 'number' });
              Row({ space: 8 }) {
                ForEach(['7', '30', '90', '0'], (days: string) => {
                  Text(days === '0' ? I18n.text(this.language, '永久', 'Permanent')
                    : I18n.text(this.language, `${days} 天`, `${days} days`)).fontSize(12).textAlign(TextAlign.Center)
                    .fontColor(this.shareDays === days ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode))
                    .backgroundColor(this.shareDays === days ? DesignTokens.selectedSurface(this.darkMode) : DesignTokens.subtle(this.darkMode))
                    .borderRadius(16).layoutWeight(1).padding({ top: 7, bottom: 7 })
                    .onClick(() => { this.shareDays = days; });
                }, (days: string) => days);
              }.width('100%');
              IBestField({ value: $shareIntro, label: I18n.text(this.language, '分享简介', 'Share message'), placeholder: I18n.text(this.language, '可选，40字以内', 'Optional, up to 40 characters') });
              Text(I18n.text(this.language,
                `${this.shareIntro.length}/40 · 生成后将打开鸿蒙系统分享面板，并自动复制链接。`,
                `${this.shareIntro.length}/40 · Opens the HarmonyOS share panel and copies the link.`))
                .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              if (this.currentShareCode) {
                Row() {
                  Text(I18n.text(this.language, `已有生效分享 ${this.currentShareCode.slice(0, 4)}…`,
                    `Active share ${this.currentShareCode.slice(0, 4)}…`)).fontSize(12)
                    .fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
                  IBestButton({ text: I18n.text(this.language, '撤销旧分享', 'Revoke'), plain: true, type: 'danger', onBtnClick: () => this.confirmRevokeShare() });
                }.width('100%');
              }
            }
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.submitting || this.parsing, onBtnClick: () => { this.actionVisible = false; } });
              IBestButton({
                text: this.actionMode === 'parse'
                  ? (this.parsedAddress ? I18n.text(this.language, '应用并复制', 'Apply and copy')
                    : I18n.text(this.language, '开始识别', 'Parse'))
                  : I18n.text(this.language, '确定', 'Confirm'),
                type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%',
                loading: this.submitting || this.parsing, onBtnClick: () => this.submitAction()
              });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 }).backgroundColor(DesignTokens.card(this.darkMode));
          }.width('100%').constraintSize({ maxHeight: '85%', maxWidth: 720 }).align(Alignment.Top)
            .borderRadius({ topLeft: DesignTokens.RADIUS_XL, topRight: DesignTokens.RADIUS_XL }).clip(true);
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onBackPressed((): boolean => {
      if (!this.actionVisible) return false;
      if (!this.submitting && !this.parsing) this.actionVisible = false;
      return true;
    });
  }
}
