import { PageReadScope, PageSearch, SecondaryPolicy } from '../../core/ui/SecondaryPolicy';
import { SecondaryFeedback, SecondaryHeader } from '../../core/ui/SecondaryPage';
import {
  IBestButton, IBestDialogUtil, IBestEmpty, IBestSearch, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { LengthMetrics } from '@kit.ArkUI';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import {
  AgencyRequest, PageResult, PlazaFactory, PlazaFilterOption, PlazaFilterOptions, PlazaProduct
} from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function PlazaBuilder(_: string) { PlazaPage(); }

@Component
struct PlazaPage {
  private pageSearch: PageSearch = new PageSearch();
  private submitSearch(): void { this.pageSearch.cancel(); this.load(); }
  @State private draftScope: string = 'stores';
  @State private visibilityReady: boolean = false;
  private visibleFilter: string = '';
  private handleBack(): void {
    if (this.savingVisibility || this.applyingProductId || this.ratingFactoryId) return;
    if (this.showFilters || this.showVisibility) { this.showFilters = false; this.showVisibility = false; return; }
    AppRouter.back();
  }
  aboutToDisappear(): void { this.pageSearch.cancel(); this.pageScope.dispose(); }

  private pageScope: PageReadScope = new PageReadScope();
  @State private pageError: string = '';

  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private mode: string = 'products';
  @State private keyword: string = '';
  @State private region: string = '';
  @State private category: string = '';
  @State private minRating: number = 0;
  @State private activeTag: string = '';
  @State private draftRegion: string = '';
  @State private draftCategory: string = '';
  @State private draftMinRating: number = 0;
  @State private draftTag: string = '';
  @State private plazaScope: string = 'stores';
  @State private products: PlazaProduct[] = [];
  @State private factories: PlazaFactory[] = [];
  @State private filterOptions: PlazaFilterOptions = {
    productTags: [], regions: [], categories: [], ratingOptions: []
  };
  @State private page: number = 1;
  @State private total: number = 0;
  @State private loading: boolean = true;
  @State private loadingMore: boolean = false;
  @State private showFilters: boolean = false;
  @State private showVisibility: boolean = false;
  @State private applyingProductId: string = '';
  @State private ratingFactoryId: string = '';
  @State private savingVisibility: boolean = false;
  private requestEpoch: number = 0;

  aboutToAppear(): void { this.pageScope.open();
    this.load();
    this.loadVisibility();
    this.loadFilterOptions();
  }

  private async loadFilterOptions(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('loadFilterOptions');
    this.pageError = '';
    try {
      this.filterOptions = await this.pageScope.read(BusinessRepository.plazaFilterOptions(), pageTicket);
    } catch (_) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(_);
      this.filterOptions = {
        productTags: [
          { value: I18n.contract('🔥本周热推'), label: I18n.contract('🔥本周热推') },
          { value: I18n.contract('新品'), label: I18n.contract('新品') },
          { value: I18n.contract('厂家直供'), label: I18n.contract('厂家直供') },
          { value: I18n.contract('高佣金'), label: I18n.contract('高佣金') }
        ],
        regions: [], categories: [],
        ratingOptions: [
          { value: '0', label: I18n.contract('不限') },
          { value: '3', label: '3+' }, { value: '4', label: '4+' }, { value: '5', label: '5' }
        ]
      };
    }
  }

  private optionLabel(option: PlazaFilterOption): string {
    if (option.value === I18n.contract('🔥本周热推')) return I18n.text(this.language, '本周热推', 'Trending');
    if (option.value === I18n.contract('新品')) return I18n.text(this.language, '新品', 'New');
    if (option.value === I18n.contract('厂家直供')) return I18n.text(this.language, '厂家直供', 'Factory direct');
    if (option.value === I18n.contract('高佣金')) return I18n.text(this.language, '高佣金', 'High commission');
    if (option.value === '0') return I18n.text(this.language, '不限', 'Any');
    return option.label;
  }

  private async loadVisibility(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('loadVisibility');
    this.pageError = '';
    try { this.plazaScope = (await this.pageScope.read(BusinessRepository.plazaVisibility(), pageTicket)).scope; this.visibilityReady = true; } catch (_) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(_); }
  }

  private async saveVisibility(scope: string): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (scope === this.plazaScope || this.savingVisibility) return;
    if (!this.visibilityReady) return;
    this.savingVisibility = true;
    const mutationTicket = this.pageScope.begin('saveVisibility');
    try {
      const result = await this.pageScope.read(BusinessRepository.savePlazaVisibility(scope), mutationTicket);
      this.plazaScope = result.scope;
      this.showVisibility = false;
      IBestToast.show(scope === 'public'
        ? I18n.text(this.language, '广场商品已对所有客户可见', 'Products are visible to all customers')
        : I18n.text(this.language, '广场商品仅授权门店可见', 'Products are visible only to authorised stores'));
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language)
        : I18n.text(this.language, '可见范围保存失败', 'Failed to save visibility'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.savingVisibility = false;
    }
    }
  }

  private async load(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('load');
    this.pageError = '';
    const epoch = ++this.requestEpoch;
    const requestedMode = this.mode;
    const condition = JSON.stringify([this.mode, this.keyword.trim(), this.region, this.category, this.minRating, this.activeTag]);
    if (condition !== this.visibleFilter) { this.products = []; this.factories = []; this.total = 0; this.page = 1; }
    this.visibleFilter = condition;
    this.loading = true;
    try {
      if (requestedMode === 'products') {
        const result = await this.pageScope.read(BusinessRepository.plazaProducts(this.keyword.trim(), 1, '', this.activeTag), pageTicket);
        if (epoch !== this.requestEpoch) return;
        this.products = result.list; this.page = 1;
        this.total = result.total;
      } else {
        const result = await this.pageScope.read(BusinessRepository.plazaFactories(
          this.keyword.trim(), this.region.trim(), this.category.trim(), this.minRating
        ), pageTicket);
        if (epoch !== this.requestEpoch) return;
        this.factories = result;
      }
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      if (epoch === this.requestEpoch) {
        IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language)
          : I18n.text(this.language, '选品数据加载失败', 'Failed to load sourcing data'));
      }
    } finally {
      if (this.pageScope.accepts(pageTicket)) {
      if (epoch === this.requestEpoch) this.loading = false;
    }
    }
  }

  private async loadMore(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.mode !== 'products' || this.loadingMore || this.products.length >= this.total) return;
    const pageTicket = this.pageScope.begin('loadMore');
    this.pageError = '';
    const epoch = this.requestEpoch;
    this.loadingMore = true;
    try {
      const next = this.page + 1;
      const result: PageResult<PlazaProduct> = await this.pageScope.read(BusinessRepository.plazaProducts(
        this.keyword.trim(), next, '', this.activeTag
      ), pageTicket);
      if (epoch !== this.requestEpoch) return;
      this.products = this.products.concat(result.list);
      this.page = next;
      this.total = result.total;
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      if (epoch === this.requestEpoch) {
        IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language)
          : I18n.text(this.language, '加载更多失败', 'Failed to load more'));
      }
    } finally {
      if (this.pageScope.accepts(pageTicket)) {
      this.loadingMore = false;
    }
    }
  }

  private switchMode(next: string): void {
    if (next === this.mode) return;
    this.mode = next;
    this.showFilters = false;
    this.showVisibility = false;
    this.load();
  }

  private openFilters(): void {
    this.draftTag = this.activeTag;
    this.draftRegion = this.region;
    this.draftCategory = this.category;
    this.draftMinRating = this.minRating;
    this.showVisibility = false;
    this.showFilters = true;
  }

  private resetDraft(): void {
    if (this.mode === 'products') this.draftTag = '';
    else {
      this.draftRegion = '';
      this.draftCategory = '';
      this.draftMinRating = 0;
    }
  }

  private applyFilters(): void {
    if (this.activeTag === this.draftTag && this.region === this.draftRegion && this.category === this.draftCategory && this.minRating === this.draftMinRating) { this.showFilters = false; return; }
    this.activeTag = this.draftTag;
    this.region = this.draftRegion;
    this.category = this.draftCategory;
    this.minRating = this.draftMinRating;
    this.showFilters = false;
    this.load();
  }

  private filterCount(): number {
    if (this.mode === 'products') return this.activeTag ? 1 : 0;
    return (this.region ? 1 : 0) + (this.category ? 1 : 0) + (this.minRating > 0 ? 1 : 0);
  }

  private confirmAgency(item: PlazaProduct): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '申请代理', 'Apply for agency'),
      message: I18n.text(this.language,
        `申请代理“${item.productName}”？\n建议加价 ¥${item.suggestMarkupMin || 15}~${item.suggestMarkupMax || 40} · 佣金 ${item.suggestCommission || 5}%`,
        `Apply to sell “${item.productName}”?\nSuggested markup ¥${item.suggestMarkupMin || 15}~${item.suggestMarkupMax || 40} · Commission ${item.suggestCommission || 5}%`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '提交申请', 'Submit'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => this.apply(item)
    });
  }

  private async apply(item: PlazaProduct): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.applyingProductId) return;
    const body: AgencyRequest = {
      factoryId: item.factoryId,
      productIds: [item.productId],
      markupPercent: item.suggestMarkupMin || 15,
      autoSyncPrice: true,
      message: ''
    };
    this.applyingProductId = item.productId;
    const mutationTicket = this.pageScope.begin('apply');
    try {
      await this.pageScope.read(BusinessRepository.applyAgency(body), mutationTicket);
      IBestToast.show(I18n.text(this.language, '已提交，待厂家审核', 'Submitted for factory review'));
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language)
        : I18n.text(this.language, '申请失败', 'Request failed'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.applyingProductId = '';
    }
    }
  }

  private async rateFactory(item: PlazaFactory, score: number): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.ratingFactoryId) return;
    this.ratingFactoryId = item.id;
    const mutationTicket = this.pageScope.begin('rateFactory');
    try {
      const result = await this.pageScope.read(BusinessRepository.rateFactory(item.id, score), mutationTicket);
      item.rating = result.rating;
      item.ratingCount = result.ratingCount;
      this.factories = this.factories.slice();
      IBestToast.show(I18n.text(this.language, `已评价 ${score} 星`, `Rated ${score} stars`));
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language)
        : I18n.text(this.language, '评价失败', 'Failed to submit rating'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.ratingFactoryId = '';
    }
    }
  }

  @Builder
  private productCard(item: PlazaProduct) {
    Row({ space: 12 }) {
      ResilientRemoteImage({
        thumbnailUrl: item.productImageThumb || '', originalUrl: item.productImage,
        widthValue: 96, heightValue: 96, radius: 14
      });
      Column({ space: 6 }) {
        Row({ space: 5 }) {
          Text(item.productName).fontSize(15).fontWeight(FontWeight.Medium).maxLines(2).layoutWeight(1)
            .fontColor(DesignTokens.text(this.darkMode));
          if (item.isPlatformPushed) {
            IBestTag({ text: I18n.text(this.language, '推荐', 'Featured'), color: DesignTokens.brand(this.darkMode), plain: true });
          }
        }.width('100%');
        Text(item.factoryName).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(1);
        if ((item.tags || []).length > 0) {
          Text((item.tags || []).slice(0, 2).join(' · ')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).maxLines(1).width('100%');
        }
        Row() {
          Column({ space: 2 }) {
            Text(I18n.text(this.language, `¥${item.startPrice.toFixed(2)} 起`, `From ¥${item.startPrice.toFixed(2)}`))
              .fontSize(16).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
            Text(I18n.text(this.language, `${item.agencyCount} 位商家代理`, `${item.agencyCount} agents`))
              .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          }.alignItems(HorizontalAlign.Start);
          Blank();
          IBestButton({ btnHeight: 44,
            text: this.applyingProductId === item.productId
              ? I18n.text(this.language, '提交中', 'Submitting') : I18n.text(this.language, '申请代理', 'Apply'),
            type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), buttonSize: 'small',
            loading: this.applyingProductId === item.productId, disabled: this.applyingProductId.length > 0,
            onBtnClick: () => this.confirmAgency(item)
          });
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(13).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(16).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private factoryCard(item: PlazaFactory) {
    Row({ space: 12 }) {
      ResilientRemoteImage({
        thumbnailUrl: item.logoThumb || '', originalUrl: item.logo,
        widthValue: 68, heightValue: 68, radius: 14
      });
      Column({ space: 6 }) {
        Row({ space: 6 }) {
          Text(item.name).fontSize(16).fontWeight(FontWeight.Medium).layoutWeight(1).maxLines(1)
            .fontColor(DesignTokens.text(this.darkMode));
          IBestTag({ text: `${item.rating.toFixed(1)} ★`, plain: true, color: DesignTokens.brand(this.darkMode) });
        }.width('100%');
        Text(I18n.text(this.language, `${item.region || '未知地区'} · ${(item.categories || []).join(' / ') || '综合门窗'}`,
          `${item.region || 'Unknown'} · ${(item.categories || []).join(' / ') || 'General'}`))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1).width('100%');
        Row() {
          Text(I18n.text(this.language, `${item.productCount || 0} 商品 · ${item.agencyCount || 0} 代理`,
            `${item.productCount || 0} products · ${item.agencyCount || 0} agents`))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          Blank();
          Row({ space: 3 }) {
            ForEach([1, 2, 3, 4, 5], (score: number) => {
              MerchantIcon({ name: 'star', color: DesignTokens.brand(this.darkMode), iconSize: 15 })
                .opacity(this.ratingFactoryId ? 0.55 : 1)
                .onClick(() => this.rateFactory(item, score));
            });
          }
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start)
        .onClick(() => AppRouter.push('FactoryDetail', new IdRouteParams(item.id)));
    }.width('100%').padding(13).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(16).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private optionChip(option: PlazaFilterOption, selected: boolean, onSelect: () => void) {
    Text(this.optionLabel(option)).fontSize(12).fontColor(selected ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode))
      .padding({ left: 13, right: 13, top: 8, bottom: 8 })
      .backgroundColor(selected ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .constraintSize({ minHeight: 44 }).borderRadius(10).onClick(onSelect);
  }

  @Builder
  private optionGroup(title: string, options: PlazaFilterOption[], selected: string, onSelect: (value: string) => void) {
    Column({ space: 9 }) {
      Text(title).fontSize(13).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).width('100%');
      Flex({ wrap: FlexWrap.Wrap, space: { main: LengthMetrics.vp(8), cross: LengthMetrics.vp(8) } }) {
        if (!options.some((item: PlazaFilterOption): boolean => item.value === '0')) {
          this.optionChip({ value: '', label: I18n.text(this.language, '不限', 'Any') }, selected === '', () => onSelect(''));
        }
        ForEach(options, (item: PlazaFilterOption) => {
          this.optionChip(item, selected === item.value, () => onSelect(item.value));
        }, (item: PlazaFilterOption) => item.value);
      }.width('100%');
    }.width('100%').alignItems(HorizontalAlign.Start);
  }

  @Builder
  private filterPanel() {
    Column({ space: 14 }) {
      Row() {
        Text(this.mode === 'products' ? I18n.text(this.language, '筛选货源', 'Filter products')
          : I18n.text(this.language, '筛选厂家', 'Filter factories'))
          .fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
        Blank();
        Text(I18n.text(this.language, '重置', 'Reset')).fontSize(13).fontColor(DesignTokens.brand(this.darkMode))
          .onClick(() => this.resetDraft());
      }.width('100%');
      if (this.mode === 'products') {
        this.optionGroup(I18n.text(this.language, '货源标签', 'Product tag'), this.filterOptions.productTags,
          this.draftTag, (value: string): void => { this.draftTag = value; });
      } else {
        this.optionGroup(I18n.text(this.language, '所在地区', 'Region'), this.filterOptions.regions,
          this.draftRegion, (value: string): void => { this.draftRegion = value; });
        this.optionGroup(I18n.text(this.language, '主营品类', 'Main category'), this.filterOptions.categories,
          this.draftCategory, (value: string): void => { this.draftCategory = value; });
        this.optionGroup(I18n.text(this.language, '最低评分', 'Minimum rating'), this.filterOptions.ratingOptions,
          `${this.draftMinRating}`, (value: string): void => { this.draftMinRating = Number(value || '0'); });
      }
      IBestButton({ btnHeight: 44,
        text: I18n.text(this.language, '查看结果', 'View results'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: '100%', onBtnClick: () => this.applyFilters()
      });
    }.width('100%').padding({ left: 18, right: 18, top: 17, bottom: 18 })
      .backgroundColor(DesignTokens.surface(this.darkMode))
      .borderRadius({ bottomLeft: 22, bottomRight: 22 })
      .shadow({ color: this.darkMode ? '#76000000' : '#24000000', radius: 20, offsetY: 8 });
  }

  @Builder
  private visibilityPanel() {
    Column({ space: 14 }) {
      Row() {
        Text(I18n.text(this.language, '我的商品可见范围', 'Product visibility')).fontSize(17).fontWeight(FontWeight.Bold);
        Blank();
        MerchantIcon({ name: 'cross', color: DesignTokens.muted(this.darkMode), iconSize: 20 });
      }.width('100%').onClick(() => this.showVisibility = false);
      Text(I18n.text(this.language, '该设置独立于货源筛选，仅影响其他客户查看你的商品。',
        'This only controls who can see your products.'))
        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      IBestButton({ btnHeight: 44,
        text: I18n.text(this.language, '仅授权门店', 'Authorised stores'),
        type: this.draftScope === 'stores' ? 'primary' : 'default', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        plain: this.draftScope !== 'stores', btnWidth: '100%', loading: this.savingVisibility,
        onBtnClick: () => { this.draftScope = 'stores'; }
      });
      IBestButton({ btnHeight: 44,
        text: I18n.text(this.language, '所有客户', 'All customers'),
        type: this.draftScope === 'public' ? 'primary' : 'default', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        plain: this.draftScope !== 'public', btnWidth: '100%', loading: this.savingVisibility,
        onBtnClick: () => { this.draftScope = 'public'; }
      });
      IBestButton({ btnHeight: 48, text: I18n.text(this.language, '保存可见范围', 'Save visibility'),
        type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: '100%', loading: this.savingVisibility, disabled: !this.visibilityReady || this.savingVisibility,
        onBtnClick: () => { if (this.draftScope === this.plazaScope) this.showVisibility = false; else this.saveVisibility(this.draftScope); } });
    }.width('100%').padding(16).backgroundColor(DesignTokens.surface(this.darkMode))
      .borderRadius({ bottomLeft: 22, bottomRight: 22 })
      .shadow({ color: this.darkMode ? '#76000000' : '#24000000', radius: 20, offsetY: 8 });
  }

  @Builder
  private contentList() {
    if (this.loading) {
      Column({ space: 12 }) {
        ForEach([1, 2, 3], (_: number) => {
          Row({ space: 12 }) {
            Column().width(96).height(96).borderRadius(14).backgroundColor(DesignTokens.subtle(this.darkMode));
            Column({ space: 10 }) {
              Column().width('85%').height(16).borderRadius(8).backgroundColor(DesignTokens.subtle(this.darkMode));
              Column().width('55%').height(12).borderRadius(6).backgroundColor(DesignTokens.subtle(this.darkMode));
              Column().width('70%').height(18).borderRadius(8).backgroundColor(DesignTokens.subtle(this.darkMode));
            }.layoutWeight(1).alignItems(HorizontalAlign.Start);
          }.width('100%').padding(13).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
        });
      }.width('100%').padding({ left: 16, right: 16, top: 8 });
    } else if ((this.mode === 'products' && this.products.length === 0) ||
      (this.mode === 'factories' && this.factories.length === 0)) {
      Column() { IBestEmpty({ description: I18n.text(this.language, '暂无匹配货源', 'No matching sources') }); }
        .height('100%').justifyContent(FlexAlign.Center);
    } else {
      List({ space: 10 }) {
        if (this.mode === 'products') {
          ForEach(this.products, (item: PlazaProduct) => { ListItem() { this.productCard(item); } },
            (item: PlazaProduct) => item.productId);
          if (this.loadingMore) {
            ListItem() { Row() { LoadingProgress().width(22).height(22).color(DesignTokens.brand(this.darkMode)); }
              .width('100%').justifyContent(FlexAlign.Center).padding(10); }
          }
        } else {
          ForEach(this.factories, (item: PlazaFactory) => { ListItem() { this.factoryCard(item); } },
            (item: PlazaFactory) => item.id);
        }
      }.width('100%').height('100%').padding({ left: 16, right: 16, top: 8, bottom: this.safeBottom + 16 })
        .onReachEnd(() => this.loadMore());
    }
  }

  @Builder
  private controlBar() {
    Column({ space: 10 }) {
      Row({ space: 8 }) {
        Text(I18n.text(this.language, '货源商品', 'Products')).fontSize(13).textAlign(TextAlign.Center)
          .padding({ top: 9, bottom: 9 }).layoutWeight(1)
          .backgroundColor(this.mode === 'products' ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
          .fontColor(this.mode === 'products' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode)).borderRadius(18)
          .onClick(() => this.switchMode('products'));
        Text(I18n.text(this.language, '优质厂家', 'Factories')).fontSize(13).textAlign(TextAlign.Center)
          .padding({ top: 9, bottom: 9 }).layoutWeight(1)
          .backgroundColor(this.mode === 'factories' ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
          .fontColor(this.mode === 'factories' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode)).borderRadius(18)
          .onClick(() => this.switchMode('factories'));
        Row({ space: 4 }) {
          MerchantIcon({ name: 'filter-o', color: this.filterCount() > 0 ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode), iconSize: 17 });
          Text(this.filterCount() > 0 ? I18n.text(this.language, `筛选 ${this.filterCount()}`, `Filter ${this.filterCount()}`)
            : I18n.text(this.language, '筛选', 'Filter')).fontSize(12)
            .fontColor(this.filterCount() > 0 ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode));
        }.height(38).padding({ left: 12, right: 12 }).borderRadius(19)
          .backgroundColor(DesignTokens.card(this.darkMode)).justifyContent(FlexAlign.Center)
          .onClick(() => this.showFilters ? this.showFilters = false : this.openFilters());
      }.width('100%');
      Row({ space: 10 }) {
        IBestButton({ btnHeight: 44,
          text: I18n.text(this.language, '发布我的商品', 'Publish product'), plain: true,
          color: DesignTokens.brand(this.darkMode), btnWidth: '48%',
          onBtnClick: () => AppRouter.push('ProductEdit', new IdRouteParams())
        });
        IBestButton({ btnHeight: 44,
          text: I18n.text(this.language, '可见范围', 'Visibility'), plain: true,
          color: DesignTokens.brand(this.darkMode), btnWidth: '48%', onBtnClick: () => {
            this.showFilters = false;
            this.draftScope = this.plazaScope; this.showVisibility = true;
          }
        });
      }.width('100%');
    }.width('100%').padding({ left: 16, right: 16, bottom: 10 });
  }

  build() {
    NavDestination() {
      Column() {
        SecondaryHeader({
          title: I18n.text(this.language, '厂家选品', 'Factory sourcing'), isShowRight: true,
          rightLabel: I18n.text(this.language, '我的代理', 'My agency'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.handleBack(),
          onRightClick: () => AppRouter.push('AgencyProducts')
        });
          SecondaryFeedback({ errorKind: this.pageError, updating: this.loading, onRetry: () => this.load() });
        IBestSearch({
          value: $keyword, placeholder: I18n.text(this.language, '搜索商品或厂家', 'Search products or factories'),
          isRound: true, outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode),
          showRightButton: true, rightButtonText: I18n.text(this.language, '搜索', 'Search'),
          onInput: () => this.pageSearch.schedule(() => this.load()), onSearch: () => this.submitSearch(), onRightButtonClick: () => this.submitSearch()
        });
        this.controlBar();
        Stack({ alignContent: Alignment.Top }) {
          Column() { this.contentList(); }.width('100%').height('100%');
          if (this.showFilters || this.showVisibility) {
            Column().width('100%').height('100%').backgroundColor('#78000000')
              .onClick(() => { this.showFilters = false; this.showVisibility = false; });
            if (this.showFilters) this.filterPanel();
            if (this.showVisibility) this.visibilityPanel();
          }
        }.width('100%').layoutWeight(1);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true).onBackPressed((): boolean => { this.handleBack(); return true; });
  }
}
