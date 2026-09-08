export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ProductSummary {
  id: string;
  name: string;
  images: string[];
  status: string;
  priceRetailMin: number;
  priceRetailMax: number;
  totalStock: number;
  sales: number;
  rejectReason?: string;
  updatedAt: string;
}

export interface PriceDisplayRule {
  guestVisible: boolean;
  customerTier: string;
  storeTier: string;
  memberTier: string;
}

export interface ProductSku {
  id?: string;
  specs?: Record<string, string>;
  specValues?: string[];
  specsLabel: string;
  image?: string;
  priceWholesale: number;
  priceRetail: number;
  priceMember: number;
  stock: number;
  active: boolean;
}

export interface ProductSpecGroup {
  name: string;
  values: string[];
}

export interface ProductDetail extends ProductSummary {
  categoryId: string;
  merchantCategoryId?: string;
  description?: string;
  detailImages?: string[];
  tags?: string[];
  shipping: string[];
  priceDisplayRules?: PriceDisplayRule;
  skus?: ProductSku[];
  pricingMode?: string;
  pricePerSqm?: number;
  minLength?: number;
  minWidth?: number;
  maxLength?: number;
  maxWidth?: number;
  baseFee?: number;
  sizeUnit?: string;
}

export interface ProductMutation {
  categoryId: string;
  merchantCategoryId?: string;
  name: string;
  description: string;
  images: string[];
  detailImages: string[];
  tags?: string[];
  shipping: string[];
  priceDisplayRules?: PriceDisplayRule;
  skus: ProductSku[];
  pricingMode: string;
  pricePerSqm?: number;
  minLength?: number;
  minWidth?: number;
  maxLength?: number;
  maxWidth?: number;
  baseFee?: number;
  sizeUnit?: string;
  status: string;
}

export interface ProductBatchRequest {
  ids: string[];
}

export interface CategoryItem {
  id: string;
  parentId?: string;
  name: string;
  icon?: string;
  sort: number;
  type: string;
  children?: CategoryItem[];
}

export interface CategoryMutation {
  name: string;
  parentId?: string;
  sort?: number;
}

export interface CategorySortRequest {
  ids: string[];
}
