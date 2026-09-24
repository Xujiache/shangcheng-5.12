import { PageResult } from '../product/ProductModels';

export { PageResult };

export interface MerchantCustomer {
  id: string;
  nickname: string;
  avatar: string;
  phone: string;
  kind: string;
  priceTier: string;
  orderCount: number;
  totalSpent: number;
  lastOrderAt?: string | null;
  priceAuthorized: boolean;
  commissionEnabled: boolean;
  groupTag?: string;
  blocked: boolean;
}

export interface PriceTierRequest { priceTier: string; }
export interface ToggleRequest { on: boolean; }
export interface ActiveRequest { active: boolean; }

export interface CommissionDefaultRule {
  level1Percent: number;
  level2Percent: number;
  visibleToPromoter: boolean;
  allowOffline: boolean;
  enabled: boolean;
}

export interface ProductCommissionRule {
  productId: string;
  productName: string;
  productImage: string;
  level1Percent: number;
  level2Percent: number;
}

export interface CommissionRuleBundle {
  default: CommissionDefaultRule;
  productRules: ProductCommissionRule[];
}

export interface StoreItem {
  id: string;
  name: string;
  contact: string;
  phone: string;
  region: string;
  address: string;
  level: string;
  status: string;
  latitude?: number;
  longitude?: number;
  authValidFrom?: string | null;
  authValidTo?: string | null;
}

export interface ProductPolicy {
  categoryId: string;
  categoryName?: string;
  enabled: boolean;
  markupPercent: number;
}

export interface StoreAuthConfig {
  storeId: string;
  level: string;
  visiblePriceTiers: string[];
  productPolicies: ProductPolicy[];
  authValidFrom: string;
  authValidTo: string;
}

export interface StaffItem {
  id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  permissions: string[];
  monthlyPerformance?: number;
}

export interface StaffMutation {
  name: string;
  phone: string;
  role: string;
  status: string;
  permissions: string[];
}

export interface BannerItem { image: string; link?: string; }
export interface ShopDecorate {
  merchantId: string;
  themeColor: string;
  fontStyle: string;
  banners: BannerItem[];
  productLayout: string;
}

export interface MarketingCount { total: number; active: number; totalReceived?: number; totalUsed?: number; planned?: number; sold?: number; }
export interface MarketingOverview { coupons: MarketingCount; flashSales: MarketingCount; groupBuys: MarketingCount; }

export interface MarketingActivity {
  id: string;
  kind: string;
  name: string;
  status: string;
  productId?: string;
  productImage?: string;
  price?: number;
  stock?: number;
  sold?: number;
  groupSize?: number;
  validHours?: number;
  validFrom?: string;
  validTo?: string;
  createdAt: string;
}

export interface MarketingCoupon {
  id: string;
  name: string;
  type: string;
  amount?: number;
  discountPercent?: number;
  threshold?: number;
  stock: number;
  received: number;
  used: number;
  validFrom: string;
  validTo: string;
  perUserLimit: number;
  scope: string;
  status: string;
}

export interface CouponMutation {
  name: string;
  type: string;
  amount?: number;
  discountPercent?: number;
  threshold?: number;
  stock: number;
  validFrom: string;
  validTo: string;
  perUserLimit: number;
  scope: string;
}

export interface ChatLastMessage { content: string; type: string; sender: string; createdAt: string; }
export interface ChatSession {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  lastMessage?: ChatLastMessage | null;
  lastMessageAt: string;
  unreadCount: number;
  status: string;
  online: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  sender: string;
  type: string;
  content: string;
  createdAt: string;
  read: boolean;
  sendState?: string;
}

export interface QuickReply { id: string; label: string; content: string; }
export interface SendMessageRequest { type: string; content: string; }

export interface PlazaProduct {
  productId: string;
  productName: string;
  productImage: string;
  productImageThumb?: string;
  factoryName: string;
  factoryId: string;
  startPrice: number;
  agencyCount: number;
  tags?: string[];
  isPlatformPushed?: boolean;
  suggestMarkupMin?: number;
  suggestMarkupMax?: number;
  suggestCommission?: number;
}

