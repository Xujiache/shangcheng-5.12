import { AppConfig } from '../../core/config/AppConfig';
import { EmptyResult } from '../../core/model/ApiModels';
import { ApiClient } from '../../core/network/ApiClient';
import { withQuery } from '../../core/network/QueryString';
import {
  AgreeRefundRequest,
  CurrentOrderShare,
  OrderSummary,
  OrderShareRequest,
  OrderShareResult,
  PageResult,
  ParseAddressRequest,
  ParsedAddress,
  RefundSummary,
  RejectRefundRequest,
  ShipOrderRequest
} from './OrderModels';

export class OrderRepository {
  static list(status: string, keyword: string, page: number, pageSize: number = 20): Promise<PageResult<OrderSummary>> {
    return ApiClient.get<PageResult<OrderSummary>>(withQuery(`${AppConfig.API_PREFIX}/m/orders`, [
      { name: 'status', value: status },
      { name: 'keyword', value: keyword },
      { name: 'page', value: page },
      { name: 'pageSize', value: pageSize }
    ]));
  }

  static detail(id: string): Promise<OrderSummary> {
    return ApiClient.get<OrderSummary>(`${AppConfig.API_PREFIX}/m/orders/${id}`);
  }

  static ship(id: string, body: ShipOrderRequest): Promise<EmptyResult> {
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/orders/${id}/ship`, body);
  }

  static parseAddress(text: string): Promise<ParsedAddress> {
    const body: ParseAddressRequest = { text };
    return ApiClient.post<ParsedAddress>(`${AppConfig.API_PREFIX}/m/orders/parse-address`, body);
  }

  static createShare(id: string, body: OrderShareRequest): Promise<OrderShareResult> {
    return ApiClient.post<OrderShareResult>(`${AppConfig.API_PREFIX}/m/orders/${id}/share`, body);
  }

  static currentShare(id: string): Promise<CurrentOrderShare | null> {
    return ApiClient.get<CurrentOrderShare | null>(`${AppConfig.API_PREFIX}/m/orders/${id}/share/current`);
  }

  static revokeShare(id: string): Promise<EmptyResult> {
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/orders/${id}/share/revoke`);
  }

  static refunds(status: string, page: number, pageSize: number = 20): Promise<PageResult<RefundSummary>> {
    return ApiClient.get<PageResult<RefundSummary>>(withQuery(`${AppConfig.API_PREFIX}/m/refunds`, [
      { name: 'status', value: status },
      { name: 'page', value: page },
      { name: 'pageSize', value: pageSize }
    ]));
  }

  static refundDetail(id: string): Promise<RefundSummary> {
    return ApiClient.get<RefundSummary>(`${AppConfig.API_PREFIX}/m/refunds/${id}`);
  }

  static agreeRefund(id: string, refundAmount?: number): Promise<EmptyResult> {
    const body: AgreeRefundRequest = { refundAmount };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/refunds/${id}/agree`, body);
  }

  static rejectRefund(id: string, reason: string): Promise<EmptyResult> {
    const body: RejectRefundRequest = { reason };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/refunds/${id}/reject`, body);
  }
}
