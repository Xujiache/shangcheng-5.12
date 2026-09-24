import { ProductMutation, ProductSku, ProductSpecGroup } from './ProductModels';
import { ProductImageItem, ProductImageQueue } from './ProductImageQueue';

export type ProductEditSection = 'images' | 'basic' | 'pricing' | 'shipping';
export class ProductFieldError {
  field: string;
  section: ProductEditSection;
  zh: string;
  en: string;
  constructor(field: string, section: ProductEditSection, zh: string, en: string) { this.field = field; this.section = section; this.zh = zh; this.en = en; }
}
export class ProductEditPolicy {
  static validate(body: ProductMutation, main: ProductImageItem[], details: ProductImageItem[]): ProductFieldError[] {
    const errors: ProductFieldError[] = [];
    if (!body.name.trim()) errors.push(new ProductFieldError('name', 'basic', '请填写商品名称', 'Enter a product name'));
    if (!body.categoryId) errors.push(new ProductFieldError('category', 'basic', '请选择平台分类', 'Select a platform category'));
    if (!main.length) errors.push(new ProductFieldError('images', 'images', '请至少上传一张商品图', 'Add at least one product image'));
    if (ProductImageQueue.pending(main.concat(details))) errors.push(new ProductFieldError('images', 'images', '请重试或移除未上传成功的图片', 'Retry or remove unfinished images'));
    if (!body.skus.length || body.skus.some((sku: ProductSku) =>
      !Number.isFinite(sku.priceRetail) || sku.priceRetail < 0 || !Number.isFinite(sku.priceWholesale) || sku.priceWholesale < 0 ||
      !Number.isFinite(sku.priceMember) || sku.priceMember < 0 || !Number.isInteger(sku.stock) || sku.stock < 0 ||
      (!!sku.image && !/^https?:\/\//.test(sku.image)))) {
      errors.push(new ProductFieldError('skus', 'pricing', '请检查规格价格、整数库存和图片', 'Check SKU prices, whole-number stock and images'));
    }
    if (body.pricingMode === 'by-size' && (
      !Number.isFinite(body.pricePerSqm) || Number(body.pricePerSqm) <= 0 ||
      !Number.isFinite(body.minLength) || Number(body.minLength) <= 0 ||
      !Number.isFinite(body.minWidth) || Number(body.minWidth) <= 0 ||
      !Number.isFinite(body.maxLength) || Number(body.maxLength) < Number(body.minLength) ||
      !Number.isFinite(body.maxWidth) || Number(body.maxWidth) < Number(body.minWidth) ||
      !Number.isFinite(body.baseFee) || Number(body.baseFee) < 0)) {
      errors.push(new ProductFieldError('size', 'pricing', '请检查面积单价、尺寸范围和基础费', 'Check area rate, size range and base fee'));
    }
    if (!body.shipping.length) errors.push(new ProductFieldError('shipping', 'shipping', '请至少选择一种配送方式', 'Select at least one delivery method'));
    return errors;
  }
  static cloneSkus(source: ProductSku[]): ProductSku[] { return JSON.parse(JSON.stringify(source)) as ProductSku[]; }
  static cloneGroups(source: ProductSpecGroup[]): ProductSpecGroup[] { return source.map((g: ProductSpecGroup): ProductSpecGroup => ({ name: g.name, values: g.values.slice() })); }
}

export class ProductEditSession {
  private epoch: number = 0;
  private saving: boolean = false;
  private baseline: string = '';
  begin(): number { this.saving = false; return ++this.epoch; }
  current(epoch: number): boolean { return epoch === this.epoch; }
  invalidate(): void { this.epoch += 1; this.saving = false; }
  accept(snapshot: string): void { this.baseline = snapshot; }
  dirty(snapshot: string): boolean { return !!this.baseline && snapshot !== this.baseline; }
  beginSave(): boolean { if (this.saving) return false; this.saving = true; return true; }
  finishSave(): void { this.saving = false; }
}
