import {
  IBestButton, IBestField, IBestImagePreview, IBestNavBar, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { RefundSummary } from './OrderModels';
import { OrderRepository } from './OrderRepository';
import { I18n } from '../../core/i18n/I18n';
import { AfterSalePolicy } from './AfterSalePolicy';
import { OrderProductSummary } from './OrderProductSummary';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';

@Builder
export function AfterSaleDetailBuilder(_: string, raw: Object) {
  AfterSaleDetailPage({ params: raw as IdRouteParams });
}

@Component
struct AfterSaleDetailPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private item: RefundSummary | null = null;
  @State private loading: boolean = true;
  @State private editorVisible: boolean = false;
  @State private action: string = '';
  @State private refundAmount: string = '';
  @State private rejectReason: string = '';
  @State private submitting: boolean = false;

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      this.item = await OrderRepository.refundDetail(this.params.id);
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '售后详情加载失败', 'Failed to load after-sales details'));
    } finally {
      this.loading = false;
    }
  }

  private statusLabel(status: string): string {
    if (status === 'pending') return I18n.text(this.language, '待处理', 'Pending');
    if (status === 'agreed') return I18n.text(this.language, '已同意', 'Approved');
    if (status === 'rejected') return I18n.text(this.language, '已驳回', 'Rejected');
    if (status === 'in_progress') return I18n.text(this.language, '处理中', 'In progress');
    if (status === 'completed') return I18n.text(this.language, '已完成', 'Completed');
    return status;
  }

  private open(action: string): void {
    if (!this.item) return;
    this.action = action;
    this.refundAmount = `${this.item.applyAmount}`;
    this.rejectReason = '';
    this.editorVisible = true;
  }

  private async submit(): Promise<void> {
    if (!this.item || this.submitting) return;
    let approvedAmount: number | undefined = undefined;
    let rejectReason: string | undefined = undefined;
    if (this.action === 'agree') {
      approvedAmount = AfterSalePolicy.approvedAmount(this.refundAmount, this.item.applyAmount);
      if (approvedAmount === undefined) {
        IBestToast.show(I18n.text(this.language, '退款金额必须大于0且不超过申请金额', 'Refund amount must be greater than 0 and no more than the requested amount'));
        return;
      }
    } else {
      rejectReason = AfterSalePolicy.rejectReason(this.rejectReason);
      if (rejectReason === undefined) {
        IBestToast.show(I18n.text(this.language, '请填写驳回原因', 'Enter a rejection reason'));
        return;
      }
    }
    this.submitting = true;
    try {
      if (this.action === 'agree') {
        await OrderRepository.agreeRefund(this.item.id, approvedAmount);
      } else {
        await OrderRepository.rejectRefund(this.item.id, rejectReason || '');
      }
      this.editorVisible = false;
      IBestToast.show(I18n.text(this.language, '售后已处理', 'After-sales request handled'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '售后处理失败', 'Failed to handle after-sales request'));
    } finally {
      this.submitting = false;
    }
  }

  @Builder
  private detail(item: RefundSummary) {
    Scroll() {
      Column({ space: 12 }) {
        Column({ space: 10 }) {
          Row() {
            Text(item.type === 'refund_with_return'
              ? I18n.text(this.language, '退货退款', 'Return and refund')
              : I18n.text(this.language, '仅退款', 'Refund only'))
              .fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
            IBestTag({ text: this.statusLabel(item.status), plain: true, color: DesignTokens.brand(this.darkMode) });
          }.width('100%');
          Text(I18n.text(this.language, `售后单 ${item.no}`, `Request ${item.no}`)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          Text(I18n.text(this.language, `申请金额  ¥${item.applyAmount.toFixed(2)}`, `Requested  ¥${item.applyAmount.toFixed(2)}`))
            .fontSize(24).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
          if (item.refundAmount !== undefined) {
            Text(I18n.text(this.language, `实际退款  ¥${item.refundAmount.toFixed(2)}`, `Refunded  ¥${item.refundAmount.toFixed(2)}`))
              .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          }
        }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode))
          .borderRadius(DesignTokens.RADIUS_LARGE);

        Column({ space: 10 }) {
          Text(I18n.text(this.language, '申请说明', 'Request details')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
          Text(I18n.text(this.language, `原因：${item.reason}`, `Reason: ${item.reason}`)).fontSize(14).width('100%');
          if (item.description) Text(item.description).fontSize(13).lineHeight(21)
            .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          Text(I18n.text(this.language,
            `申请时间：${item.createdAt.replace('T', ' ').slice(0, 19)}`,
            `Submitted: ${item.createdAt.replace('T', ' ').slice(0, 19)}`))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode))
          .borderRadius(DesignTokens.RADIUS_LARGE);

        if (item.evidence.length > 0) {
          Column({ space: 10 }) {
            Text(I18n.text(this.language, '凭证图片', 'Evidence images')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
            Flex({ wrap: FlexWrap.Wrap }) {
              ForEach(item.evidence, (url: string) => {
                ResilientRemoteImage({ originalUrl: url, widthValue: 80, heightValue: 80, radius: 10 })
                  .margin({ right: 8, bottom: 8 })
                  .onClick(() => IBestImagePreview.show(item.evidence, {
                    closeOnClickImage: false, closeOnClickOverlay: true
                  }));
              }, (url: string) => url);
            }.width('100%');
          }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
        }

        if (item.order) {
          Column({ space: 8 }) {
            Text(I18n.text(this.language, '关联订单', 'Related order')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
            if (item.orderItem) {
              OrderProductSummary({ item: item.orderItem });
            }
            Text(I18n.text(this.language, `订单号 ${item.order.no}`, `Order ${item.order.no}`)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
            Text(I18n.text(this.language, `实付 ¥${item.order.payAmount.toFixed(2)}`, `Paid ¥${item.order.payAmount.toFixed(2)}`)).fontSize(14).width('100%');
            IBestButton({
              text: I18n.text(this.language, '查看订单详情', 'View order'), plain: true, color: DesignTokens.brand(this.darkMode), btnWidth: '100%',
              onBtnClick: () => AppRouter.push('OrderDetail', new IdRouteParams(item.orderId))
            });
          }.width('100%').alignItems(HorizontalAlign.Start).padding(16).backgroundColor(DesignTokens.card(this.darkMode))
            .borderRadius(DesignTokens.RADIUS_LARGE);
        }
        if (item.merchantReply || item.refundAmount !== undefined) {
          Column({ space: 8 }) {
            Text(I18n.text(this.language, '处理记录', 'Processing record')).width('100%').fontSize(16)
              .fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
            if (item.merchantReply) {
              Text(item.merchantReply).width('100%').wordBreak(WordBreak.BREAK_ALL)
                .fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            }
            if (item.refundAmount !== undefined) {
              Text(I18n.text(this.language, `退款金额 ¥${item.refundAmount.toFixed(2)}`, `Refund amount ¥${item.refundAmount.toFixed(2)}`))
                .width('100%').wordBreak(WordBreak.BREAK_ALL).fontSize(14).fontColor(DesignTokens.text(this.darkMode));
            }
          }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
        }
      }.width('100%').constraintSize({ maxWidth: 960 }).padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + (item.status === 'pending' ? 104 : 24) });
    }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({
            title: I18n.text(this.language, '售后详情', 'After-sales details'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
            onLeftClick: () => AppRouter.back()
          });
          if (this.loading && !this.item) {
            Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
              .layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.item) {
            this.detail(this.item);
          } else {
            Column({ space: 12 }) {
              Text(I18n.text(this.language, '售后记录不存在或无权访问', 'This request does not exist or is not accessible')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
              IBestButton({ text: I18n.text(this.language, '返回', 'Back'), plain: true, onBtnClick: () => AppRouter.back() });
              IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), plain: true,
                color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.load() });
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));

        if (this.item?.status === 'pending' && !this.editorVisible) {
          Row({ space: 10 }) {
            IBestButton({ text: I18n.text(this.language, '驳回', 'Reject'), plain: true, type: 'danger', btnWidth: '48%', onBtnClick: () => this.open('reject') });
            IBestButton({ text: I18n.text(this.language, '同意退款', 'Approve refund'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', onBtnClick: () => this.open('agree') });
          }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 12 })
            .backgroundColor(DesignTokens.card(this.darkMode)).border({ width: { top: 1 }, color: DesignTokens.border(this.darkMode) });
        }

        if (this.editorVisible) {
          Column().width('100%').height('100%').backgroundColor('#99000000')
            .onClick(() => { if (!this.submitting) this.editorVisible = false; });
          Scroll() {
          Column({ space: 14 }) {
            Text(this.action === 'agree'
              ? I18n.text(this.language, '确认退款', 'Confirm refund')
              : I18n.text(this.language, '驳回售后', 'Reject request')).fontSize(20).fontWeight(FontWeight.Bold);
            if (this.action === 'agree') {
              IBestField({ value: $refundAmount, label: I18n.text(this.language, '退款金额', 'Refund amount'), type: 'decimal', placeholder: I18n.text(this.language, '请输入退款金额', 'Enter the refund amount') });
            } else {
              IBestField({ value: $rejectReason, label: I18n.text(this.language, '驳回原因', 'Rejection reason'), placeholder: I18n.text(this.language, '请输入具体原因', 'Enter a specific reason') });
            }
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.submitting, onBtnClick: () => this.editorVisible = false });
              IBestButton({
                text: I18n.text(this.language, '确定', 'Confirm'), type: this.action === 'agree' ? 'primary' : 'danger',
                color: this.action === 'agree' ? DesignTokens.brand(this.darkMode) : DesignTokens.danger(this.darkMode), btnWidth: '48%',
                loading: this.submitting, disabled: this.submitting, onBtnClick: () => this.submit()
              });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 })
            .backgroundColor(DesignTokens.card(this.darkMode));
          }.width('100%').constraintSize({ maxHeight: '80%', maxWidth: 720 }).align(Alignment.Top)
            .borderRadius({ topLeft: DesignTokens.RADIUS_XL, topRight: DesignTokens.RADIUS_XL }).clip(true);
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onBackPressed((): boolean => {
      if (!this.editorVisible) return false;
      if (!this.submitting) this.editorVisible = false;
      return true;
    });
  }
}
