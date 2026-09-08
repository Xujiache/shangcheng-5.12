import {
  IBestButton, IBestDialogUtil, IBestEmpty, IBestField, IBestNavBar, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { CategoryItem, CategoryMutation } from './ProductModels';
import { ProductRepository } from './ProductRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function CategoryManagerBuilder(_: string) { CategoryPage(); }

@Component
struct CategoryPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private categories: CategoryItem[] = [];
  @State private platformCategories: CategoryItem[] = [];
  @State private loading: boolean = true;
  @State private errorMessage: string = '';
  @State private editingId: string = '';
  @State private editingName: string = '';
  @State private editingParentId: string = '';
  @State private editorVisible: boolean = false;
  @State private showPlatform: boolean = false;
  @State private saving: boolean = false;
  @State private workingId: string = '';

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    this.loading = true;
    this.errorMessage = '';
    let merchantLoaded: boolean = false;
    try {
      this.categories = await ProductRepository.merchantCategories();
      merchantLoaded = true;
    } catch (error) {
      this.errorMessage = error instanceof ApiError ? error.message : 'i18n:category-load';
    }
    try {
      this.platformCategories = await ProductRepository.platformCategories();
    } catch (_) {
      if (merchantLoaded) {
        IBestToast.show(I18n.text(this.language,
          '平台标准分类暂时无法加载，自定义分类仍可管理',
          'Platform categories are temporarily unavailable. Custom categories remain manageable.'));
      }
    }
    this.loading = false;
  }

  private roots(list: CategoryItem[]): CategoryItem[] {
    return list.filter((item: CategoryItem): boolean => !item.parentId)
      .sort((a: CategoryItem, b: CategoryItem): number => a.sort - b.sort);
  }

  private children(list: CategoryItem[], parentId: string): CategoryItem[] {
    return list.filter((item: CategoryItem): boolean => item.parentId === parentId)
      .sort((a: CategoryItem, b: CategoryItem): number => a.sort - b.sort);
  }

  private parentName(): string {
    return this.categories.find((item: CategoryItem): boolean => item.id === this.editingParentId)?.name || '';
  }

  private openEditor(item?: CategoryItem, parentId: string = ''): void {
    this.editingId = item?.id || '';
    this.editingName = item?.name || '';
    this.editingParentId = item?.parentId || parentId;
    this.editorVisible = true;
  }

  private async save(): Promise<void> {
    if (this.saving || this.workingId) return;
    if (!this.editingName.trim()) {
      IBestToast.show(I18n.text(this.language, '请输入分类名称', 'Enter a category name'));
      return;
    }
    if (this.editingName.trim().length > 10) {
      IBestToast.show(I18n.text(this.language, '分类名称不能超过10个字', 'Category name cannot exceed 10 characters'));
      return;
    }
    const body: CategoryMutation = {
      name: this.editingName.trim(),
      parentId: this.editingParentId || undefined
    };
    this.saving = true;
    try {
      if (this.editingId) await ProductRepository.updateCategory(this.editingId, body);
      else await ProductRepository.createCategory(body);
      this.editorVisible = false;
      IBestToast.show(I18n.text(this.language, '分类已保存', 'Category saved'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.saving = false;
    }
  }

  private confirmDelete(item: CategoryItem): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '删除分类', 'Delete category'),
      message: I18n.text(this.language,
        `确定删除“${item.name}”吗？该分类下的商品将变为未分类。`,
        `Delete “${item.name}”? Products in it will become uncategorized.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => { this.remove(item.id); }
    });
  }

  private async remove(id: string): Promise<void> {
    if (this.workingId || this.saving) return;
    this.workingId = id;
    try {
      await ProductRepository.deleteCategory(id);
      IBestToast.show(I18n.text(this.language, '已删除', 'Deleted'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '删除失败', 'Failed to delete'));
    } finally {
      this.workingId = '';
    }
  }

  private async move(item: CategoryItem, offset: number): Promise<void> {
    if (this.workingId || this.saving) return;
    const siblings = item.parentId ? this.children(this.categories, item.parentId) : this.roots(this.categories);
    const index = siblings.findIndex((current: CategoryItem): boolean => current.id === item.id);
    const target = index + offset;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const selected = siblings[index];
    siblings[index] = siblings[target];
    siblings[target] = selected;
    this.workingId = item.id;
    try {
      await ProductRepository.sortCategories(siblings.map((current: CategoryItem): string => current.id));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '排序保存失败', 'Failed to save order'));
    } finally {
      this.workingId = '';
    }
  }

  private siblingIndex(item: CategoryItem): number {
    const siblings = item.parentId ? this.children(this.categories, item.parentId) : this.roots(this.categories);
    return siblings.findIndex((current: CategoryItem): boolean => current.id === item.id);
  }

  private siblingCount(item: CategoryItem): number {
    return item.parentId ? this.children(this.categories, item.parentId).length : this.roots(this.categories).length;
  }

  @Builder
  private controls(item: CategoryItem) {
    Row({ space: 5 }) {
      IBestButton({ text: '↑', plain: true, disabled: this.workingId.length > 0 || this.saving || this.siblingIndex(item) <= 0, onBtnClick: () => this.move(item, -1) });
      IBestButton({ text: '↓', plain: true, disabled: this.workingId.length > 0 || this.saving || this.siblingIndex(item) >= this.siblingCount(item) - 1, onBtnClick: () => this.move(item, 1) });
      IBestButton({ text: I18n.text(this.language, '编辑', 'Edit'), plain: true, color: DesignTokens.brand(this.darkMode), disabled: this.workingId.length > 0 || this.saving, onBtnClick: () => this.openEditor(item) });
      IBestButton({ text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', loading: this.workingId === item.id, disabled: this.workingId.length > 0 || this.saving, onBtnClick: () => this.confirmDelete(item) });
    }
  }

  @Builder
  private customRoot(item: CategoryItem) {
    Column() {
      Row({ space: 8 }) {
        Column({ space: 4 }) {
          Row({ space: 6 }) {
            Text(item.name).fontSize(16).fontWeight(FontWeight.Bold);
            IBestTag({ text: I18n.text(this.language, '一级', 'Primary'), plain: true, color: DesignTokens.brand(this.darkMode) });
          }
          Text(I18n.text(this.language, `${this.children(this.categories, item.id).length} 个子分类`,
            `${this.children(this.categories, item.id).length} subcategories`)).fontSize(11)
            .fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        this.controls(item);
      }.width('100%').padding({ bottom: 10 });
      ForEach(this.children(this.categories, item.id), (child: CategoryItem) => {
        Row({ space: 8 }) {
          Text('└').fontSize(16).fontColor('#B0B5BE');
          Text(child.name).fontSize(14).layoutWeight(1).maxLines(1);
          this.controls(child);
        }.width('100%').padding({ top: 8, bottom: 8, left: 8 })
          .border({ width: { top: 1 }, color: DesignTokens.border(this.darkMode) });
      }, (child: CategoryItem) => child.id);
      IBestButton({
        text: I18n.text(this.language, '添加子分类', 'Add subcategory'), plain: true, color: DesignTokens.brand(this.darkMode),
        btnWidth: '100%', onBtnClick: () => this.openEditor(undefined, item.id)
      });
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  @Builder
  private platformRoot(item: CategoryItem) {
    Column({ space: 8 }) {
      Row() {
        Text(item.name).fontSize(15).fontWeight(FontWeight.Medium).layoutWeight(1);
        Text(I18n.text(this.language, `${this.children(this.platformCategories, item.id).length} 个二级分类`,
          `${this.children(this.platformCategories, item.id).length} secondary categories`))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }.width('100%');
      Flex({ wrap: FlexWrap.Wrap }) {
        ForEach(this.children(this.platformCategories, item.id), (child: CategoryItem) => {
          Text(child.name).fontSize(11).padding({ left: 9, right: 9, top: 6, bottom: 6 })
            .margin({ right: 6, bottom: 6 }).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(14);
        }, (child: CategoryItem) => child.id);
      }.width('100%');
    }.width('100%').padding(12).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(12);
  }

  @Builder
  private editor() {
    Column({ space: 16 }) {
      Row() {
        Text(this.editingId ? I18n.text(this.language, '编辑分类', 'Edit category')
          : this.editingParentId ? I18n.text(this.language, '新增子分类', 'Add subcategory')
            : I18n.text(this.language, '新增一级分类', 'Add primary category'))
          .fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
        Text(I18n.text(this.language, '关闭', 'Close')).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).onClick(() => this.editorVisible = false);
      }.width('100%');
      if (this.editingParentId) {
        Row() {
          Text(I18n.text(this.language, '所属一级分类', 'Primary category')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
          Text(this.parentName()).fontSize(14).fontWeight(FontWeight.Medium);
        }.width('100%');
      }
      IBestField({ value: $editingName, label: I18n.text(this.language, '分类名称', 'Category name'), placeholder: I18n.text(this.language, '不超过10个字', 'Up to 10 characters'), maxlength: 10, hasBorder: false });
      IBestButton({ text: I18n.text(this.language, '保存', 'Save'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%', loading: this.saving, disabled: this.saving || this.workingId.length > 0, onBtnClick: () => this.save() });
    }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '商品分类', 'Product categories'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(32).height(32).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else if (this.errorMessage) {
          Column({ space: 12 }) {
            IBestEmpty({ description: I18n.state(this.language, this.errorMessage), emptyImage: 'network' });
            IBestButton({ text: I18n.text(this.language, '重试', 'Retry'), color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.load() });
          }.layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 12 }) {
              Row() {
                Column({ space: 3 }) {
                  Text(I18n.text(this.language, '自定义分类', 'Custom categories')).fontSize(18).fontWeight(FontWeight.Bold);
                  Text(I18n.text(this.language, '支持两级分类与同级排序', 'Two levels with custom ordering')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                IBestButton({ text: I18n.text(this.language, '新增一级', 'Add primary'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.openEditor() });
              }.width('100%');
              if (this.roots(this.categories).length === 0) IBestEmpty({ description: I18n.text(this.language, '暂无自定义分类', 'No custom categories') });
              ForEach(this.roots(this.categories), (item: CategoryItem) => { this.customRoot(item); }, (item: CategoryItem) => item.id);
              Row() {
                Column({ space: 3 }) {
                  Text(I18n.text(this.language, '平台标准分类', 'Platform categories')).fontSize(18).fontWeight(FontWeight.Bold);
                  Text(I18n.text(this.language, '只读，用于商品审核和商城统一归类', 'Read-only categories used for review and storefront consistency')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                Text(this.showPlatform ? I18n.text(this.language, '收起', 'Collapse') : I18n.text(this.language, '查看全部', 'View all')).fontSize(13).fontColor(DesignTokens.brand(this.darkMode))
                  .onClick(() => this.showPlatform = !this.showPlatform);
              }.width('100%').padding({ top: 8 });
              if (this.showPlatform) {
                ForEach(this.roots(this.platformCategories), (item: CategoryItem) => { this.platformRoot(item); }, (item: CategoryItem) => item.id);
              }
            }.width('100%').padding({ left: 16, right: 16, top: 14, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode))
        .bindSheet(this.editorVisible, this.editor(), {
          height: SheetSize.MEDIUM,
          onWillDismiss: () => { this.editorVisible = false; }
        });
    }.hideTitleBar(true);
  }
}
