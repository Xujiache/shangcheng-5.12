import { AppConfig } from '../../core/config/AppConfig';
import { EmptyResult } from '../../core/model/ApiModels';
import { ApiClient } from '../../core/network/ApiClient';
import { withQuery } from '../../core/network/QueryString';
import {
  ActiveRequest, AgencyApplication, AgencyMutation, AgencyRequest, ChatMessage, ChatSession, CommissionRuleBundle, CouponMutation,
  FactoryRateRequest, FactoryRateResult, FollowRequest, IapPrepareRequest, IapPrepareResult, IapRestoreRequest, IapVerifyRequest, IapVerifyResult, MarketingActivity, MarketingCoupon, MarketingOverview, MemberPlan, MembershipInfo, MembershipNotice, MerchantCustomer,
  MerchantProfile, PageResult, PaymentRecord, PlazaFactory, PlazaProduct, PriceTierRequest, ProfileMutation,
  PlazaFilterOptions, PlazaVisibility, PlazaVisibilityRequest,
  QuickReply, SendMessageRequest, ShopDecorate, ShopPriceRule, StaffItem, StaffMutation, StoreAuthConfig,
  StoreItem, ToggleRequest, UsageQuota
} from './BusinessModels';

export class BusinessRepository {
  static customers(kind: string, keyword: string, page: number): Promise<PageResult<MerchantCustomer>> {
    return ApiClient.get<PageResult<MerchantCustomer>>(withQuery(`${AppConfig.API_PREFIX}/m/customers`, [
      { name: 'kind', value: kind }, { name: 'keyword', value: keyword }, { name: 'page', value: page }, { name: 'pageSize', value: 20 }
    ]));
  }
  static setCustomerTier(id: string, priceTier: string): Promise<EmptyResult> { const body: PriceTierRequest = { priceTier }; return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/customers/${id}/price-tier`, body); }
  static authorizeCustomer(id: string, on: boolean): Promise<EmptyResult> { const body: ToggleRequest = { on }; return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/customers/${id}/authorize`, body); }
  static setCustomerBlacklist(id: string, on: boolean): Promise<EmptyResult> { const body: ToggleRequest = { on }; return ApiClient.patch<EmptyResult>(`${AppConfig.API_PREFIX}/m/customers/${id}/blacklist`, body); }
  static commissionRules(): Promise<CommissionRuleBundle> { return ApiClient.get<CommissionRuleBundle>(`${AppConfig.API_PREFIX}/m/commission/rules`); }
  static saveCommissionRules(body: CommissionRuleBundle): Promise<EmptyResult> { return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/commission/rules`, body); }

  static stores(keyword: string, page: number, pageSize: number = 100): Promise<PageResult<StoreItem>> { return ApiClient.get<PageResult<StoreItem>>(withQuery(`${AppConfig.API_PREFIX}/m/stores`, [{ name: 'keyword', value: keyword }, { name: 'page', value: page }, { name: 'pageSize', value: pageSize }])); }
  static storeAuth(id: string): Promise<StoreAuthConfig> { return ApiClient.get<StoreAuthConfig>(`${AppConfig.API_PREFIX}/m/stores/${id}/auth`); }
  static saveStoreAuth(id: string, body: StoreAuthConfig): Promise<EmptyResult> { return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/stores/${id}/auth`, body); }
  static deleteStore(id: string): Promise<EmptyResult> { return ApiClient.delete<EmptyResult>(`${AppConfig.API_PREFIX}/m/stores/${id}`); }

  static staffs(keyword: string, page: number, pageSize: number = 100): Promise<PageResult<StaffItem>> { return ApiClient.get<PageResult<StaffItem>>(withQuery(`${AppConfig.API_PREFIX}/m/staffs`, [{ name: 'keyword', value: keyword }, { name: 'page', value: page }, { name: 'pageSize', value: pageSize }])); }
  static createStaff(body: StaffMutation): Promise<StaffItem> { return ApiClient.post<StaffItem>(`${AppConfig.API_PREFIX}/m/staffs`, body); }
  static updateStaff(id: string, body: StaffMutation): Promise<StaffItem> { return ApiClient.put<StaffItem>(`${AppConfig.API_PREFIX}/m/staffs/${id}`, body); }

  static decorate(): Promise<ShopDecorate> { return ApiClient.get<ShopDecorate>(`${AppConfig.API_PREFIX}/m/shop/decorate`); }
  static saveDecorate(body: ShopDecorate): Promise<ShopDecorate> { return ApiClient.post<ShopDecorate>(`${AppConfig.API_PREFIX}/m/shop/decorate`, body); }
  static marketingOverview(): Promise<MarketingOverview> { return ApiClient.get<MarketingOverview>(`${AppConfig.API_PREFIX}/m/marketing/overview`); }
  static marketingActivities(kind: string, status: string = ''): Promise<PageResult<MarketingActivity>> { return ApiClient.get<PageResult<MarketingActivity>>(withQuery(`${AppConfig.API_PREFIX}/m/marketing/activities`, [{ name: 'kind', value: kind }, { name: 'status', value: status }, { name: 'page', value: 1 }, { name: 'pageSize', value: 100 }])); }
  static coupons(status: string, page: number): Promise<PageResult<MarketingCoupon>> { return ApiClient.get<PageResult<MarketingCoupon>>(withQuery(`${AppConfig.API_PREFIX}/m/marketing/coupons`, [{ name: 'status', value: status }, { name: 'page', value: page }, { name: 'pageSize', value: 20 }])); }
  static createCoupon(body: CouponMutation): Promise<MarketingCoupon> { return ApiClient.post<MarketingCoupon>(`${AppConfig.API_PREFIX}/m/marketing/coupons`, body); }
  static updateCoupon(id: string, body: CouponMutation): Promise<MarketingCoupon> { return ApiClient.put<MarketingCoupon>(`${AppConfig.API_PREFIX}/m/marketing/coupons/${id}`, body); }
  static deleteCoupon(id: string): Promise<EmptyResult> { return ApiClient.delete<EmptyResult>(`${AppConfig.API_PREFIX}/m/marketing/coupons/${id}`); }
  static toggleCoupon(id: string, active: boolean): Promise<EmptyResult> { const body: ActiveRequest = { active }; return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/marketing/coupons/${id}/toggle`, body); }

  static chatSessions(): Promise<ChatSession[]> { return ApiClient.get<ChatSession[]>(`${AppConfig.API_PREFIX}/m/chat/sessions`); }
  static chatSession(id: string): Promise<ChatSession> { return ApiClient.get<ChatSession>(`${AppConfig.API_PREFIX}/m/chat/sessions/${id}`); }
  static chatMessages(id: string, cursor: string = ''): Promise<ChatMessage[]> { return ApiClient.get<ChatMessage[]>(withQuery(`${AppConfig.API_PREFIX}/m/chat/sessions/${id}/messages`, [{ name: 'cursor', value: cursor }, { name: 'pageSize', value: 30 }])); }
  static quickReplies(): Promise<QuickReply[]> { return ApiClient.get<QuickReply[]>(`${AppConfig.API_PREFIX}/m/chat/quick-replies`); }
  static sendMessage(id: string, body: SendMessageRequest): Promise<ChatMessage> { return ApiClient.post<ChatMessage>(`${AppConfig.API_PREFIX}/m/chat/sessions/${id}/messages`, body); }
  static markRead(id: string): Promise<EmptyResult> { return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/chat/sessions/${id}/read`); }

  static plazaProducts(keyword: string, page: number, factoryId: string = '', tags: string = ''): Promise<PageResult<PlazaProduct>> { return ApiClient.get<PageResult<PlazaProduct>>(withQuery(`${AppConfig.API_PREFIX}/m/plaza/products`, [{ name: 'keyword', value: keyword }, { name: 'factoryId', value: factoryId }, { name: 'tags', value: tags }, { name: 'page', value: page }, { name: 'pageSize', value: 20 }])); }
  static plazaFactories(keyword: string, region: string = '', category: string = '', minRating: number = 0): Promise<PlazaFactory[]> { return ApiClient.get<PlazaFactory[]>(withQuery(`${AppConfig.API_PREFIX}/m/plaza/factories`, [{ name: 'keyword', value: keyword }, { name: 'region', value: region }, { name: 'category', value: category }, { name: 'minRating', value: minRating }])); }
  static plazaFilterOptions(): Promise<PlazaFilterOptions> { return ApiClient.get<PlazaFilterOptions>(`${AppConfig.API_PREFIX}/m/plaza/filter-options`); }
  static plazaFactory(id: string): Promise<PlazaFactory> { return ApiClient.get<PlazaFactory>(`${AppConfig.API_PREFIX}/m/plaza/factories/${id}`); }
  static followFactory(id: string, on: boolean): Promise<EmptyResult> { const body: FollowRequest = { on }; return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/plaza/factories/${id}/follow`, body); }
  static rateFactory(id: string, score: number): Promise<FactoryRateResult> { const body: FactoryRateRequest = { score }; return ApiClient.post<FactoryRateResult>(`${AppConfig.API_PREFIX}/m/plaza/factories/${id}/rate`, body); }
  static plazaVisibility(): Promise<PlazaVisibility> { return ApiClient.get<PlazaVisibility>(`${AppConfig.API_PREFIX}/m/plaza/visibility`); }
  static savePlazaVisibility(scope: string): Promise<PlazaVisibility> { const body: PlazaVisibilityRequest = { scope }; return ApiClient.put<PlazaVisibility>(`${AppConfig.API_PREFIX}/m/plaza/visibility`, body); }
  static applyAgency(body: AgencyRequest): Promise<EmptyResult> { return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/plaza/agency`, body); }
  static agencyApplications(status: string): Promise<AgencyApplication[]> { return ApiClient.get<AgencyApplication[]>(withQuery(`${AppConfig.API_PREFIX}/m/plaza/applications`, [{ name: 'status', value: status }])); }
  static updateAgencyApplication(id: string, body: AgencyMutation): Promise<EmptyResult> { return ApiClient.patch<EmptyResult>(`${AppConfig.API_PREFIX}/m/plaza/applications/${id}`, body); }
  static cancelAgencyApplication(id: string): Promise<EmptyResult> { return ApiClient.delete<EmptyResult>(`${AppConfig.API_PREFIX}/m/plaza/applications/${id}`); }

  static profile(): Promise<MerchantProfile> { return ApiClient.get<MerchantProfile>(`${AppConfig.API_PREFIX}/m/profile`); }
  static saveProfile(body: ProfileMutation): Promise<MerchantProfile> { return ApiClient.patch<MerchantProfile>(`${AppConfig.API_PREFIX}/m/profile`, body); }
  static priceRule(): Promise<ShopPriceRule> { return ApiClient.get<ShopPriceRule>(`${AppConfig.API_PREFIX}/m/shop/price-rule`); }
  static savePriceRule(body: ShopPriceRule): Promise<ShopPriceRule> { return ApiClient.put<ShopPriceRule>(`${AppConfig.API_PREFIX}/m/shop/price-rule`, body); }
  static memberPlans(): Promise<MemberPlan[]> { return ApiClient.get<MemberPlan[]>(`${AppConfig.API_PREFIX}/m/membership/plans`); }
  static membership(): Promise<MembershipInfo | null> { return ApiClient.get<MembershipInfo | null>(`${AppConfig.API_PREFIX}/m/membership`); }
  static quota(): Promise<UsageQuota> { return ApiClient.get<UsageQuota>(`${AppConfig.API_PREFIX}/m/membership/quota`); }
  static payments(): Promise<PaymentRecord[]> { return ApiClient.get<PaymentRecord[]>(`${AppConfig.API_PREFIX}/m/membership/payments`); }
  static membershipNotices(): Promise<MembershipNotice[]> { return ApiClient.get<MembershipNotice[]>(`${AppConfig.API_PREFIX}/m/membership/notices`); }
  static prepareIap(planId: string): Promise<IapPrepareResult> { const body: IapPrepareRequest = { planId }; return ApiClient.post<IapPrepareResult>(`${AppConfig.API_PREFIX}/m/membership/iap/prepare`, body); }
  static verifyIap(orderNo: string, purchaseData: string): Promise<IapVerifyResult> { const body: IapVerifyRequest = { orderNo, purchaseData }; return ApiClient.post<IapVerifyResult>(`${AppConfig.API_PREFIX}/m/membership/iap/verify`, body); }
  static restoreIap(productType: string, purchaseData: string): Promise<IapVerifyResult> { const body: IapRestoreRequest = { productType, purchaseData }; return ApiClient.post<IapVerifyResult>(`${AppConfig.API_PREFIX}/m/membership/iap/restore`, body); }
}