export interface PlazaFactory {
  id: string;
  name: string;
  logo: string;
  logoThumb?: string;
  region: string;
  categories: string[];
  gmv: number;
  rating: number;
  ratingCount: number;
  years?: number;
  productCount?: number;
  agencyCount?: number;
  tags: string[];
  banner?: string;
  address?: string;
  monthGmv?: number;
  desc?: string;
  contactName?: string;
  contactPhone?: string;
  contact?: PlazaFactoryContact;
  qualifications?: PlazaQualification[];
  followed?: boolean;
}

export interface FollowRequest { on: boolean; }
export interface PlazaFactoryContact {
  contactName: string;
  phone: string;
  wechat: string;
  email: string;
  address: string;
  workTime: string;
}
export interface PlazaQualification { id: string; name: string; image: string; }
export interface FactoryRateRequest { score: number; }
export interface FactoryRateResult { ok: boolean; rating: number; ratingCount: number; }
export interface PlazaVisibility { scope: string; }
export interface PlazaVisibilityRequest { scope: string; }
export interface PlazaFilterOption { value: string; label: string; }
export interface PlazaFilterOptions {
  productTags: PlazaFilterOption[];
  regions: PlazaFilterOption[];
  categories: PlazaFilterOption[];
  ratingOptions: PlazaFilterOption[];
}
export interface AgencyRequest { factoryId: string; productIds: string[]; markupPercent: number; autoSyncPrice: boolean; message?: string; }

export interface AgencyApplication {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  factoryId: string;
  factoryName: string;
  factoryPrice: number;
  myRetailPrice: number;
  markupRatio: number;
  syncStatus: string;
  status: string;
  appliedAt: string;
}

export interface AgencyMutation {
  myRetailPrice?: number;
  markupRatio?: number;
  status?: string;
}

export interface MerchantProfile {
  shopName: string;
  merchantNo: string;
  contactName: string;
  contactPhone: string;
  email: string;
  categories: string[];
  address: string;
  description: string;
  avatar?: string;
  rating?: number;
  ratingCount?: number;
  legalName?: string;
  creditCode?: string;
  region?: string;
  level?: string;
  status?: string;
  type?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ProfileMutation {
  shopName: string;
  contactName: string;
  contactPhone: string;
  email: string;
  categories: string[];
  address: string;
  description: string;
  avatar?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
}

export interface ShopPriceRule {
  guestAllow: boolean;
  customerPrice: string;
  agencyPrice: string;
  memberPrice: string;
}

export interface MemberPlan {
  id: string;
  code: string;
  name: string;
  type: string;
  price: number;
  originalPrice?: number;
  period: string;
  periodCount: number;
  rights: string[];
  constraints?: Record<string, number>;
  trialDays?: number;
  hot?: boolean;
  huaweiProductId?: string;
  huaweiProductType?: string;
  status: string;
}

export interface MembershipInfo {
  id: string;
  planId: string;
  planCode: string;
  startAt: string;
  endAt: string;
  status: string;
  autoRenew: boolean;
  plan?: MemberPlan;
}

export interface UsageQuota {
  pushSlotsLimit: number; pushSlotsUsed: number; bannerLimit: number; bannerUsed: number;
  impressionLimit: number; impressionUsed: number; periodStart: string; periodEnd: string;
}

export interface MembershipNotice {
  type: string;
  text: string;
  link?: string;
}

export interface PaymentRecord { id: string; no: string; planName: string; amount: number; paymentMethod: string; status: string; paidAt?: string; createdAt: string; }

export interface IapPrepareRequest { planId: string; }
export interface IapPrepareResult { orderNo: string; productId: string; productType: string; developerPayload: string; }
export interface IapVerifyRequest { orderNo: string; purchaseData: string; }
export interface IapRestoreRequest { productType: string; purchaseData: string; }
export interface IapVerifyResult {
  ok: boolean;
  membership?: MembershipInfo | null;
  alreadyActivated?: boolean;
  purchaseToken?: string;
  purchaseOrderId?: string;
  productType?: string;
}
