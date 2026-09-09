import { MerchantIconName } from '../../core/theme/MerchantIcon';
import { OrderAddress, OrderSummary, ParsedAddress } from './OrderModels';

export class OrderStatusCopy {
  zh: string;
  en: string;
  hintZh: string;
  hintEn: string;
  icon: MerchantIconName;
  constructor(zh: string, en: string, hintZh: string, hintEn: string, icon: MerchantIconName) {
    this.zh = zh; this.en = en; this.hintZh = hintZh; this.hintEn = hintEn; this.icon = icon;
  }
}

export class OrderDetailPolicy {
  static status(value: string): OrderStatusCopy {
    switch (value) {
      case 'pending_payment': return new OrderStatusCopy('等待付款', 'Awaiting payment', '客户付款后，即可安排发货', 'Shipping becomes available after payment.', 'clock-o');
      case 'pending_shipment': return new OrderStatusCopy('等待发货', 'Ready to ship', '核对商品与收货信息后，填写物流单号', 'Check the items and address before adding tracking.', 'tosend');
      case 'shipped': return new OrderStatusCopy('已发货', 'Shipped', '物流单号已记录，请留意配送进度', 'Tracking is recorded. Follow the delivery progress.', 'tosend');
      case 'completed': return new OrderStatusCopy('交易完成', 'Completed', '订单已完成，详情与记录可随时查看', 'Order completed. Details remain available.', 'success');
      case 'cancelled': return new OrderStatusCopy('订单已取消', 'Cancelled', '此订单已关闭，无需安排发货', 'This order is closed. No shipment is required.', 'cross');
      case 'after_sale': return new OrderStatusCopy('售后处理中', 'After-sales in progress', '请在售后管理中查看具体申请与处理进度', 'View requests and progress in After-sales.', 'refund-o');
      case 'refunded': return new OrderStatusCopy('已退款', 'Refunded', '订单退款已处理，以下保留原订单金额', 'Refund processed. Original order amounts are shown below.', 'refund-o');
      default: return new OrderStatusCopy('订单处理中', 'Processing', '以最新订单信息为准', 'Refer to the latest order information.', 'orders-o');
    }
  }
  static canShip(order: OrderSummary | null): boolean { return order?.status === 'pending_shipment'; }
  static money(value: number | undefined): string { return typeof value === 'number' && Number.isFinite(value) ? `¥${value.toFixed(2)}` : '—'; }
  static amountTitle(order: OrderSummary, english: boolean): string {
    if (order.status === 'pending_payment') return english ? 'Amount due' : '应付金额';
    return order.paidAt ? (english ? 'Payment amount' : '付款金额') : (english ? 'Order amount' : '订单金额');
  }
  static addressText(value: OrderAddress | ParsedAddress | null | undefined): string {
    if (!value) return '';
    return [value.name, value.phone, value.region, value.detail].filter((part: string | undefined): boolean => !!part?.trim()).join(' ');
  }
  static timestamp(value: string | undefined): string {
    if (!value) return '—';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}-${`${date.getDate()}`.padStart(2, '0')} ${`${date.getHours()}`.padStart(2, '0')}:${`${date.getMinutes()}`.padStart(2, '0')}`;
  }
  static shareError(fields: string[], days: string, intro: string): string {
    if (!fields.length) return 'fields';
    const duration = Number(days);
    if (!days.trim() || !Number.isInteger(duration) || duration < 0 || duration > 365) return 'days';
    return intro.trim().length > 40 ? 'intro' : '';
  }
}

// Both page identity and channel generation must match before publishing an async response.
export class OrderDetailRequests {
  private active: boolean = true;
  private generations: Map<string, number> = new Map<string, number>();
  next(channel: string): number {
    const generation = (this.generations.get(channel) || 0) + 1;
    this.generations.set(channel, generation); return generation;
  }
  current(channel: string, generation: number): boolean { return this.active && this.generations.get(channel) === generation; }
  close(): void { this.active = false; this.generations.clear(); }
}
