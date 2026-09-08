import { PageResult } from '../product/ProductModels';

export { PageResult };

export interface OrderAddress {
  name: string;
  phone: string;
  region: string;
  detail: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  specsLabel: string;
  unitPrice: number;
  quantity: number;
}

export interface OrderSummary {
  id: string;
  no: string;
  status: string;
  totalAmount: number;
  discountAmount: number;
  shippingFee: number;
  payAmount: number;
  shippingMethod: string;
  address: OrderAddress;
  remark?: string;
  trackingNumber?: string;
  trackingCompany?: string;
  paidAt?: string;
  shippedAt?: string;
  createdAt: string;
  items?: OrderItem[];
}

export interface ShipOrderRequest {
  company: string;
  trackingNumber: string;
}

export interface ParseAddressRequest {
  text: string;
}

export interface ParsedAddress {
  name?: string;
  phone?: string;
  region?: string;
  detail?: string;
}

export interface RefundSummary {
  id: string;
  no: string;
  orderId: string;
  type: string;
  reason: string;
  description?: string;
  evidence: string[];
  applyAmount: number;
  refundAmount?: number;
  status: string;
  merchantReply?: string;
  createdAt: string;
  order?: OrderSummary;
  orderItem?: OrderItem;
}

export interface AgreeRefundRequest {
  refundAmount?: number;
}

export interface RejectRefundRequest {
  reason: string;
}

export interface OrderShareRequest {
  visibleFields: string[];
  expiresInDays: number;
  intro: string;
}

export interface OrderShareResult {
  shareCode: string;
  orderNo: string;
  expiresAt?: string;
  visibleFields: string[];
  intro?: string;
}

export interface OrderShareConfig {
  orderId: string;
  merchantId: string;
  visibleFields: string[];
  expiresAt?: string;
  intro?: string;
  viewCount: number;
  revoked: boolean;
  createdAt: string;
}

export interface CurrentOrderShare {
  shareCode: string;
  config: OrderShareConfig;
}
