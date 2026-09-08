import {
  IBestButton,
  IBestActionSheet,
  IBestDialogUtil,
  IBestField,
  IBestImagePreview,
  IBestNavBar,
  IBestToast
} from '@ibestservices/ibest-ui';
import { common } from '@kit.AbilityKit';
import { FileUploadService } from '../../core/file/FileUploadService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { CategoryItem, ProductDetail, ProductMutation, ProductSku, ProductSpecGroup } from './ProductModels';
import { ProductRepository } from './ProductRepository';
import { I18n } from '../../core/i18n/I18n';
import { ProductSkuMatrix } from './ProductSkuMatrix';

@Builder
export function ProductEditBuilder(_: string, raw: Object) {
  ProductEditPage({ params: raw as IdRouteParams });
}

@Component
struct ProductEditPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private loading: boolean = false;
  @State private saving: boolean = false;
  @State private uploading: boolean = false;
  @State private categories: CategoryItem[] = [];
  @State private merchantCategories: CategoryItem[] = [];
  @State private name: string = '';
  @State private categoryId: string = '';
  @State private merchantCategoryId: string = '';
  @State private description: string = '';
  @State private images: string[] = [];
  @State private detailImages: string[] = [];
  @State private shippingFactory: boolean = true;
  @State private shippingLocal: boolean = false;
  @State private shippingPickup: boolean = false;
  @State private status: string = 'draft';
  @State private pricingMode: string = 'standard';
  @State private pricePerSqm: string = '';
  @State private minLength: string = '30';
  @State private minWidth: string = '30';
  @State private maxLength: string = '500';
  @State private maxWidth: string = '500';
  @State private baseFee: string = '0';
  @State private sizeUnit: string = 'cm';
  @State private skus: ProductSku[] = [];
  @State private specGroups: ProductSpecGroup[] = [];
  @State private specEditorVisible: boolean = false;
  @State private specEditIndex: number = -1;
  @State private specName: string = '';
  @State private specValuesText: string = '';
  @State private batchEditorVisible: boolean = false;
  @State private batchMode: string = 'price';
  @State private batchValue: string = '';
  @State private skuEditorVisible: boolean = false;
  @State private skuUploading: boolean = false;
  @State private skuEditIndex: number = -1;
  @State private skuImage: string = '';
  @State private skuLabel: string = '';
  @State private skuRetail: string = '';
  @State private skuWholesale: string = '';
  @State private skuMember: string = '';
  @State private skuStock: string = '';

  aboutToAppear(): void { this.initialize(); }

  private async initialize(): Promise<void> {
    this.loading = true;
    try {
      this.categories = this.flattenCategories(await ProductRepository.platformCategories());
      try {
        this.merchantCategories = this.flattenCategories(await ProductRepository.merchantCategories());
      } catch (_) {
        this.merchantCategories = [];
      }
      if (this.params.id) {
        const detail = await ProductRepository.detail(this.params.id);
        this.fill(detail);
      } else {
        this.skus = [this.defaultSku()];
      }
    } catch (error) { IBestToast.show(error instanceof ApiError ? error.message
      : I18n.text(this.language, '商品信息加载失败', 'Failed to load product details')); }
    finally { this.loading = false; }
  }

  private flattenCategories(source: CategoryItem[], prefix: string = ''): CategoryItem[] {
    const result: CategoryItem[] = [];
    source.forEach((item: CategoryItem) => {
      result.push({
        id: item.id, parentId: item.parentId, name: `${prefix}${item.name}`,
        icon: item.icon, sort: item.sort, type: item.type, children: item.children
      });
      if (item.children && item.children.length > 0) {
        result.push(...this.flattenCategories(item.children, `${prefix}· `));
      }
    });
    return result;
  }

  private fill(detail: ProductDetail): void {
    this.name = detail.name;
    this.categoryId = detail.categoryId;
    this.merchantCategoryId = detail.merchantCategoryId || '';
    this.description = detail.description || '';
    this.images = detail.images || [];
    this.detailImages = detail.detailImages || [];
    this.shippingFactory = detail.shipping.includes('factory');
    this.shippingLocal = detail.shipping.includes('local');
    this.shippingPickup = detail.shipping.includes('pickup');
    this.status = detail.status === 'draft' ? 'draft' : 'auditing';
    this.pricingMode = detail.pricingMode === 'by-size' ? 'by-size' : 'standard';
    this.pricePerSqm = detail.pricePerSqm !== undefined ? `${detail.pricePerSqm}` : '';
    this.minLength = detail.minLength !== undefined ? `${detail.minLength}` : '30';
    this.minWidth = detail.minWidth !== undefined ? `${detail.minWidth}` : '30';
    this.maxLength = detail.maxLength !== undefined ? `${detail.maxLength}` : '500';
    this.maxWidth = detail.maxWidth !== undefined ? `${detail.maxWidth}` : '500';
    this.baseFee = detail.baseFee !== undefined ? `${detail.baseFee}` : '0';
    this.sizeUnit = detail.sizeUnit === 'm' ? 'm' : 'cm';
    this.restoreSkuMatrix(detail.skus || []);
  }

  private defaultSku(): ProductSku {
    return {
      specs: {}, specValues: [], specsLabel: I18n.text(this.language, '默认规格', 'Default option'), priceRetail: 0,
      priceWholesale: 0, priceMember: 0, stock: 0, active: true
    };
  }

  private restoreSkuMatrix(source: ProductSku[]): void {
    if (source.length === 0) {
      this.specGroups = [];
      this.skus = [this.defaultSku()];
      return;
    }
    const names: string[] = [];
    const valuesByName: Record<string, string[]> = {};
    source.forEach((sku: ProductSku) => {
      const specs = sku.specs || {};
      Object.keys(specs).forEach((name: string) => {
        if (!names.includes(name)) names.push(name);
        if (!valuesByName[name]) valuesByName[name] = [];
        const value = `${specs[name] || ''}`;
        if (value && !valuesByName[name].includes(value)) valuesByName[name].push(value);
      });
    });
    this.specGroups = names.map((name: string): ProductSpecGroup => ({ name, values: valuesByName[name] || [] }));
    this.skus = source.map((sku: ProductSku): ProductSku => {
      const specs = sku.specs || {};
      const specValues = names.map((name: string) => `${specs[name] || ''}`);
      return {
        id: sku.id, specs, specValues,
        specsLabel: sku.specsLabel || (specValues.length > 0 ? specValues.join(' · ')
          : I18n.text(this.language, '默认规格', 'Default option')),
        image: sku.image, priceRetail: Number(sku.priceRetail || 0),
        priceWholesale: Number(sku.priceWholesale || 0), priceMember: Number(sku.priceMember || 0),
        stock: Number(sku.stock || 0), active: sku.active !== false
      };
    });
    if (this.skus.length === 0) this.skus = [this.defaultSku()];
  }

  private async addImages(detail: boolean): Promise<void> {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    try {
      const current = detail ? this.detailImages.length : this.images.length;
      const limit = detail ? 20 : 10;
      if (current >= limit) { IBestToast.show(I18n.text(this.language, `最多上传 ${limit} 张`, `Up to ${limit} images`)); return; }
      const urls = await FileUploadService.chooseAndUploadImages(limit - current, 'product');
      if (detail) this.detailImages = this.detailImages.concat(urls);
      else this.images = this.images.concat(urls);
    } catch (error) { IBestToast.show(error instanceof Error ? error.message
      : I18n.text(this.language, '图片上传失败', 'Image upload failed')); }
    finally { this.uploading = false; }
  }

  private async captureImage(detail: boolean): Promise<void> {
    if (this.uploading || this.saving) return;
    const current = detail ? this.detailImages.length : this.images.length;
    const limit = detail ? 20 : 10;
    if (current >= limit) {
      IBestToast.show(I18n.text(this.language, `最多上传 ${limit} 张`, `Up to ${limit} images`));
      return;
    }
    this.uploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'product');
      if (!url) return;
      if (detail) this.detailImages = this.detailImages.concat([url]);
      else this.images = this.images.concat([url]);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '拍照上传失败', 'Failed to capture and upload photo'));
    } finally {
      this.uploading = false;
    }
  }

  private removeImage(index: number, detail: boolean): void {
    if (this.uploading || this.saving) return;
    IBestDialogUtil.open({
      title: I18n.text(this.language, '删除图片', 'Delete image'),
      message: !detail && index === 0
        ? I18n.text(this.language, '当前是商品主图，删除后下一张会自动成为主图。', 'This is the cover image. The next image will become the cover after deletion.')
        : I18n.text(this.language, '确定删除这张图片吗？', 'Delete this image?'),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => {
        if (detail) this.detailImages = this.detailImages.filter((_: string, itemIndex: number) => itemIndex !== index);
        else this.images = this.images.filter((_: string, itemIndex: number) => itemIndex !== index);
      }
    });
  }

  private previewImage(index: number, detail: boolean): void {
    const source = detail ? this.detailImages : this.images;
    if (source.length > 0) IBestImagePreview.show(source, {
      startIndex: index,
      closeOnClickImage: false,
      closeOnClickOverlay: true
    });
  }

  private setMainImage(index: number): void {
    if (this.uploading || this.saving) return;
    if (index <= 0 || index >= this.images.length) return;
    const next = this.images.slice();
    const selected = next[index];
    next.splice(index, 1);
    next.unshift(selected);
    this.images = next;
    IBestToast.show(I18n.text(this.language, '已设为主图', 'Cover image updated'));
  }

  private replaceImage(index: number, detail: boolean): void {
    if (this.uploading || this.saving) return;
    IBestActionSheet.show({
      actions: [
        I18n.text(this.language, '从相册选择', 'Choose from Photos'),
        I18n.text(this.language, '拍照', 'Take photo')
      ],
      cancelText: I18n.text(this.language, '取消', 'Cancel'),
      onSelect: (sourceIndex: number): void => {
        if (sourceIndex === 0) this.replaceImageFromAlbum(index, detail);
        else if (sourceIndex === 1) this.replaceImageFromCamera(index, detail);
      }
    });
  }

  private async replaceImageFromAlbum(index: number, detail: boolean): Promise<void> {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(1, 'product');
      if (urls.length === 0) return;
      const next = (detail ? this.detailImages : this.images).slice();
      next[index] = urls[0];
      if (detail) this.detailImages = next; else this.images = next;
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '图片替换失败', 'Failed to replace image'));
    } finally {
      this.uploading = false;
    }
  }

  private async replaceImageFromCamera(index: number, detail: boolean): Promise<void> {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'product');
      if (!url) return;
      const next = (detail ? this.detailImages : this.images).slice();
      next[index] = url;
      if (detail) this.detailImages = next; else this.images = next;
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '图片替换失败', 'Failed to replace image'));
    } finally {
      this.uploading = false;
    }
  }

  private moveImage(index: number, offset: number): void {
    if (this.uploading || this.saving) return;
    const target = index + offset;
    if (target < 0 || target >= this.images.length) return;
    const next = this.images.slice();
    const current = next[index]; next[index] = next[target]; next[target] = current;
    this.images = next;
  }

  private openSku(index: number = -1): void {
    this.skuEditIndex = index;
    const sku = index >= 0 ? this.skus[index] : undefined;
    this.skuImage = sku?.image || '';
    this.skuLabel = sku?.specsLabel || I18n.text(this.language, '默认规格', 'Default option');
    this.skuRetail = sku ? `${sku.priceRetail}` : '';
    this.skuWholesale = sku ? `${sku.priceWholesale}` : '';
    this.skuMember = sku ? `${sku.priceMember}` : '';
    this.skuStock = sku ? `${sku.stock}` : '';
    this.skuEditorVisible = true;
  }

  private chooseSkuImage(): void {
    if (this.skuUploading || this.saving) return;
    IBestActionSheet.show({
      actions: [
        I18n.text(this.language, '从相册选择', 'Choose from Photos'),
        I18n.text(this.language, '拍照', 'Take photo')
      ],
      cancelText: I18n.text(this.language, '取消', 'Cancel'),
      onSelect: (index: number): void => {
        if (index === 0) this.chooseSkuImageFromAlbum();
        else if (index === 1) this.captureSkuImage();
      }
    });
  }

  private async chooseSkuImageFromAlbum(): Promise<void> {
    if (this.skuUploading || this.saving) return;
    this.skuUploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(1, 'product');
      if (urls.length > 0) this.skuImage = urls[0];
    } catch (error) { IBestToast.show(error instanceof Error ? error.message
      : I18n.text(this.language, '规格图片上传失败', 'Option image upload failed')); }
    finally { this.skuUploading = false; }
  }

  private async captureSkuImage(): Promise<void> {
    if (this.skuUploading || this.saving) return;
    this.skuUploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'product');
      if (url) this.skuImage = url;
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '规格图片拍摄上传失败', 'Failed to capture and upload option image'));
    } finally {
      this.skuUploading = false;
    }
  }

  private saveSku(): void {
    if (this.skuUploading || this.saving) return;
    const retail = Number(this.skuRetail);
    const wholesale = Number(this.skuWholesale);
    const member = Number(this.skuMember);
    const stock = Number(this.skuStock);
    if (!Number.isFinite(retail) || retail < 0 ||
      !Number.isFinite(wholesale) || wholesale < 0 || !Number.isFinite(member) || member < 0 ||
      !Number.isFinite(stock) || stock < 0) {
      IBestToast.show(I18n.text(this.language, '请完整填写规格与价格库存', 'Complete the option, prices and stock')); return;
    }
    const previous = this.skuEditIndex >= 0 ? this.skus[this.skuEditIndex] : undefined;
    const sku: ProductSku = {
      id: previous?.id,
      specs: previous?.specs || {}, specValues: previous?.specValues || [],
      specsLabel: this.skuLabel.trim() || I18n.text(this.language, '默认规格', 'Default option'), priceRetail: retail, priceWholesale: wholesale,
      priceMember: member, stock: Math.floor(stock), active: previous?.active ?? true,
      image: this.skuImage || undefined
    };
    const next = this.skus.slice();
    if (this.skuEditIndex >= 0) next[this.skuEditIndex] = sku; else next.push(sku);
    this.skus = next;
    this.skuEditorVisible = false;
  }

  private openSpecEditor(index: number = -1): void {
    if (index < 0 && this.specGroups.length >= 4) {
      IBestToast.show(I18n.text(this.language, '最多添加 4 个规格', 'Up to 4 option groups'));
      return;
    }
    this.specEditIndex = index;
    const group = index >= 0 ? this.specGroups[index] : undefined;
    this.specName = group?.name || '';
    this.specValuesText = (group?.values || []).join('，');
    this.specEditorVisible = true;
  }

  private saveSpecGroup(): void {
    const name = this.specName.trim();
    const values: string[] = [];
    this.specValuesText.split(/[,，]/).forEach((raw: string) => {
      const value = raw.trim();
      if (value && !values.includes(value)) values.push(value);
    });
    if (!name || values.length === 0) {
      IBestToast.show(I18n.text(this.language, '请填写规格名和至少一个规格值', 'Enter an option group name and at least one value'));
      return;
    }
    const duplicate = this.specGroups.some((item: ProductSpecGroup, index: number) =>
      index !== this.specEditIndex && item.name === name);
    if (duplicate) {
      IBestToast.show(I18n.text(this.language, '规格名不能重复', 'Option group names must be unique'));
      return;
    }
    const next = this.specGroups.slice();
    const group: ProductSpecGroup = { name, values };
    if (this.specEditIndex >= 0) next[this.specEditIndex] = group; else next.push(group);
    this.specGroups = next;
    this.regenerateSkus();
    this.specEditorVisible = false;
  }

  private confirmRemoveSpec(index: number): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '删除规格', 'Delete option group'),
      message: I18n.text(this.language, `删除“${this.specGroups[index].name}”后，SKU 组合会重新生成。`,
        `SKU combinations will be regenerated after deleting “${this.specGroups[index].name}”.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => {
        this.specGroups = this.specGroups.filter((_: ProductSpecGroup, itemIndex: number) => itemIndex !== index);
        this.regenerateSkus();
      }
    });
  }

  private specsRecord(values: string[]): Record<string, string> {
    return ProductSkuMatrix.specsRecord(this.specGroups, values);
  }

  private regenerateSkus(): void {
    this.skus = ProductSkuMatrix.regenerate(
      this.specGroups,
      this.skus,
      I18n.text(this.language, '默认规格', 'Default option')
    );
  }

  private openBatchEditor(mode: string): void {
    this.batchMode = mode;
    this.batchValue = '';
    this.batchEditorVisible = true;
  }

  private applyBatch(): void {
    const value = Number(this.batchValue);
    if (!Number.isFinite(value) || value < 0 || (this.batchMode === 'price' && value <= 0)) {
      IBestToast.show(this.batchMode === 'price'
        ? I18n.text(this.language, '请输入有效的批发价', 'Enter a valid wholesale price')
        : I18n.text(this.language, '请输入有效库存', 'Enter valid stock'));
      return;
    }
    this.skus = this.skus.map((sku: ProductSku): ProductSku => {
      if (this.batchMode === 'price') {
        return {
          id: sku.id, specs: sku.specs, specValues: sku.specValues, specsLabel: sku.specsLabel,
          image: sku.image, priceWholesale: value, priceRetail: Math.round(value * 1.3 * 100) / 100,
          priceMember: Math.round(value * 1.1 * 100) / 100, stock: sku.stock, active: sku.active
        };
      }
      return {
        id: sku.id, specs: sku.specs, specValues: sku.specValues, specsLabel: sku.specsLabel,
        image: sku.image, priceWholesale: sku.priceWholesale, priceRetail: sku.priceRetail,
        priceMember: sku.priceMember, stock: Math.floor(value), active: sku.active
      };
    });
    this.batchEditorVisible = false;
    IBestToast.show(I18n.text(this.language, '已批量填充', 'Applied to all SKUs'));
  }

  private switchPricingMode(mode: string): void {
    this.pricingMode = mode;
    if (mode === 'by-size' && this.specGroups.length === 0) {
      this.specGroups = [{ name: I18n.text(this.language, '材质', 'Material'), values: [I18n.text(this.language, '默认', 'Default')] }];
      this.regenerateSkus();
    }
  }

  private isUploadedUrl(value: string): boolean {
    return value.startsWith('https://') || value.startsWith('http://');
  }

  private async save(nextStatus: string): Promise<void> {
    if (this.saving) return;
    if (!this.name.trim() || !this.categoryId) { IBestToast.show(I18n.text(this.language, '请填写商品名称并选择平台分类', 'Enter a product name and select a platform category')); return; }
    if (this.images.length === 0) { IBestToast.show(I18n.text(this.language, '请至少上传一张商品图', 'Upload at least one product image')); return; }
    if (this.pricingMode === 'standard' && this.skus.length === 0) { IBestToast.show(I18n.text(this.language, '请先配置规格并生成 SKU', 'Configure options to generate SKUs first')); return; }
    if (this.uploading || this.skuUploading) { IBestToast.show(I18n.text(this.language, '图片仍在上传，请稍候', 'Images are still uploading')); return; }
    if (this.images.some((url: string) => !this.isUploadedUrl(url)) ||
      this.detailImages.some((url: string) => !this.isUploadedUrl(url)) ||
      this.skus.some((sku: ProductSku) => !!sku.image && !this.isUploadedUrl(sku.image))) {
      IBestToast.show(I18n.text(this.language, '存在未上传完成的图片，请重新上传', 'Some images did not finish uploading. Upload them again.')); return;
    }
    const pricePerSqm = Number(this.pricePerSqm);
    const minLength = Number(this.minLength);
    const minWidth = Number(this.minWidth);
    const maxLength = Number(this.maxLength);
    const maxWidth = Number(this.maxWidth);
    const baseFee = Number(this.baseFee);
    if (this.pricingMode === 'by-size' && (!Number.isFinite(pricePerSqm) || pricePerSqm <= 0 ||
      !Number.isFinite(minLength) || minLength <= 0 || !Number.isFinite(minWidth) || minWidth <= 0 ||
      !Number.isFinite(maxLength) || maxLength < minLength || !Number.isFinite(maxWidth) || maxWidth < minWidth ||
      !Number.isFinite(baseFee) || baseFee < 0)) {
      IBestToast.show(I18n.text(this.language, '请正确填写尺寸计价、尺寸范围和基础费', 'Enter valid size pricing, range and base fee')); return;
    }
    const shipping: string[] = [];
    if (this.shippingFactory) shipping.push('factory');
    if (this.shippingLocal) shipping.push('local');
    if (this.shippingPickup) shipping.push('pickup');
    if (shipping.length === 0) { IBestToast.show(I18n.text(this.language, '请选择物流方式', 'Select a delivery method')); return; }
    const normalizedSkus = ProductSkuMatrix.normalize(
      this.specGroups,
      this.skus,
      I18n.text(this.language, '默认规格', 'Default option')
    );
    const body: ProductMutation = {
      categoryId: this.categoryId, merchantCategoryId: this.merchantCategoryId || undefined,
      name: this.name.trim(), description: this.description.trim(), images: this.images,
      detailImages: this.detailImages, shipping,
      skus: normalizedSkus, pricingMode: this.pricingMode,
      pricePerSqm: this.pricingMode === 'by-size' ? pricePerSqm : undefined,
      minLength: this.pricingMode === 'by-size' ? minLength : undefined,
      minWidth: this.pricingMode === 'by-size' ? minWidth : undefined,
      maxLength: this.pricingMode === 'by-size' ? maxLength : undefined,
      maxWidth: this.pricingMode === 'by-size' ? maxWidth : undefined,
      baseFee: this.pricingMode === 'by-size' ? baseFee : undefined,
      sizeUnit: this.pricingMode === 'by-size' ? this.sizeUnit : undefined,
      status: nextStatus
    };
    this.saving = true;
    try {
      if (this.params.id) await ProductRepository.update(this.params.id, body);
      else await ProductRepository.create(body);
      IBestToast.show(nextStatus === 'draft'
        ? I18n.text(this.language, '草稿已保存', 'Draft saved')
        : I18n.text(this.language, '已提交审核', 'Submitted for review'));
      AppRouter.back();
    } catch (error) { IBestToast.show(error instanceof ApiError ? error.message
      : I18n.text(this.language, '商品保存失败', 'Failed to save product')); }
    finally { this.saving = false; }
  }

  @Builder
  private sectionTitle(title: string, hint: string = '') {
    Row() {
      Text(title).fontSize(17).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
      if (hint) Text(hint).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).margin({ left: 8 });
    }.width('100%');
  }

  @Builder
  private imageGrid(items: string[], detail: boolean) {
    Flex({ wrap: FlexWrap.Wrap, justifyContent: FlexAlign.Start }) {
      ForEach(items, (url: string, index: number) => {
        Stack({ alignContent: Alignment.TopEnd }) {
          Image(url).width(92).height(92).objectFit(ImageFit.Cover).borderRadius(12)
            .onClick(() => this.previewImage(index, detail));
          Column() { MerchantIcon({ name: 'cross', color: Color.White, iconSize: 14 }); }
            .width(24).height(24).justifyContent(FlexAlign.Center)
            .backgroundColor('#B8000000').borderRadius(12).onClick(() => this.removeImage(index, detail));
          if (!detail && index === 0) {
            Text(I18n.text(this.language, '主图', 'Cover')).fontSize(10).fontColor(DesignTokens.onBrand(this.darkMode)).padding({ left: 5, right: 5, top: 2, bottom: 2 })
              .backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius({ bottomRight: 8 }).align(Alignment.TopStart);
          }
          Row({ space: 2 }) {
            Text(I18n.text(this.language, '换', 'Swap')).width(24).height(22).textAlign(TextAlign.Center).fontSize(10)
              .backgroundColor('#99000000').fontColor(Color.White).onClick(() => this.replaceImage(index, detail));
            if (!detail && index > 0) {
              Text(I18n.text(this.language, '主', 'Cover')).width(24).height(22).textAlign(TextAlign.Center).fontSize(10)
                .backgroundColor('#99000000').fontColor(Color.White).onClick(() => this.setMainImage(index));
            }
          }.align(Alignment.BottomStart);
          if (!detail) {
            Row({ space: 2 }) {
              Column() { MerchantIcon({ name: 'arrow-left', color: Color.White, iconSize: 14 }); }
                .width(26).height(22).justifyContent(FlexAlign.Center).backgroundColor('#99000000').onClick(() => this.moveImage(index, -1));
              Column() { MerchantIcon({ name: 'arrow', color: Color.White, iconSize: 14 }); }
                .width(26).height(22).justifyContent(FlexAlign.Center).backgroundColor('#99000000').onClick(() => this.moveImage(index, 1));
            }.align(Alignment.Bottom);
          }
        }.margin({ right: 8, bottom: 8 });
      }, (url: string) => url);
      Column({ space: 4 }) {
        MerchantIcon({ name: 'add-o', color: DesignTokens.brand(this.darkMode), iconSize: 28 });
        Text(this.uploading ? I18n.text(this.language, '上传中', 'Uploading')
          : I18n.text(this.language, '添加图片', 'Add image')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }
      .width(92).height(92).justifyContent(FlexAlign.Center).border({ width: 1, color: DesignTokens.border(this.darkMode), style: BorderStyle.Dashed })
      .borderRadius(12).onClick(() => { if (!this.uploading) this.addImages(detail); });
      Column({ space: 4 }) {
        MerchantIcon({ name: 'photograph', color: DesignTokens.brand(this.darkMode), iconSize: 27 });
        Text(I18n.text(this.language, '拍照', 'Camera')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }
      .width(92).height(92).justifyContent(FlexAlign.Center).border({ width: 1, color: DesignTokens.border(this.darkMode), style: BorderStyle.Dashed })
      .borderRadius(12).margin({ left: 8 })
      .onClick(() => { if (!this.uploading) this.captureImage(detail); });
    }.width('100%');
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: this.params.id ? I18n.text(this.language, '编辑商品', 'Edit product')
            : I18n.text(this.language, '新增商品', 'Add product'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
          if (this.loading) {
            Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            Scroll() {
              Column({ space: 14 }) {
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '基本信息', 'Basic information'));
                  IBestField({ value: $name, label: I18n.text(this.language, '商品名称', 'Product name'), placeholder: I18n.text(this.language, '请输入商品名称', 'Enter a product name') });
                  TextArea({ text: this.description, placeholder: I18n.text(this.language, '请输入商品描述', 'Enter a product description') })
                    .height(112).padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10)
                    .onChange((value: string) => { this.description = value; });
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '平台分类', 'Platform category'), I18n.text(this.language, '必填', 'Required'));
                  Flex({ wrap: FlexWrap.Wrap }) {
                    ForEach(this.categories, (item: CategoryItem) => {
                      Text(item.name).fontSize(12).padding({ left: 12, right: 12, top: 7, bottom: 7 })
                        .fontColor(this.categoryId === item.id ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                        .backgroundColor(this.categoryId === item.id ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                        .borderRadius(16).margin({ right: 8, bottom: 8 }).onClick(() => { this.categoryId = item.id; });
                    }, (item: CategoryItem) => item.id);
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                if (this.merchantCategories.length > 0) {
                  Column({ space: 12 }) {
                    this.sectionTitle(I18n.text(this.language, '店内分类', 'Store category'), I18n.text(this.language, '选填，用于店内商品管理', 'Optional, for in-store management'));
                    Flex({ wrap: FlexWrap.Wrap }) {
                      Text(I18n.text(this.language, '不归类', 'Uncategorized')).fontSize(12).padding({ left: 12, right: 12, top: 7, bottom: 7 })
                        .fontColor(!this.merchantCategoryId ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                        .backgroundColor(!this.merchantCategoryId ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                        .borderRadius(16).margin({ right: 8, bottom: 8 })
                        .onClick(() => { this.merchantCategoryId = ''; });
                      ForEach(this.merchantCategories, (item: CategoryItem) => {
                        Text(item.name).fontSize(12).padding({ left: 12, right: 12, top: 7, bottom: 7 })
                          .fontColor(this.merchantCategoryId === item.id ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                          .backgroundColor(this.merchantCategoryId === item.id ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                          .borderRadius(16).margin({ right: 8, bottom: 8 })
                          .onClick(() => { this.merchantCategoryId = item.id; });
                      }, (item: CategoryItem) => item.id);
                    }.width('100%');
                  }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                }
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '商品图', 'Product images'), I18n.text(this.language, '最多10张，首张为封面', 'Up to 10; the first is the cover'));
                  this.imageGrid(this.images, false);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '商品详情图', 'Detail images'), I18n.text(this.language, '最多20张', 'Up to 20'));
                  this.imageGrid(this.detailImages, true);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '计价方式', 'Pricing method'), I18n.text(this.language, '创建后仍可编辑', 'Editable after creation'));
                  Row({ space: 10 }) {
                    Column({ space: 4 }) {
                      Text(I18n.text(this.language, '标准 SKU', 'Standard SKU')).fontSize(15).fontWeight(FontWeight.Medium)
                        .fontColor(this.pricingMode === 'standard' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode));
                      Text(I18n.text(this.language, '按规格设置价格和库存', 'Set price and stock by option')).fontSize(10)
                      .fontColor(this.pricingMode === 'standard' ? '#EFFFFFFF' : DesignTokens.muted(this.darkMode));
                    }.layoutWeight(1).padding(12).borderRadius(12)
                      .backgroundColor(this.pricingMode === 'standard' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                      .onClick(() => this.switchPricingMode('standard'));
                    Column({ space: 4 }) {
                      Text(I18n.text(this.language, '按尺寸计价', 'Price by size')).fontSize(15).fontWeight(FontWeight.Medium)
                        .fontColor(this.pricingMode === 'by-size' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode));
                      Text(I18n.text(this.language, '面积单价 + 基础费用', 'Area rate + base fee')).fontSize(10)
                        .fontColor(this.pricingMode === 'by-size' ? '#EFFFFFFF' : DesignTokens.muted(this.darkMode));
                    }.layoutWeight(1).padding(12).borderRadius(12)
                      .backgroundColor(this.pricingMode === 'by-size' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                      .onClick(() => this.switchPricingMode('by-size'));
                  }.width('100%');
                  if (this.pricingMode === 'by-size') {
                    IBestField({ value: $pricePerSqm, label: I18n.text(this.language, '每平方米价格', 'Price per square metre'), placeholder: I18n.text(this.language, '请输入单价', 'Enter unit price'), type: 'decimal' });
                    IBestField({ value: $baseFee, label: I18n.text(this.language, '基础费用', 'Base fee'), placeholder: I18n.text(this.language, '没有则填 0', 'Enter 0 if none'), type: 'decimal' });
                    Row({ space: 10 }) {
                      Text(I18n.text(this.language, '尺寸单位', 'Size unit')).fontSize(14).layoutWeight(1);
                      Text(I18n.text(this.language, '厘米 cm', 'Centimetres (cm)')).fontSize(12).padding({ left: 12, right: 12, top: 7, bottom: 7 })
                        .fontColor(this.sizeUnit === 'cm' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                        .backgroundColor(this.sizeUnit === 'cm' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode)).borderRadius(16)
                        .onClick(() => { this.sizeUnit = 'cm'; });
                      Text(I18n.text(this.language, '米 m', 'Metres (m)')).fontSize(12).padding({ left: 12, right: 12, top: 7, bottom: 7 })
                        .fontColor(this.sizeUnit === 'm' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                        .backgroundColor(this.sizeUnit === 'm' ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode)).borderRadius(16)
                        .onClick(() => { this.sizeUnit = 'm'; });
                    }.width('100%');
                    Row({ space: 10 }) {
                      Column({ space: 6 }) {
                        Text(I18n.text(this.language, '最小尺寸', 'Minimum size')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                        IBestField({ value: $minLength, label: I18n.text(this.language, '长度', 'Length'), placeholder: '30', type: 'decimal' });
                        IBestField({ value: $minWidth, label: I18n.text(this.language, '宽度', 'Width'), placeholder: '30', type: 'decimal' });
                      }.layoutWeight(1);
                      Column({ space: 6 }) {
                        Text(I18n.text(this.language, '最大尺寸', 'Maximum size')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                        IBestField({ value: $maxLength, label: I18n.text(this.language, '长度', 'Length'), placeholder: '500', type: 'decimal' });
                        IBestField({ value: $maxWidth, label: I18n.text(this.language, '宽度', 'Width'), placeholder: '500', type: 'decimal' });
                      }.layoutWeight(1);
                    }.width('100%');
                    Text(I18n.text(this.language, '成交价 = 长 × 宽折算平方米 × 单价 + 基础费用',
                      'Price = length × width in m² × unit rate + base fee'))
                      .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  }
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Column({ space: 12 }) {
                  Row() {
                    this.sectionTitle(I18n.text(this.language, '商品规格', 'Product options'), I18n.text(this.language, '最多 4 组，自动生成 SKU 组合', 'Up to 4 groups; SKUs are generated automatically'));
                    Blank();
                    IBestButton({ text: I18n.text(this.language, '添加规格', 'Add option'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openSpecEditor() });
                  }.width('100%');
                  if (this.specGroups.length === 0) {
                    Text(I18n.text(this.language, '未添加规格，当前按“默认规格”单 SKU 销售。',
                      'No options added. The product uses a single default SKU.'))
                      .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  }
                  ForEach(this.specGroups, (group: ProductSpecGroup, index: number) => {
                    Column({ space: 8 }) {
                      Row() {
                        Text(group.name).fontSize(14).fontWeight(FontWeight.Medium).layoutWeight(1);
                        Text(I18n.text(this.language, '编辑', 'Edit')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).padding(8)
                          .onClick(() => this.openSpecEditor(index));
                        Text(I18n.text(this.language, '删除', 'Delete')).fontSize(12).fontColor(DesignTokens.danger(this.darkMode)).padding(8)
                          .onClick(() => this.confirmRemoveSpec(index));
                      }.width('100%');
                      Flex({ wrap: FlexWrap.Wrap }) {
                        ForEach(group.values, (value: string) => {
                          Text(value).fontSize(12).fontColor(DesignTokens.text(this.darkMode))
                            .padding({ left: 10, right: 10, top: 6, bottom: 6 })
                            .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14).margin({ right: 7, bottom: 6 });
                        }, (value: string) => value);
                      }.width('100%');
                    }.width('100%').padding(10).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10);
                  }, (group: ProductSpecGroup, index: number) => `${group.name}-${index}`);
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

                if (this.pricingMode === 'standard') {
                  Column({ space: 12 }) {
                    Row() {
                      this.sectionTitle(I18n.text(this.language, 'SKU 价格与库存', 'SKU prices and stock'), I18n.text(this.language, `${this.skus.length} 条`, `${this.skus.length} SKUs`));
                      Blank();
                      IBestButton({ text: I18n.text(this.language, '批量填价', 'Set prices'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openBatchEditor('price') });
                      IBestButton({ text: I18n.text(this.language, '批量库存', 'Set stock'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openBatchEditor('stock') });
                    }.width('100%');
                    if (this.skus.length === 0) {
                      Text(I18n.text(this.language, '请确保每组规格至少填写一个规格值', 'Each option group needs at least one value')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode))
                        .width('100%').textAlign(TextAlign.Center).padding(20);
                    }
                    ForEach(this.skus, (sku: ProductSku, index: number) => {
                      Row({ space: 8 }) {
                        if (sku.image) {
                          Image(sku.image).width(48).height(48).objectFit(ImageFit.Cover).borderRadius(8)
                            .onClick(() => IBestImagePreview.show([sku.image || '']));
                        } else {
                          Column() { Text(I18n.text(this.language, '图', 'Image')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)); }
                            .width(48).height(48).justifyContent(FlexAlign.Center).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(8);
                        }
                        Column({ space: 4 }) {
                          Text(sku.specsLabel || I18n.text(this.language, '默认规格', 'Default option')).fontSize(14).fontWeight(FontWeight.Medium);
                          Text(I18n.text(this.language,
                            `零售 ¥${Number(sku.priceRetail).toFixed(2)}  批发 ¥${Number(sku.priceWholesale).toFixed(2)}  库存 ${sku.stock}`,
                            `Retail ¥${Number(sku.priceRetail).toFixed(2)}  Wholesale ¥${Number(sku.priceWholesale).toFixed(2)}  Stock ${sku.stock}`))
                            .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                        Toggle({ type: ToggleType.Switch, isOn: sku.active }).selectedColor(DesignTokens.brand(this.darkMode))
                          .onChange((active: boolean) => {
                            this.skus = this.skus.map((item: ProductSku, itemIndex: number) => itemIndex === index ? {
                              id: item.id, specs: item.specs, specValues: item.specValues, specsLabel: item.specsLabel,
                              image: item.image, priceRetail: item.priceRetail, priceWholesale: item.priceWholesale,
                              priceMember: item.priceMember, stock: item.stock, active
                            } : item);
                          });
                        IBestButton({ text: I18n.text(this.language, '编辑', 'Edit'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openSku(index) });
                      }.width('100%').padding({ top: 8, bottom: 8 });
                    }, (sku: ProductSku, index: number) => `${sku.id || sku.specsLabel}-${index}`);
                  }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                }
                Column({ space: 12 }) {
                  this.sectionTitle(I18n.text(this.language, '配送方式', 'Delivery methods'));
                  Row({ space: 12 }) {
                    Checkbox({ name: 'factory', group: 'shipping' }).select(this.shippingFactory).selectedColor(DesignTokens.brand(this.darkMode)).onChange((value: boolean) => { this.shippingFactory = value; });
                    Text(I18n.text(this.language, '厂家物流', 'Factory delivery')).fontSize(13);
                    Checkbox({ name: 'local', group: 'shipping' }).select(this.shippingLocal).selectedColor(DesignTokens.brand(this.darkMode)).onChange((value: boolean) => { this.shippingLocal = value; });
                    Text(I18n.text(this.language, '同城配送', 'Local delivery')).fontSize(13);
                    Checkbox({ name: 'pickup', group: 'shipping' }).select(this.shippingPickup).selectedColor(DesignTokens.brand(this.darkMode)).onChange((value: boolean) => { this.shippingPickup = value; });
                    Text(I18n.text(this.language, '到店自提', 'Store pickup')).fontSize(13);
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
                Row() {
                  Column({ space: 4 }) {
                    Text(I18n.text(this.language, '价格显示规则', 'Price display rules')).fontSize(15).fontWeight(FontWeight.Medium);
                    Text(I18n.text(this.language, '已改为店铺全局设置', 'Managed as a store-wide setting')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                  }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                  Text(I18n.text(this.language, '前往设置  ›', 'Open settings  ›')).fontSize(13).fontColor(DesignTokens.brand(this.darkMode));
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
                  .onClick(() => AppRouter.push('PriceRule'));
              }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 92 });
            }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '保存草稿', 'Save draft'), plain: true, btnWidth: '38%', loading: this.saving, disabled: this.saving || this.uploading || this.skuUploading, onBtnClick: () => this.save('draft') });
              IBestButton({ text: I18n.text(this.language, '提交审核', 'Submit for review'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '58%', loading: this.saving, disabled: this.saving || this.uploading || this.skuUploading, onBtnClick: () => this.save('auditing') });
            }.width('100%').padding({ left: 16, right: 16, top: 10, bottom: this.safeBottom + 10 }).backgroundColor(DesignTokens.card(this.darkMode));
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));

        if (this.skuEditorVisible) {
          Column({ space: 12 }) {
            Text(I18n.text(this.language, '编辑 SKU', 'Edit SKU')).fontSize(20).fontWeight(FontWeight.Bold);
            Row({ space: 12 }) {
              if (this.skuImage) {
                Stack({ alignContent: Alignment.TopEnd }) {
                  Image(this.skuImage).width(72).height(72).objectFit(ImageFit.Cover).borderRadius(10);
                  Column() { MerchantIcon({ name: 'cross', color: Color.White, iconSize: 13 }); }
                    .width(22).height(22).justifyContent(FlexAlign.Center)
                    .backgroundColor('#B8000000').borderRadius(11).onClick(() => { this.skuImage = ''; });
                }
              } else {
                Column({ space: 2 }) {
                  MerchantIcon({ name: 'add-o', color: DesignTokens.brand(this.darkMode), iconSize: 23 });
                  Text(this.skuUploading ? I18n.text(this.language, '上传中', 'Uploading')
                    : I18n.text(this.language, '规格图', 'Option image')).fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
                }.width(72).height(72).justifyContent(FlexAlign.Center)
                  .border({ width: 1, color: DesignTokens.border(this.darkMode), style: BorderStyle.Dashed }).borderRadius(10)
                  .onClick(() => { if (!this.skuUploading) this.chooseSkuImage(); });
              }
              Text(I18n.text(this.language, '规格图为选填；上传后将在商品规格列表中展示。',
                'The option image is optional and appears in the SKU list.')).fontSize(11)
                .fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
            }.width('100%');
            Row() {
              Text(I18n.text(this.language, '规格', 'Option')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width(72);
              Text(this.skuLabel || I18n.text(this.language, '默认规格', 'Default option')).fontSize(14).fontWeight(FontWeight.Medium).layoutWeight(1);
            }.width('100%').padding({ top: 8, bottom: 8 });
            IBestField({ value: $skuRetail, label: I18n.text(this.language, '零售价', 'Retail price'), placeholder: '0.00', type: 'decimal' });
            IBestField({ value: $skuWholesale, label: I18n.text(this.language, '批发价', 'Wholesale price'), placeholder: '0.00', type: 'decimal' });
            IBestField({ value: $skuMember, label: I18n.text(this.language, '会员价', 'Member price'), placeholder: '0.00', type: 'decimal' });
            IBestField({ value: $skuStock, label: I18n.text(this.language, '库存', 'Stock'), placeholder: '0', type: 'number' });
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.skuUploading, onBtnClick: () => { this.skuEditorVisible = false; } });
              IBestButton({ text: I18n.text(this.language, '保存', 'Save'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', disabled: this.skuUploading, loading: this.skuUploading, onBtnClick: () => this.saveSku() });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 }).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 });
        }

        if (this.specEditorVisible) {
          Column({ space: 14 }) {
            Text(this.specEditIndex >= 0 ? I18n.text(this.language, '编辑规格组', 'Edit option group')
              : I18n.text(this.language, '添加规格组', 'Add option group')).fontSize(20).fontWeight(FontWeight.Bold);
            IBestField({ value: $specName, label: I18n.text(this.language, '规格名', 'Option name'), placeholder: I18n.text(this.language, '例如：颜色、材质、尺寸', 'For example: colour, material, size') });
            IBestField({ value: $specValuesText, label: I18n.text(this.language, '规格值', 'Option values'), placeholder: I18n.text(this.language, '多个值用逗号分隔', 'Separate multiple values with commas') });
            Text(I18n.text(this.language, '保存后会自动重新生成所有规格组合，并尽量保留未改变组合的价格和库存。',
              'Saving regenerates all combinations while preserving unchanged prices and stock where possible.'))
              .fontSize(11).lineHeight(18).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', onBtnClick: () => { this.specEditorVisible = false; } });
              IBestButton({ text: I18n.text(this.language, '保存', 'Save'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', onBtnClick: () => this.saveSpecGroup() });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 });
        }

        if (this.batchEditorVisible) {
          Column({ space: 14 }) {
            Text(this.batchMode === 'price' ? I18n.text(this.language, '批量填价', 'Set all prices')
              : I18n.text(this.language, '批量填库存', 'Set all stock')).fontSize(20).fontWeight(FontWeight.Bold);
            IBestField({
              value: $batchValue,
              label: this.batchMode === 'price' ? I18n.text(this.language, '批发价', 'Wholesale price') : I18n.text(this.language, '库存数', 'Stock'),
              placeholder: this.batchMode === 'price'
                ? I18n.text(this.language, '填写批发价，自动计算零售价和会员价', 'Retail and member prices are calculated automatically')
                : I18n.text(this.language, '填写所有 SKU 的库存', 'Set stock for every SKU'),
              type: this.batchMode === 'price' ? 'decimal' : 'number'
            });
            if (this.batchMode === 'price') {
              Text(I18n.text(this.language, '零售价按批发价 × 1.3，会员价按批发价 × 1.1 自动填入，之后仍可单独修改。',
                'Retail is wholesale × 1.3 and member price is wholesale × 1.1. Each SKU can still be edited.'))
                .fontSize(11).lineHeight(18).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
            }
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', onBtnClick: () => { this.batchEditorVisible = false; } });
              IBestButton({ text: I18n.text(this.language, '应用全部', 'Apply to all'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', onBtnClick: () => this.applyBatch() });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 });
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true);
  }
}
