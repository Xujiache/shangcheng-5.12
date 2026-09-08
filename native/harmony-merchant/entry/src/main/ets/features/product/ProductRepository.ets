import { AppConfig } from '../../core/config/AppConfig';
import { EmptyResult } from '../../core/model/ApiModels';
import { ApiClient } from '../../core/network/ApiClient';
import { withQuery } from '../../core/network/QueryString';
import {
  CategoryItem,
  CategoryMutation,
  CategorySortRequest,
  PageResult,
  ProductBatchRequest,
  ProductDetail,
  ProductMutation,
  ProductSummary
} from './ProductModels';

export class ProductRepository {
  static list(status: string, keyword: string, page: number, pageSize: number = 20): Promise<PageResult<ProductSummary>> {
    return ApiClient.get<PageResult<ProductSummary>>(withQuery(`${AppConfig.API_PREFIX}/m/products`, [
      { name: 'status', value: status },
      { name: 'keyword', value: keyword },
      { name: 'page', value: page },
      { name: 'pageSize', value: pageSize }
    ]));
  }

  static detail(id: string): Promise<ProductDetail> {
    return ApiClient.get<ProductDetail>(`${AppConfig.API_PREFIX}/m/products/${id}`);
  }

  static create(body: ProductMutation): Promise<ProductDetail> {
    return ApiClient.post<ProductDetail>(`${AppConfig.API_PREFIX}/m/products`, body);
  }

  static update(id: string, body: ProductMutation): Promise<ProductDetail> {
    return ApiClient.put<ProductDetail>(`${AppConfig.API_PREFIX}/m/products/${id}`, body);
  }

  static batchOnline(ids: string[]): Promise<EmptyResult> {
    const body: ProductBatchRequest = { ids };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/products/batch-online`, body);
  }

  static batchOffline(ids: string[]): Promise<EmptyResult> {
    const body: ProductBatchRequest = { ids };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/products/batch-offline`, body);
  }

  static batchDelete(ids: string[]): Promise<EmptyResult> {
    const body: ProductBatchRequest = { ids };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/products/batch-delete`, body);
  }

  static merchantCategories(): Promise<CategoryItem[]> {
    return ApiClient.get<CategoryItem[]>(`${AppConfig.API_PREFIX}/m/categories`);
  }

  static platformCategories(): Promise<CategoryItem[]> {
    return ApiClient.get<CategoryItem[]>(`${AppConfig.API_PREFIX}/u/categories`, false);
  }

  static createCategory(body: CategoryMutation): Promise<CategoryItem> {
    return ApiClient.post<CategoryItem>(`${AppConfig.API_PREFIX}/m/categories`, body);
  }

  static updateCategory(id: string, body: CategoryMutation): Promise<CategoryItem> {
    return ApiClient.put<CategoryItem>(`${AppConfig.API_PREFIX}/m/categories/${id}`, body);
  }

  static deleteCategory(id: string): Promise<EmptyResult> {
    return ApiClient.delete<EmptyResult>(`${AppConfig.API_PREFIX}/m/categories/${id}`);
  }

  static sortCategories(ids: string[]): Promise<EmptyResult> {
    const body: CategorySortRequest = { ids };
    return ApiClient.post<EmptyResult>(`${AppConfig.API_PREFIX}/m/categories/sort`, body);
  }
}
