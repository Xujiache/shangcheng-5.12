/**
 * 商品 / 分类 服务
 */
import { http } from '../utils/request'
import type { Product, Category, ProductCreateDto, Pagination } from '@jiujiu/shared/types'

export type MerchantProductPayload = Omit<ProductCreateDto, 'priceDisplayRules'> &
  Partial<Pick<ProductCreateDto, 'priceDisplayRules'>> & {
    pricingMode?: 'standard' | 'by-size'
    pricePerSqm?: number
    minLength?: number
    minWidth?: number
    maxLength?: number
    maxWidth?: number
    baseFee?: number
    sizeUnit?: 'cm' | 'm'
    status?: 'draft' | 'auditing'
  }

export const productService = {
  list(params: { status?: string; keyword?: string; page?: number; pageSize?: number } = {}) {
    return http.get<Pagination<Product>>('/api/v1/m/products', params)
  },
  detail(id: string) {
    return http.get<Product>(`/api/v1/m/products/${id}`)
  },
  create(dto: MerchantProductPayload) {
    return http.post<Product>('/api/v1/m/products', dto)
  },
  update(id: string, dto: Partial<MerchantProductPayload>) {
    return http.put<Product>(`/api/v1/m/products/${id}`, dto)
  },
  batchOffline(ids: string[]) {
    return http.post<{ ok: boolean }>('/api/v1/m/products/batch-offline', { ids })
  },
  batchOnline(ids: string[]) {
    return http.post<{ ok: boolean }>('/api/v1/m/products/batch-online', { ids })
  },
  batchDelete(ids: string[]) {
    return http.post<{ ok: boolean }>('/api/v1/m/products/batch-delete', { ids })
  },
}

export const categoryService = {
  /** 平台分类 */
  platformList() {
    return http.get<Category[]>('/api/v1/u/categories')
  },
  /** 厂家自定义分类 */
  merchantList() {
    return http.get<Category[]>('/api/v1/m/categories')
  },
  create(dto: Partial<Category>) {
    return http.post<Category>('/api/v1/m/categories', dto)
  },
  update(id: string, dto: Partial<Category>) {
    return http.put<Category>(`/api/v1/m/categories/${id}`, dto)
  },
  remove(id: string) {
    return http.del<{ ok: boolean }>(`/api/v1/m/categories/${id}`)
  },
  sort(ids: string[]) {
    return http.post<{ ok: boolean }>('/api/v1/m/categories/sort', { ids })
  },
}
