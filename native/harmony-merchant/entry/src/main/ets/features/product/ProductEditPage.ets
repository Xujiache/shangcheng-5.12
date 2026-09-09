import { KeyboardAvoidMode } from '@kit.ArkUI';
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
import { ProductImageItem, ProductImageQueue } from './ProductImageQueue';
import { ProductEditPolicy, ProductEditSession, ProductFieldError } from './ProductEditPolicy';
import { ProductMediaEditor } from './ProductMediaEditor';
import { EditorHeading, EditorActionRow, EditorChoice, EditorNumberField } from './ProductEditorControls';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { SessionStore } from '../../core/storage/SessionStore';

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
  @State private descriptionExpanded: boolean = false;
  @State private directSku: boolean = false;
  @State private images: ProductImageItem[] = [];
  @State private detailImages: ProductImageItem[] = [];
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
  @State private skuActive: boolean = true;
  private previousKeyboardMode: KeyboardAvoidMode = KeyboardAvoidMode.OFFSET;
  private ownsKeyboardMode: boolean = false;

  @State private loadFailed: boolean = false;
  @State private errors: ProductFieldError[] = [];
  @State private optionsVisible: boolean = false;
  @State private detailVisible: boolean = false;
  @State private detailDraft: ProductImageItem[] = [];
  private mediaOperation: number = 0;
  @State private categoryVisible: boolean = false;
  @State private categoryStore: boolean = false;
  @State private categoryDraft: string = '';
  @State private categorySearch: string = '';
  @State private editorSkus: ProductSku[] = [];
  @State private editorGroups: ProductSpecGroup[] = [];
  private session: ProductEditSession = new ProductEditSession();
  private mediaQueue: ProductImageQueue = new ProductImageQueue();
  private scroller: Scroller = new Scroller();
  private epoch: number = 0;
  private owner: string = '';
  private skuEpoch: number = 0;

  aboutToAppear(): void { this.epoch = this.session.begin(); this.owner = SessionStore.shared().user?.id || ''; this.initialize(); }
  aboutToDisappear(): void { this.session.invalidate(); this.mediaQueue.cancel(); this.skuEpoch += 1; this.restoreKeyboard(); }
  private activateKeyboard(): void {
    if (this.ownsKeyboardMode) return;
    this.previousKeyboardMode = this.getUIContext().getKeyboardAvoidMode();
    this.getUIContext().setKeyboardAvoidMode(KeyboardAvoidMode.RESIZE); this.ownsKeyboardMode = true;
  }
  private restoreKeyboard(): void {
    if (!this.ownsKeyboardMode) return;
    this.getUIContext().setKeyboardAvoidMode(this.previousKeyboardMode); this.ownsKeyboardMode = false;
  }
  private current(): boolean { return this.session.current(this.epoch) && this.owner === (SessionStore.shared().user?.id || ''); }


  private async initialize(): Promise<void> {
    if (this.loading) return;
    this.loading = true; this.loadFailed = false;
    try {
      const categories = await ProductRepository.platformCategories();
      if (!this.current()) return;
      this.categories = this.flattenCategories(categories);
      try {
        const store = await ProductRepository.merchantCategories();
        if (!this.current()) return;
        this.merchantCategories = this.flattenCategories(store);
      } catch (_) { if (this.current()) this.merchantCategories = []; }
      if (this.params.id) {
        const detail = await ProductRepository.detail(this.params.id);
        if (!this.current()) return;
        this.fill(detail);
      } else this.skus = [this.defaultSku()];
      this.session.accept(this.snapshot());
    } catch (_) { if (this.current()) this.loadFailed = true; }
    finally { if (this.current()) this.loading = false; }
  }

  private flattenCategories(source: CategoryItem[], prefix: string = ''): CategoryItem[] {
    const result: CategoryItem[] = [];
    source.forEach((item: CategoryItem) => {
      result.push({
        id: item.id, parentId: item.parentId, name: `${prefix}${item.name}`,
        icon: item.icon, sort: item.sort, type: item.type, children: item.children
      });
      if (item.children && item.children.length > 0) {
        result.push(...this.flattenCategories(item.children, `${prefix}${item.name} / `));
      }
    });
    return result;
  }

  private fill(detail: ProductDetail): void {
    this.name = detail.name;
    this.categoryId = detail.categoryId;
    this.merchantCategoryId = detail.merchantCategoryId || '';
    this.description = detail.description || '';
    this.images = ProductImageQueue.remote(detail.images || []);
    this.detailImages = ProductImageQueue.remote(detail.detailImages || []);
    this.shippingFactory = (detail.shipping || []).includes('factory');
    this.shippingLocal = (detail.shipping || []).includes('local');
    this.shippingPickup = (detail.shipping || []).includes('pickup');
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

  private addImageMenu(detail: boolean): void {
    if (this.uploading || this.saving) return;
    IBestActionSheet.show({ actions: [I18n.text(this.language, '从相册选择', 'Choose from Photos'), I18n.text(this.language, '拍照', 'Take photo')],
      cancelText: I18n.text(this.language, '取消', 'Cancel'), onSelect: (index: number) => this.addImages(detail, index === 1) });
  }

  private async addImages(detail: boolean, camera: boolean = false, replaceIndex: number = -1): Promise<void> {
    if (this.uploading || this.saving) return;
    const operation = ++this.mediaOperation;
    this.uploading = true;
    try {
      const items = detail ? this.detailDraft : this.images;
      const remaining = replaceIndex >= 0 ? 1 : (detail ? 20 : 10) - items.length;
      if (remaining <= 0) return;
      const uri = camera ? await FileUploadService.captureImage(this.getUIContext().getHostContext() as common.UIAbilityContext) : '';
      if (!this.current() || operation !== this.mediaOperation) return;
      const uris = camera ? (uri ? [uri] : []) : await FileUploadService.chooseImages(remaining);
      if (!this.current() || operation !== this.mediaOperation || !uris.length) return;
      let next = this.mediaQueue.append(items, uris, detail ? 20 : 10);
      if (replaceIndex >= 0) {
        next = items.slice();
        const replacement = this.mediaQueue.append([], uris, 1)[0];
        next[replaceIndex] = replacement;
      }
      if (detail) this.detailDraft = next; else this.images = next;
      await this.uploadImages(detail, next);
    } catch (_) { if (this.current()) IBestToast.show(I18n.text(this.language, '无法读取图片，请重试', 'Unable to read images. Try again.')); }
    finally { if (this.current() && operation === this.mediaOperation) this.uploading = false; }
  }

  private async uploadImages(detail: boolean, items: ProductImageItem[]): Promise<void> {
    await this.mediaQueue.upload(items, (uri: string) => FileUploadService.uploadImage(uri, 'product'),
      (next: ProductImageItem[]) => { if (detail) this.detailDraft = next; else this.images = next; }, () => this.current());
  }

  private failedImageMenu(index: number, detail: boolean): void {
    IBestActionSheet.show({ actions: [I18n.text(this.language, '重新上传', 'Retry upload'), I18n.text(this.language, '移除图片', 'Remove image')],
      cancelText: I18n.text(this.language, '取消', 'Cancel'), onSelect: (action: number) => { if (action === 0) this.retryImage(index, detail); else this.removeImage(index, detail); } });
  }

  private async retryImage(index: number, detail: boolean): Promise<void> {
    if (this.uploading || this.saving) return;
    const next = (detail ? this.detailDraft : this.images).slice();
    const item = next[index];
    if (!item) return;
    next[index] = new ProductImageItem(item.id, item.preview);
    const operation = ++this.mediaOperation;
    this.uploading = true;
    try { await this.uploadImages(detail, next); }
    finally { if (this.current() && operation === this.mediaOperation) this.uploading = false; }
  }

  private previewImage(index: number, detail: boolean): void {
    const source = (detail ? this.detailDraft : this.images).map((item: ProductImageItem) => item.url || item.preview);
    if (source.length) IBestImagePreview.show(source, { startIndex: index, closeOnClickImage: false, closeOnClickOverlay: true });
  }

  private imageMenu(index: number, detail: boolean): void {
    if (this.uploading || this.saving) return;
    const actions = [I18n.text(this.language, '替换图片', 'Replace image'), I18n.text(this.language, '向前移动', 'Move earlier'),
      I18n.text(this.language, '向后移动', 'Move later'), I18n.text(this.language, '删除图片', 'Delete image')];
    if (!detail) actions.push(I18n.text(this.language, '设为封面', 'Set as cover'));
    IBestActionSheet.show({ actions, cancelText: I18n.text(this.language, '取消', 'Cancel'), onSelect: (action: number) => {
      if (!this.current()) return;
      if (action === 0) {
        IBestActionSheet.show({ actions: [I18n.text(this.language, '相册', 'Photos'), I18n.text(this.language, '拍照', 'Camera')],
          cancelText: I18n.text(this.language, '取消', 'Cancel'), onSelect: (source: number) => this.addImages(detail, source === 1, index) });
      } else if (action === 3) this.removeImage(index, detail);
      else this.moveImage(index, action === 4 ? -index : action === 1 ? -1 : 1, detail);
    } });
  }

  private removeImage(index: number, detail: boolean): void {
    IBestDialogUtil.open({ title: I18n.text(this.language, '删除图片', 'Delete image'),
      message: I18n.text(this.language, '仅从当前商品移除，删除封面后下一张将成为封面。', 'Remove from this product. The next image replaces a deleted cover.'),
      showCancelButton: true, cancelButtonText: I18n.text(this.language, '取消', 'Cancel'), confirmButtonText: I18n.text(this.language, '删除', 'Delete'),
      onConfirm: () => {
        if (!this.current() || this.uploading || this.saving) return;
        if (detail) this.detailDraft = this.detailDraft.filter((_: ProductImageItem, i: number) => i !== index);
        else this.images = this.images.filter((_: ProductImageItem, i: number) => i !== index);
      } });
  }

  private moveImage(index: number, offset: number, detail: boolean): void {
    const next = (detail ? this.detailDraft : this.images).slice();
    const target = index + offset;
    if (target < 0 || target >= next.length) return;
    const item = next.splice(index, 1)[0]; next.splice(target, 0, item);
    if (detail) this.detailDraft = next; else this.images = next;
  }

  private openSku(index: number = -1): void {
    this.skuEpoch += 1; this.skuEditIndex = index;
    const sku = index >= 0 ? this.editorSkus[index] : undefined;
    this.skuImage = sku?.image || '';
    this.skuLabel = sku?.specsLabel || I18n.text(this.language, '默认规格', 'Default option');
    this.skuRetail = sku ? `${sku.priceRetail}` : '';
    this.skuWholesale = sku ? `${sku.priceWholesale}` : '';
    this.skuMember = sku ? `${sku.priceMember}` : '';
    this.skuStock = sku ? `${sku.stock}` : '';
    this.skuActive = sku?.active !== false;
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
    const epoch = this.skuEpoch;
    this.skuUploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(1, 'product');
      if (this.current() && epoch === this.skuEpoch && urls.length > 0) this.skuImage = urls[0];
    } catch (error) { if (this.current() && epoch === this.skuEpoch) IBestToast.show(error instanceof Error ? error.message
      : I18n.text(this.language, '规格图片上传失败', 'Option image upload failed')); }
    finally { if (this.current() && epoch === this.skuEpoch) this.skuUploading = false; }
  }

  private async captureSkuImage(): Promise<void> {
    if (this.skuUploading || this.saving) return;
    const epoch = this.skuEpoch;
    this.skuUploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'product');
      if (this.current() && epoch === this.skuEpoch && url) this.skuImage = url;
    } catch (error) {
      if (this.current() && epoch === this.skuEpoch) IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '规格图片拍摄上传失败', 'Failed to capture and upload option image'));
    } finally {
      if (this.current() && epoch === this.skuEpoch) this.skuUploading = false;
    }
  }

  private saveSku(): void {
    if (!this.current() || this.skuUploading || this.saving) return;
    const retail = Number(this.skuRetail);
    const wholesale = Number(this.skuWholesale);
    const member = Number(this.skuMember);
    const stock = Number(this.skuStock);
    if ([this.skuRetail, this.skuWholesale, this.skuMember, this.skuStock].some((value: string) => !value.trim()) || !Number.isFinite(retail) || retail < 0 ||
      !Number.isFinite(wholesale) || wholesale < 0 || !Number.isFinite(member) || member < 0 ||
      !Number.isInteger(stock) || stock < 0) {
      IBestToast.show(I18n.text(this.language, '请完整填写规格与价格库存', 'Complete the option, prices and stock')); return;
    }
    const previous = this.skuEditIndex >= 0 ? this.editorSkus[this.skuEditIndex] : undefined;
    const sku: ProductSku = {
      id: previous?.id,
      specs: previous?.specs || {}, specValues: previous?.specValues || [],
      specsLabel: this.skuLabel.trim() || I18n.text(this.language, '默认规格', 'Default option'), priceRetail: retail, priceWholesale: wholesale,
      priceMember: member, stock, active: this.skuActive,
      image: this.skuImage || undefined
    };
    const next = this.editorSkus.slice();
    if (this.skuEditIndex >= 0) next[this.skuEditIndex] = sku; else next.push(sku);
    this.editorSkus = next;
    // A direct edit has a single confirmation; matrix edits remain isolated until the parent panel is confirmed.
    if (this.directSku) this.skus = ProductEditPolicy.cloneSkus(next);
    this.directSku = false; this.skuEpoch += 1; this.skuEditorVisible = false;
  }

  private openSpecEditor(index: number = -1): void {
    if (index < 0 && this.editorGroups.length >= 4) {
      IBestToast.show(I18n.text(this.language, '最多添加 4 个规格', 'Up to 4 option groups'));
      return;
    }
    this.specEditIndex = index;
    const group = index >= 0 ? this.editorGroups[index] : undefined;
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
    const duplicate = this.editorGroups.some((item: ProductSpecGroup, index: number) =>
      index !== this.specEditIndex && item.name === name);
    if (duplicate) {
      IBestToast.show(I18n.text(this.language, '规格名不能重复', 'Option group names must be unique'));
      return;
    }
    const next = this.editorGroups.slice();
    const group: ProductSpecGroup = { name, values };
    if (this.specEditIndex >= 0) next[this.specEditIndex] = group; else next.push(group);
    this.editorGroups = next;
    this.regenerateSkus();
    this.specEditorVisible = false;
  }

  private confirmRemoveSpec(index: number): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '删除规格', 'Delete option group'),
      message: I18n.text(this.language, `删除“${this.editorGroups[index].name}”后，SKU 组合会重新生成。`,
        `SKU combinations will be regenerated after deleting “${this.editorGroups[index].name}”.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => {
        this.editorGroups = this.editorGroups.filter((_: ProductSpecGroup, itemIndex: number) => itemIndex !== index);
        this.regenerateSkus();
      }
    });
  }

  private specsRecord(values: string[]): Record<string, string> {
    return ProductSkuMatrix.specsRecord(this.editorGroups, values);
  }

  private regenerateSkus(): void {
    this.editorSkus = ProductSkuMatrix.regenerate(
      this.editorGroups,
      this.editorSkus,
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
    if (!this.batchValue.trim() || !Number.isFinite(value) || value < 0 || (this.batchMode === 'price' && value <= 0) || (this.batchMode === 'stock' && !Number.isInteger(value))) {
      IBestToast.show(this.batchMode === 'price'
        ? I18n.text(this.language, '请输入有效的批发价', 'Enter a valid wholesale price')
        : I18n.text(this.language, '请输入有效库存', 'Enter valid stock'));
      return;
    }
    this.editorSkus = this.editorSkus.map((sku: ProductSku): ProductSku => {
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
      this.skus = ProductSkuMatrix.regenerate(this.specGroups, this.skus, I18n.text(this.language, '默认规格', 'Default option'));
    }
  }

  private mutation(nextStatus: string): ProductMutation {
    const shipping: string[] = [];
    if (this.shippingFactory) shipping.push('factory');
    if (this.shippingLocal) shipping.push('local');
    if (this.shippingPickup) shipping.push('pickup');
    return {
      categoryId: this.categoryId, merchantCategoryId: this.merchantCategoryId || undefined,
      name: this.name.trim(), description: this.description.trim(),
      images: this.images.map((item: ProductImageItem) => item.url), detailImages: this.detailImages.map((item: ProductImageItem) => item.url),
      shipping, skus: this.skus, pricingMode: this.pricingMode, status: nextStatus,
      pricePerSqm: this.pricingMode === 'by-size' ? Number(this.pricePerSqm) : undefined,
      minLength: this.pricingMode === 'by-size' ? Number(this.minLength) : undefined,
      minWidth: this.pricingMode === 'by-size' ? Number(this.minWidth) : undefined,
      maxLength: this.pricingMode === 'by-size' ? Number(this.maxLength) : undefined,
      maxWidth: this.pricingMode === 'by-size' ? Number(this.maxWidth) : undefined,
      baseFee: this.pricingMode === 'by-size' ? Number(this.baseFee) : undefined,
      sizeUnit: this.pricingMode === 'by-size' ? this.sizeUnit : undefined
    };
  }

  private snapshot(): string { return JSON.stringify([this.mutation(this.status), this.images, this.detailImages, this.specGroups,
    this.pricePerSqm, this.minLength, this.minWidth, this.maxLength, this.maxWidth, this.baseFee, this.sizeUnit]); }

  private async save(nextStatus: string): Promise<void> {
    if (!this.current() || this.loading || this.loadFailed || this.saving || this.uploading || this.skuUploading) return;
    const body = this.mutation(nextStatus);
    this.errors = ProductEditPolicy.validate(body, this.images, this.detailImages);
    if (this.errors.length) {
      this.scroller.scrollToIndex(['images', 'basic', 'pricing', 'shipping'].indexOf(this.errors[0].section), true, ScrollAlign.START);
      return;
    }
    if (!this.session.beginSave()) return;
    body.skus = ProductSkuMatrix.normalize(this.specGroups, this.skus, I18n.text(this.language, '默认规格', 'Default option'));
    this.saving = true;
    try {
      if (this.params.id) await ProductRepository.update(this.params.id, body); else await ProductRepository.create(body);
      if (!this.current()) return;
      this.session.accept(this.snapshot());
      IBestToast.show(nextStatus === 'draft' ? I18n.text(this.language, '草稿已保存', 'Draft saved') : I18n.text(this.language, '已提交审核', 'Submitted for review'));
      AppRouter.back();
    } catch (error) {
      if (this.current()) IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败，内容已保留，请重试', 'Save failed. Your changes are kept. Try again.'));
    } finally { this.session.finishSave(); if (this.current()) this.saving = false; }
  }

  private requestBack(): void {
    if (this.saving) return;
    if (this.skuEditorVisible || this.specEditorVisible || this.batchEditorVisible) { this.closeInner(); return; }
    if (this.optionsVisible) { this.optionsVisible = false; return; }
    if (this.categoryVisible) { this.categoryVisible = false; return; }
    if (this.detailVisible) { this.closeDetails(false); return; }
    if (!this.session.dirty(this.snapshot())) { AppRouter.back(); return; }
    IBestDialogUtil.open({ title: I18n.text(this.language, '尚未保存', 'Unsaved changes'),
      message: I18n.text(this.language, '离开将放弃本次编辑，是否继续？', 'Leave and discard these changes?'), showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '继续编辑', 'Keep editing'), confirmButtonText: I18n.text(this.language, '放弃并离开', 'Discard'),
      onConfirm: () => { if (this.current() && !this.saving) { this.mediaQueue.cancel(); this.session.invalidate(); AppRouter.back(); } } });
  }

  private openDetails(): void { if (this.uploading) return; this.detailDraft = this.detailImages.slice(); this.detailVisible = true; }
  private closeDetails(commit: boolean): void {
    if (commit && this.uploading) return;
    if (commit) this.detailImages = this.detailDraft.slice();
    this.mediaOperation += 1; this.mediaQueue.cancel(); this.uploading = false; this.detailVisible = false;
  }
  private openPricing(): void {
    if (!this.current() || this.loading || this.saving) return;
    if (this.skus.length !== 1) { this.openOptions(); return; }
    this.editorSkus = ProductEditPolicy.cloneSkus(this.skus);
    this.editorGroups = ProductEditPolicy.cloneGroups(this.specGroups);
    this.directSku = true; this.openSku(0);
  }
  private openOptions(): void { this.directSku = false; this.editorSkus = ProductEditPolicy.cloneSkus(this.skus); this.editorGroups = ProductEditPolicy.cloneGroups(this.specGroups); this.optionsVisible = true; }
  private acceptOptions(): void { this.skus = ProductEditPolicy.cloneSkus(this.editorSkus); this.specGroups = ProductEditPolicy.cloneGroups(this.editorGroups); this.optionsVisible = false; }
  private closeInner(): void { this.directSku = false; this.skuEpoch += 1; this.skuUploading = false; this.skuEditorVisible = false; this.specEditorVisible = false; this.batchEditorVisible = false; }
  private openCategory(store: boolean): void { this.categoryStore = store; this.categoryDraft = store ? this.merchantCategoryId : this.categoryId; this.categorySearch = ''; this.categoryVisible = true; }
  private acceptCategory(): void { if (!this.categoryStore && !this.categoryDraft) return; if (this.categoryStore) this.merchantCategoryId = this.categoryDraft; else this.categoryId = this.categoryDraft; this.categoryVisible = false; }
  private categoryName(store: boolean): string { return (store ? this.merchantCategories : this.categories).find((item: CategoryItem) => item.id === (store ? this.merchantCategoryId : this.categoryId))?.name || ''; }
  private filteredCategories(): CategoryItem[] { const q = this.categorySearch.trim().toLocaleLowerCase(); return (this.categoryStore ? this.merchantCategories : this.categories).filter((item: CategoryItem) => item.name.toLocaleLowerCase().includes(q)); }
  private priceSummary(): string {
    const active = this.skus.filter((sku: ProductSku) => sku.active !== false);
    const prices = active.map((sku: ProductSku) => Number(sku.priceRetail)).filter((value: number) => Number.isFinite(value));
    const stock = active.reduce((sum: number, sku: ProductSku) => sum + (Number(sku.stock) || 0), 0);
    const price = this.pricingMode === 'by-size' ? `${this.skus.length} SKU`
      : `${I18n.text(this.language, '零售', 'Retail')} ${prices.length ? `¥${Math.min(...prices).toFixed(2)}` : '—'}`;
    return `${price} · ${I18n.text(this.language, '可售库存', 'Stock')} ${stock}`;
  }


  @Builder private fieldErrors(field: string) {
    ForEach(this.errors.filter((error: ProductFieldError) => error.field === field), (error: ProductFieldError) => {
      Text(I18n.text(this.language, error.zh, error.en)).fontSize(12).fontColor(DesignTokens.danger(this.darkMode)).width('100%');
    }, (error: ProductFieldError) => error.field + error.en);
  }

  @Builder private imagesSection() {
    Column({ space: 8 }) {
      Row({ space: 8 }) {
        EditorHeading({ zh: '商品图片', en: 'Product images', step: '01' }).layoutWeight(1);
        Text(`${this.images.length}/10`).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%');
      ProductMediaEditor({ items: $images, busy: this.uploading || this.saving, onAdd: () => this.addImageMenu(false),
        onPreview: (i: number) => this.previewImage(i, false), onMenu: (i: number) => this.imageMenu(i, false), onRetry: (i: number) => this.failedImageMenu(i, false) });
      this.fieldErrors('images');
      EditorActionRow({ zh: '详情图片', en: 'Detail images', inline: true, value: `${this.detailImages.length}/20`, action: () => this.openDetails() });
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }

  @Builder private basicSection() {
    Column({ space: 8 }) {
      EditorHeading({ zh: '基础信息', en: 'Basic information', step: '02' });
      Text(I18n.text(this.language, '商品名称 *', 'Product name *')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      TextInput({ text: this.name, placeholder: I18n.text(this.language, '填写清晰、易识别的商品名称', 'Enter a clear product name') })
        .height(48).fontSize(15).padding(12).borderRadius(10).backgroundColor(DesignTokens.subtle(this.darkMode))
        .fontColor(DesignTokens.text(this.darkMode)).onChange((value: string) => { this.name = value; });
      this.fieldErrors('name');
      Column() {
        EditorActionRow({ zh: '平台分类 *', en: 'Platform category *', inline: true, value: this.categoryName(false), hintZh: '请选择', hintEn: 'Select', action: () => this.openCategory(false) });
        this.fieldErrors('category');
        EditorActionRow({ zh: '店铺分类', en: 'Store category', inline: true, value: this.categoryName(true), hintZh: '选填 · 不归类', hintEn: 'Optional', action: () => this.openCategory(true) });
        EditorActionRow({ zh: this.descriptionExpanded ? '收起商品描述' : '商品描述', en: this.descriptionExpanded ? 'Hide description' : 'Description', inline: true,
          value: this.descriptionExpanded ? '' : this.description, hintZh: this.descriptionExpanded ? '收起' : '选填', hintEn: this.descriptionExpanded ? 'Collapse' : 'Optional',
          action: () => { this.descriptionExpanded = !this.descriptionExpanded; } });
      }.width('100%');
      if (this.descriptionExpanded) TextArea({ text: this.description, placeholder: I18n.text(this.language, '介绍材质、用途和商品特点', 'Describe materials, uses and features') })
        .height(96).fontSize(14).padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode))
        .borderRadius(10).onChange((value: string) => { this.description = value; });
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }

  @Builder private pricingSection() {
    Column({ space: 10 }) {
      EditorHeading({ zh: '价格与库存', en: 'Pricing and inventory', step: '03' });
      Row({ space: 8 }) {
        EditorChoice({ zh: '按规格', en: 'Per SKU', selected: this.pricingMode === 'standard', action: () => this.switchPricingMode('standard') }).layoutWeight(1);
        EditorChoice({ zh: '按尺寸', en: 'By size', selected: this.pricingMode === 'by-size', action: () => this.switchPricingMode('by-size') }).layoutWeight(1);
      }.width('100%');
      if (this.pricingMode === 'by-size') {
        Row({ space: 12 }) {
          EditorNumberField({ value: $pricePerSqm, zh: '单价（元/㎡）', en: 'Price / m²' }).layoutWeight(1);
          EditorNumberField({ value: $baseFee, zh: '基础费用（元）', en: 'Base fee' }).layoutWeight(1);
        }.width('100%');
        Row({ space: 8 }) {
          Text(I18n.text(this.language, '尺寸单位', 'Unit')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
          EditorChoice({ zh: '厘米 cm', en: 'cm', selected: this.sizeUnit === 'cm', action: () => { this.sizeUnit = 'cm'; } }).layoutWeight(1);
          EditorChoice({ zh: '米 m', en: 'm', selected: this.sizeUnit === 'm', action: () => { this.sizeUnit = 'm'; } }).layoutWeight(1);
        }.width('100%');
        Row({ space: 12 }) {
          EditorNumberField({ value: $minLength, zh: '最小长度', en: 'Min. length' }).layoutWeight(1);
          EditorNumberField({ value: $maxLength, zh: '最大长度', en: 'Max. length' }).layoutWeight(1);
        }.width('100%');
        Row({ space: 12 }) {
          EditorNumberField({ value: $minWidth, zh: '最小宽度', en: 'Min. width' }).layoutWeight(1);
          EditorNumberField({ value: $maxWidth, zh: '最大宽度', en: 'Max. width' }).layoutWeight(1);
        }.width('100%');
        Text(I18n.text(this.language, '成交价 = 长 × 宽折算平方米 × 单价 + 基础费用', 'Price = area in m² × unit rate + base fee'))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        this.fieldErrors('size');
      }
      Column() {
        EditorActionRow({ zh: '编辑价格与库存', en: 'Edit prices and stock', value: this.priceSummary(), action: () => this.openPricing() });
        this.fieldErrors('skus');
        EditorActionRow({ zh: '规格管理', en: 'Manage options', inline: true, value: `${this.specGroups.length} ${I18n.text(this.language, '组', 'groups')} · ${this.skus.length} SKU`, action: () => this.openOptions() });
        EditorActionRow({ zh: '全店价格展示', en: 'Price visibility', inline: true, hintZh: '全店通用', hintEn: 'Store-wide', action: () => AppRouter.push('PriceRule') });
      }.width('100%');
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }

  @Builder private shippingSection() {
    Column({ space: 8 }) {
      EditorHeading({ zh: '配送设置', en: 'Delivery', step: '04' });
      Text(I18n.text(this.language, '至少选择一种，可多选', 'Choose one or more methods'))
        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      Column({ space: 4 }) {
        EditorChoice({ zh: '厂家直发', en: 'Factory shipping', selected: this.shippingFactory, action: () => { this.shippingFactory = !this.shippingFactory; } });
        EditorChoice({ zh: '同城配送', en: 'Local delivery', selected: this.shippingLocal, action: () => { this.shippingLocal = !this.shippingLocal; } });
        EditorChoice({ zh: '到店自提', en: 'Store pickup', selected: this.shippingPickup, action: () => { this.shippingPickup = !this.shippingPickup; } });
      }.width('100%');
      this.fieldErrors('shipping');
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }

  @Builder private panelHeader(zh: string, en: string, close: () => void) {
    Row({ space: 12 }) {
      EditorHeading({ zh, en }).layoutWeight(1);
      Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'cross', iconSize: 22 , color: DesignTokens.muted(this.darkMode) }); }
        .width(44).height(44).backgroundColor(Color.Transparent).onClick(close)
        .accessibilityText(I18n.text(this.language, '取消编辑', 'Cancel editing'));
    }.width('100%').padding({ left: 18, right: 10, top: 8, bottom: 8 })
      .border({ width: { bottom: 0.5 }, color: DesignTokens.border(this.darkMode) });
  }

  @Builder private panelFooter(zh: string, en: string, confirm: () => void, cancel: () => void) {
    Row({ space: 12 }) {
      Button(I18n.text(this.language, '取消', 'Cancel'), { type: ButtonType.Normal }).height(48).layoutWeight(1)
        .fontSize(14).fontColor(DesignTokens.text(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12).onClick(cancel);
      Button(I18n.text(this.language, zh, en), { type: ButtonType.Normal }).height(48).layoutWeight(2)
        .fontSize(14).fontColor(DesignTokens.onBrand(this.darkMode)).backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius(12)
        .enabled(!this.skuUploading && (!this.detailVisible || !this.uploading) && (!this.categoryVisible || this.categoryStore || !!this.categoryDraft))
        .opacity(this.skuUploading || (this.detailVisible && this.uploading) || (this.categoryVisible && !this.categoryStore && !this.categoryDraft) ? 0.45 : 1).onClick(confirm);
    }.width('100%').padding({ left: 18, right: 18, top: 12, bottom: this.safeBottom + 12 })
      .backgroundColor(DesignTokens.card(this.darkMode));
  }

  @Builder private categoryPanel() {
    Column() {
      this.panelHeader(this.categoryStore ? '店铺分类' : '平台分类', this.categoryStore ? 'Store category' : 'Platform category', () => { this.categoryVisible = false; });
      TextInput({ text: this.categorySearch, placeholder: I18n.text(this.language, '搜索分类', 'Search categories') }).height(48).fontSize(14)
        .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(12)
        .margin({ left: 18, right: 18, top: 16, bottom: 12 }).onChange((value: string) => { this.categorySearch = value; });
      List({ space: 8 }) {
        if (this.categoryStore) ListItem() {
          EditorChoice({ zh: '不归类', en: 'Uncategorized', selected: !this.categoryDraft, action: () => { this.categoryDraft = ''; } });
        }
        ForEach(this.filteredCategories(), (item: CategoryItem) => {
          ListItem() { EditorChoice({ zh: item.name, en: item.name, selected: this.categoryDraft === item.id, action: () => { this.categoryDraft = item.id; } }); }
        }, (item: CategoryItem) => item.id);
        if (!this.filteredCategories().length) ListItem() {
          Text(I18n.text(this.language, '没有匹配的分类', 'No matching categories')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).padding(24);
        }
      }.layoutWeight(1).width('100%').padding({ left: 18, right: 18 }).scrollBar(BarState.Off);
      this.panelFooter('确定分类', 'Use category', () => this.acceptCategory(), () => { this.categoryVisible = false; });
    }.height('92%').width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 }).clip(true);
  }

  @Builder private detailPanel() {
    Column() {
      this.panelHeader('详情图片', 'Detail images', () => this.closeDetails(false));
      Scroll() {
        Column({ space: 16 }) {
          Text(I18n.text(this.language, '最多 20 张，按展示顺序排列。点击完成后应用到商品草稿。', 'Up to 20 images in display order. Tap Done to apply changes to this draft.'))
            .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          ProductMediaEditor({ items: $detailDraft, detail: true, busy: this.uploading, onAdd: () => this.addImageMenu(true),
            onPreview: (i: number) => this.previewImage(i, true), onMenu: (i: number) => this.imageMenu(i, true), onRetry: (i: number) => this.failedImageMenu(i, true) });
        }.width('100%').padding(18);
      }.layoutWeight(1).width('100%').align(Alignment.Top);
      this.panelFooter('完成', 'Done', () => this.closeDetails(true), () => this.closeDetails(false));
    }.height('92%').width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 }).clip(true);
  }

  @Builder private optionsPanel() {
    Column() {
      this.panelHeader('规格与库存', 'Options and inventory', () => { this.optionsVisible = false; });
      List({ space: 14 }) {
        ListItem() {
          Column({ space: 12 }) {
            Text(I18n.text(this.language, '最多 4 组规格；相同组合保留原有价格与库存。', 'Up to 4 groups. Matching combinations keep existing prices and stock.'))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
            ForEach(this.editorGroups, (group: ProductSpecGroup, i: number) => {
              Row({ space: 8 }) {
                Column({ space: 6 }) {
                  Text(group.name).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
                  Text(group.values.join(' · ')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).maxLines(2);
                }.layoutWeight(1).alignItems(HorizontalAlign.Start).onClick(() => this.openSpecEditor(i));
                Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'edit', iconSize: 20 , color: DesignTokens.muted(this.darkMode) }); }
                  .width(44).height(44).backgroundColor(Color.Transparent).onClick(() => this.openSpecEditor(i));
                Button({ type: ButtonType.Normal }) { MerchantIcon({ name: 'delete-o', iconSize: 20 , color: DesignTokens.muted(this.darkMode) }); }
                  .width(44).height(44).backgroundColor(Color.Transparent).onClick(() => this.confirmRemoveSpec(i));
              }.width('100%').padding(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12);
            }, (group: ProductSpecGroup, i: number) => `${i}-${group.name}`);
            Button(I18n.text(this.language, '添加规格组', 'Add option group'), { type: ButtonType.Normal }).width('100%').height(48)
              .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).borderRadius(12).enabled(this.editorGroups.length < 4)
              .onClick(() => this.openSpecEditor());
            Row({ space: 10 }) {
              Button(I18n.text(this.language, '批量价格', 'Set prices'), { type: ButtonType.Normal }).layoutWeight(1).height(44).borderRadius(10)
                .backgroundColor(DesignTokens.brandTint(this.darkMode)).fontColor(DesignTokens.brand(this.darkMode)).fontSize(13).onClick(() => this.openBatchEditor('price'));
              Button(I18n.text(this.language, '批量库存', 'Set stock'), { type: ButtonType.Normal }).layoutWeight(1).height(44).borderRadius(10)
                .backgroundColor(DesignTokens.brandTint(this.darkMode)).fontColor(DesignTokens.brand(this.darkMode)).fontSize(13).onClick(() => this.openBatchEditor('stock'));
            }.width('100%');
          }.width('100%');
        }
        ForEach(this.editorSkus, (sku: ProductSku, i: number) => {
          ListItem() {
            Row({ space: 12 }) {
              ResilientRemoteImage({ originalUrl: sku.image || '', widthValue: 56, heightValue: 56 });
              Column({ space: 6 }) {
                Text(sku.specsLabel).fontSize(14).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
                if (!sku.active) Text(I18n.text(this.language, '已停用', 'Disabled')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                Text(I18n.text(this.language, `零售 ¥${Number(sku.priceRetail).toFixed(2)} · 库存 ${sku.stock}`, `Retail ¥${Number(sku.priceRetail).toFixed(2)} · Stock ${sku.stock}`))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
              }.layoutWeight(1).alignItems(HorizontalAlign.Start);
              MerchantIcon({ name: 'arrow', iconSize: 18 , color: DesignTokens.muted(this.darkMode) });
            }.width('100%').padding({ top: 12, bottom: 12 }).onClick(() => this.openSku(i));
          }
        }, (sku: ProductSku, i: number) => `${i}-${JSON.stringify(sku)}`);
      }.layoutWeight(1).width('100%').padding({ left: 18, right: 18, top: 16 }).scrollBar(BarState.Off);
      this.panelFooter('完成编辑', 'Apply changes', () => this.acceptOptions(), () => { this.optionsVisible = false; });
    }.height('92%').width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 }).clip(true);
  }

  @Builder private innerPanel() {
    Column() {
      this.panelHeader(this.skuEditorVisible ? (this.directSku ? '价格与库存' : '编辑 SKU') : this.specEditorVisible ? '编辑规格组' : '批量设置',
        this.skuEditorVisible ? (this.directSku ? 'Prices and stock' : 'Edit SKU') : this.specEditorVisible ? 'Edit option group' : 'Bulk edit', () => this.closeInner());
      Scroll() {
        Column({ space: 16 }) {
          if (this.skuEditorVisible) {
            Text(this.skuLabel).fontSize(16).fontWeight(FontWeight.Medium).width('100%').fontColor(DesignTokens.text(this.darkMode));
            Row({ space: 12 }) {
              EditorNumberField({ value: $skuRetail, zh: '零售价（元）', en: 'Retail price' }).layoutWeight(1);
              EditorNumberField({ value: $skuStock, zh: '库存', en: 'Stock', integer: true }).layoutWeight(1);
            }.width('100%');
            Row({ space: 12 }) {
              EditorNumberField({ value: $skuWholesale, zh: '批发价（元）', en: 'Wholesale price' }).layoutWeight(1);
              EditorNumberField({ value: $skuMember, zh: '会员价（元）', en: 'Member price' }).layoutWeight(1);
            }.width('100%');
            Row({ space: 14 }) {
              ResilientRemoteImage({ originalUrl: this.skuImage, widthValue: 84, heightValue: 84 });
              Column({ space: 4 }) {
                Button(I18n.text(this.language, '选择图片', 'Choose image'), { type: ButtonType.Normal }).height(44).fontSize(13)
                  .backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).onClick(() => this.chooseSkuImage());
                if (this.skuImage) Button(I18n.text(this.language, '移除', 'Remove'), { type: ButtonType.Normal }).height(44).fontSize(13)
                  .backgroundColor(Color.Transparent).fontColor(DesignTokens.danger(this.darkMode)).onClick(() => { this.skuImage = ''; });
              }.layoutWeight(1).enabled(!this.skuUploading);
            }.width('100%');
            if (this.skuUploading) Text(I18n.text(this.language, '图片上传中…', 'Uploading image…')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            EditorChoice({ zh: '启用此 SKU', en: 'Enable this SKU', selected: this.skuActive, action: () => { this.skuActive = !this.skuActive; } });
          } else if (this.specEditorVisible) {
            IBestField({ value: $specName, label: I18n.text(this.language, '规格名称', 'Option name'), placeholder: I18n.text(this.language, '例如：颜色', 'Example: Colour') });
            TextArea({ text: this.specValuesText, placeholder: I18n.text(this.language, '填写规格值，使用逗号分隔', 'Enter values separated by commas') })
              .height(140).padding(14).fontSize(15).fontColor(DesignTokens.text(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(12)
              .onChange((value: string) => { this.specValuesText = value; });
            Text(I18n.text(this.language, '新增组合以默认价格和库存开始；未改变的组合保留原值。', 'New combinations start with default values. Unchanged combinations keep their values.'))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          } else {
            IBestField({ value: $batchValue, label: this.batchMode === 'price' ? I18n.text(this.language, '批发价', 'Wholesale price') : I18n.text(this.language, '库存', 'Stock'), placeholder: '0', type: this.batchMode === 'price' ? 'decimal' : 'number' });
            Text(this.batchMode === 'price' ? I18n.text(this.language, '零售价 = 批发价 × 1.3；会员价 = 批发价 × 1.1。之后可单独修改。', 'Retail = wholesale × 1.3; member = wholesale × 1.1. You can edit each SKU later.')
              : I18n.text(this.language, '将所有 SKU 的库存设为此整数，不是增加库存。', 'Replace every SKU stock with this whole number; this does not add stock.'))
              .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
          }
        }.width('100%').padding(18);
      }.layoutWeight(1).width('100%').align(Alignment.Top).scrollBar(BarState.Off);
      this.panelFooter(this.directSku ? '应用到商品' : '保存修改', this.directSku ? 'Apply to product' : 'Save changes', () => { if (this.skuEditorVisible) this.saveSku(); else if (this.specEditorVisible) this.saveSpecGroup(); else this.applyBatch(); }, () => this.closeInner());
    }.height('92%').width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 }).clip(true);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: this.params.id ? I18n.text(this.language, '编辑商品', 'Edit product') : I18n.text(this.language, '新增商品', 'Add product'),
            isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.requestBack() });
          if (this.loading) {
            Column({ space: 16 }) {
              LoadingProgress().width(30).height(30).color(DesignTokens.brand(this.darkMode));
              Text(I18n.text(this.language, '正在准备商品信息', 'Preparing product details')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.loadFailed) {
            Column({ space: 16 }) {
              MerchantIcon({ name: 'replay', iconSize: 36 , color: DesignTokens.muted(this.darkMode) });
              Text(I18n.text(this.language, '商品信息暂时无法加载', 'Unable to load product details')).fontSize(15).fontColor(DesignTokens.text(this.darkMode));
              Button(I18n.text(this.language, '重新加载', 'Retry')).onClick(() => this.initialize());
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            List({ space: 10, scroller: this.scroller }) {
              ListItem() { this.imagesSection(); }
              ListItem() { this.basicSection(); }
              ListItem() { this.pricingSection(); }
              ListItem() { this.shippingSection(); }
            }.layoutWeight(1).width('100%').constraintSize({ maxWidth: 760 }).padding({ left: 16, right: 16, top: 14, bottom: 18 })
              .scrollBar(BarState.Off).enabled(!this.saving);
            Row({ space: 12 }) {
              Button(I18n.text(this.language, '保存草稿', 'Save draft'), { type: ButtonType.Normal }).height(50).layoutWeight(1).fontSize(14)
                .borderRadius(12).backgroundColor(DesignTokens.subtle(this.darkMode)).fontColor(DesignTokens.text(this.darkMode)).onClick(() => this.save('draft'));
              Button(this.saving ? I18n.text(this.language, '保存中…', 'Saving…') : I18n.text(this.language, '提交审核', 'Submit for review'), { type: ButtonType.Normal })
                .height(50).layoutWeight(1.5).fontSize(14).fontWeight(FontWeight.Medium).borderRadius(12)
                .backgroundColor(DesignTokens.brand(this.darkMode)).fontColor(DesignTokens.onBrand(this.darkMode)).onClick(() => this.save('auditing'));
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 10 })
              .backgroundColor(DesignTokens.card(this.darkMode)).enabled(!this.saving && !this.uploading && !this.skuUploading)
              .opacity(this.saving || this.uploading ? 0.55 : 1);
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
          .enabled(!this.categoryVisible && !this.optionsVisible && !this.detailVisible && !this.skuEditorVisible && !this.specEditorVisible && !this.batchEditorVisible);
        if (this.categoryVisible || this.optionsVisible || this.detailVisible) {
          Column().width('100%').height('100%').backgroundColor('#66000000').onClick(() => this.requestBack());
          if (this.categoryVisible) this.categoryPanel();
          if (this.detailVisible) this.detailPanel();
          if (this.optionsVisible) this.optionsPanel();
        }
        if (this.skuEditorVisible || this.specEditorVisible || this.batchEditorVisible) {
          Column().width('100%').height('100%').backgroundColor('#66000000').onClick(() => this.closeInner());
          this.innerPanel();
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onShown(() => this.activateKeyboard()).onHidden(() => this.restoreKeyboard()).onBackPressed(() => { this.requestBack(); return true; });
  }
}
