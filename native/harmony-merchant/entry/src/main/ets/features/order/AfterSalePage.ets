import { OrderProductSummary } from './OrderProductSummary';
import { IBestButton, IBestEmpty, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { FilterRouteParams, IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { RefundSummary } from './OrderModels';
import { OrderRepository } from './OrderRepository';
import { I18n } from '../../core/i18n/I18n';
import { AfterSalePolicy } from './AfterSalePolicy';

interface RefundFilter { value: string; label: string; }

@Builder
export function AfterSaleBuilder(_: string, raw: Object) { AfterSalePage({ params: raw as FilterRouteParams }); }

@Component
struct AfterSalePage {
  params: FilterRouteParams = new FilterRouteParams();
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @State private refreshing: boolean = false;
  @State private errorMessage: string = '';
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageProp('commerceEpoch') @Watch('onCommerceEvent') private commerceEpoch: number = 0;
  @State private status: string = '';
  @State private refunds: RefundSummary[] = [];
  @State private page: number = 1;
  @State private total: number = 0;
  @State private loading: boolean = false;
  @State private editorVisible: boolean = false;
  @State private action: string = '';
  @State private selected: RefundSummary | null = null;
  @State private refundAmount: string = '';
  @State private rejectReason: string = '';
  @State private submitting: boolean = false;
  private requestEpoch: number = 0;
  private readonly filters: RefundFilter[] = [
    { value: '', label: '' }, { value: 'pending', label: 'pending' },
    { value: 'agreed', label: 'agreed' }, { value: 'rejected', label: 'rejected' },
    { value: 'in_progress', label: 'in_progress' }, { value: 'completed', label: 'completed' }
  ];

  aboutToAppear(): void {
    if (this.filters.some((item: RefundFilter) => item.value === this.params.status)) this.status = this.params.status;
    this.reload();
  }

  private onCommerceEvent(): void {
    if (!this.loading && !this.editorVisible) this.reload();
  }

  private async reload(): Promise<void> {
    this.page = 1; await this.load(false);
  }

  private async load(append: boolean): Promise<void> {
    if (append && this.loading) return;
    const epoch = ++this.requestEpoch;
    const requestedStatus = this.status;
    const requestedPage = this.page;
    this.loading = true;
    this.errorMessage = '';
    try {
      const result = await OrderRepository.refunds(requestedStatus, requestedPage);
      if (epoch !== this.requestEpoch) return;
      this.refunds = append ? this.refunds.concat(result.list) : result.list;
      this.total = result.total;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        if (append && this.page === requestedPage) this.page = Math.max(1, requestedPage - 1);
        this.errorMessage = error instanceof ApiError ? error.message : 'i18n:refunds-load';
      }
    } finally {
      if (epoch === this.requestEpoch) { this.loading = false; this.refreshing = false; }
    }
  }

  private open(item: RefundSummary, action: string): void {
    this.selected = item; this.action = action;
    this.refundAmount = `${item.applyAmount}`; this.rejectReason = ''; this.editorVisible = true;
  }

  private async submit(): Promise<void> {
    if (!this.selected || this.submitting) return;
    this.submitting = true;
    try {
      if (this.action === 'agree') {
        const amount = AfterSalePolicy.approvedAmount(this.refundAmount, this.selected.applyAmount);
        if (amount === undefined) {
          IBestToast.show(I18n.text(this.language, '退款金额必须大于0且不超过申请金额', 'Refund amount must be greater than 0 and no more than the requested amount')); return;
        }
        await OrderRepository.agreeRefund(this.selected.id, amount);
      } else {
        const reason = AfterSalePolicy.rejectReason(this.rejectReason);
        if (reason === undefined) { IBestToast.show(I18n.text(this.language, '请填写驳回原因', 'Enter a rejection reason')); return; }
        await OrderRepository.rejectRefund(this.selected.id, reason);
      }
      this.editorVisible = false; IBestToast.show(I18n.text(this.language, '已处理', 'Request handled')); await this.reload();
    } catch (error) { IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '售后处理失败', 'Failed to handle after-sales request')); }
    finally { this.submitting = false; }
  }

  private statusLabel(value: string): string {
    if (value === '') return I18n.text(this.language, '全部', 'All');
    if (value === 'pending') return I18n.text(this.language, '待处理', 'Pending');
    if (value === 'agreed') return I18n.text(this.language, '已同意', 'Approved');
    if (value === 'rejected') return I18n.text(this.language, '已驳回', 'Rejected');
    if (value === 'in_progress') return I18n.text(this.language, '处理中', 'In progress');
    if (value === 'completed') return I18n.text(this.language, '已完成', 'Completed');
    return value;
  }

  @Builder
  private card(item: RefundSummary) {
    Column({ space: 12 }) {
      Row({ space: 8 }) {
        Text(item.no).layoutWeight(1).fontSize(12).fontColor(DesignTokens.muted(this.darkMode))
          .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
        Text(this.statusLabel(item.status)).constraintSize({ maxWidth: '38%' }).fontSize(12)
          .fontColor(DesignTokens.brand(this.darkMode)).maxLines(2).textAlign(TextAlign.End);
      }.width('100%').onClick(() => AppRouter.push('AfterSaleDetail', new IdRouteParams(item.id)));
      Text(item.type === 'refund_with_return'
        ? I18n.text(this.language, '退货退款', 'Return and refund')
        : I18n.text(this.language, '仅退款', 'Refund only'))
        .width('100%').fontSize(16).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
      if (item.orderItem) {
        OrderProductSummary({ item: item.orderItem });
      }
      Text(I18n.text(this.language, `原因：${item.reason}`, `Reason: ${item.reason}`))
        .width('100%').fontSize(13).fontColor(DesignTokens.muted(this.darkMode))
        .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
      if (item.description) {
        Text(item.description).width('100%').fontSize(12).fontColor(DesignTokens.muted(this.darkMode))
          .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      Divider().color(DesignTokens.border(this.darkMode));
      Text(I18n.text(this.language, `申请金额 ¥${item.applyAmount.toFixed(2)}`, `Requested ¥${item.applyAmount.toFixed(2)}`))
        .width('100%').wordBreak(WordBreak.BREAK_ALL).fontSize(18).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.brand(this.darkMode));
      Text(item.createdAt.replace('T', ' ').slice(0, 16)).width('100%').fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      IBestButton({ text: I18n.text(this.language, '查看详情', 'View details'), plain: true, btnWidth: '100%',
        color: DesignTokens.muted(this.darkMode), onBtnClick: () => AppRouter.push('AfterSaleDetail', new IdRouteParams(item.id)) });
      if (item.status === 'pending') {
        Row({ space: 8 }) {
          IBestButton({ text: I18n.text(this.language, '驳回', 'Reject'), plain: true, btnWidth: '48%', type: 'danger', onBtnClick: () => this.open(item, 'reject') });
          IBestButton({ text: I18n.text(this.language, '同意退款', 'Approve refund'), btnWidth: '48%', type: 'primary',
            color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.open(item, 'agree') });
        }.width('100%');
      }
    }.width('100%').alignItems(HorizontalAlign.Start).padding(16)
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: I18n.text(this.language, '售后处理', 'After-sales'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
          Scroll() { Row({ space: 8 }) { ForEach(this.filters, (item: RefundFilter) => { Text(this.statusLabel(item.value)).fontSize(13).fontColor(this.status === item.value ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode)).padding({ left: 14, right: 14, top: 8, bottom: 8 }).border({ width: { bottom: 2 }, color: this.status === item.value ? DesignTokens.brand(this.darkMode) : Color.Transparent }).onClick(() => { this.status = item.value; this.reload(); }); }, (item: RefundFilter) => item.value); }.padding(12); }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);
          if (this.errorMessage) {
            Text(I18n.state(this.language, this.errorMessage)).width('100%').fontSize(12).padding(12).fontColor(DesignTokens.muted(this.darkMode))
              .onClick(() => this.reload());
          }
          if (!this.loading && this.refunds.length === 0) {
            Column() { IBestEmpty({ description: I18n.text(this.language, '暂无售后申请', 'No after-sales requests') }); }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            Refresh({ refreshing: $$this.refreshing }) {
            List({ space: 10 }) { ForEach(this.refunds, (item: RefundSummary) => { ListItem() { this.card(item); } }, (item: RefundSummary) => item.id); if (this.loading) ListItem() { Row() { LoadingProgress().width(24).height(24).color(DesignTokens.brand(this.darkMode)); }.height(52).justifyContent(FlexAlign.Center); } }.width('100%').height('100%').lanes(this.windowWidth >= 720 ? 2 : 1, 12).padding({ left: 16, right: 16, bottom: this.safeBottom + 16 }).onReachEnd(() => { if (this.refunds.length < this.total && !this.loading) { this.page += 1; this.load(true); } });
            }.layoutWeight(1).onRefreshing(() => { this.refreshing = true; this.reload(); });
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
        if (this.editorVisible) {
          Column().width('100%').height('100%').backgroundColor('#99000000')
            .onClick(() => { if (!this.submitting) this.editorVisible = false; });
          Scroll() {
          Column({ space: 14 }) {
            Text(this.action === 'agree' ? I18n.text(this.language, '确认退款', 'Confirm refund') : I18n.text(this.language, '驳回售后', 'Reject request')).fontSize(20).fontWeight(FontWeight.Bold);
            if (this.action === 'agree') IBestField({ value: $refundAmount, label: I18n.text(this.language, '退款金额', 'Refund amount'), type: 'decimal', placeholder: I18n.text(this.language, '请输入退款金额', 'Enter the refund amount') });
            else IBestField({ value: $rejectReason, label: I18n.text(this.language, '驳回原因', 'Rejection reason'), placeholder: I18n.text(this.language, '请输入具体原因', 'Enter a specific reason') });
            Row({ space: 10 }) { IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.submitting, onBtnClick: () => { this.editorVisible = false; } }); IBestButton({ text: I18n.text(this.language, '确定', 'Confirm'), type: this.action === 'agree' ? 'primary' : 'danger', color: this.action === 'agree' ? DesignTokens.brand(this.darkMode) : DesignTokens.danger(this.darkMode), btnWidth: '48%', loading: this.submitting, disabled: this.submitting, onBtnClick: () => this.submit() }); }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 }).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: DesignTokens.RADIUS_XL, topRight: DesignTokens.RADIUS_XL });
          }.width('100%').constraintSize({ maxWidth: 720, maxHeight: '80%' }).align(Alignment.Top).clip(true);
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onBackPressed((): boolean => {
      if (!this.editorVisible) return false;
      if (!this.submitting) this.editorVisible = false;
      return true;
    });
  }
}
