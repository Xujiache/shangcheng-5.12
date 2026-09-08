import { IBestButton, IBestDialogUtil, IBestEmpty, IBestField, IBestNavBar, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { CouponMutation, MarketingActivity, MarketingCoupon, MarketingOverview } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function MarketingBuilder(_: string) { MarketingPage(); }

@Component
struct MarketingPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private overview: MarketingOverview | null = null;
  @State private coupons: MarketingCoupon[] = [];
  @State private activities: MarketingActivity[] = [];
  @State private activityKind: string = 'coupon';
  @State private couponStatus: string = 'active';
  @State private loading: boolean = true;
  @State private editorVisible: boolean = false;
  @State private formSaving: boolean = false;
  @State private editingId: string = '';
  @State private name: string = '';
  @State private type: string = 'fullReduce';
  @State private amount: string = '';
  @State private discountPercent: string = '90';
  @State private threshold: string = '';
  @State private stock: string = '';
  @State private perUserLimit: string = '1';
  @State private validFrom: string = '';
  @State private validTo: string = '';
  @State private actionId: string = '';
  private requestEpoch: number = 0;

  aboutToAppear(): void { this.load(); }
  private async load(): Promise<void> {
    const epoch = ++this.requestEpoch;
    const requestedKind = this.activityKind;
    const requestedStatus = this.couponStatus;
    this.loading = true;
    try {
      const result = await BusinessRepository.marketingOverview();
      if (epoch === this.requestEpoch) this.overview = result;
    } catch (_) {}
    try {
      if (requestedKind === 'coupon') {
        const result = await BusinessRepository.coupons(requestedStatus === 'all' ? '' : requestedStatus, 1);
        if (epoch === this.requestEpoch) this.coupons = result.list;
      } else {
        const result = await BusinessRepository.marketingActivities(requestedKind);
        if (epoch === this.requestEpoch) this.activities = result.list;
      }
    }
    catch (error) {
      if (epoch === this.requestEpoch) {
        IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '营销数据加载失败', 'Failed to load marketing data'));
      }
    }
    finally { if (epoch === this.requestEpoch) this.loading = false; }
  }
  private open(item?: MarketingCoupon): void {
    this.editingId = item?.id || ''; this.name = item?.name || ''; this.type = item?.type || 'fullReduce';
    this.amount = item?.amount ? `${item.amount}` : ''; this.threshold = item?.threshold ? `${item.threshold}` : '';
    this.discountPercent = item?.discountPercent ? `${item.discountPercent}` : '90';
    this.stock = item ? `${item.stock}` : '100'; this.perUserLimit = item ? `${item.perUserLimit}` : '1';
    this.validFrom = item?.validFrom.slice(0, 10) || ''; this.validTo = item?.validTo.slice(0, 10) || '';
    this.editorVisible = true;
  }
  private duplicate(item: MarketingCoupon): void {
    this.open(item);
    this.editingId = '';
    this.name = I18n.text(this.language, `${item.name} 副本`, `${item.name} copy`);
  }
  private async save(): Promise<void> {
    if (this.formSaving) return;
    const amount = Number(this.amount), discountPercent = Number(this.discountPercent);
    const stock = Number(this.stock), threshold = Number(this.threshold || '0'), perUserLimit = Number(this.perUserLimit);
    if (!this.name.trim() || !Number.isFinite(stock) || stock < 1 || !Number.isFinite(perUserLimit) || perUserLimit < 1 ||
      !this.validFrom || !this.validTo || this.validTo < this.validFrom) {
      IBestToast.show(I18n.text(this.language, '请完整填写优惠券信息', 'Complete all coupon details')); return;
    }
    if ((this.type === 'fullReduce' && (!Number.isFinite(amount) || amount <= 0 || threshold <= amount)) ||
      (this.type === 'fixed' && (!Number.isFinite(amount) || amount <= 0)) ||
      (this.type === 'discount' && (!Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent >= 100))) {
      IBestToast.show(this.type === 'discount' ? I18n.text(this.language, '折扣百分比应在 1 至 99 之间', 'Discount percentage must be between 1 and 99') : I18n.text(this.language, '请正确填写优惠金额和使用门槛', 'Enter a valid discount and threshold')); return;
    }
    const body: CouponMutation = {
      name: this.name.trim(), type: this.type,
      amount: this.type === 'discount' ? undefined : amount,
      discountPercent: this.type === 'discount' ? discountPercent : undefined,
      threshold: this.type === 'fullReduce' ? threshold : undefined,
      stock: Math.floor(stock), validFrom: this.validFrom, validTo: this.validTo,
      perUserLimit: Math.floor(perUserLimit), scope: 'all'
    };
    this.formSaving = true;
    try {
      if (this.editingId) await BusinessRepository.updateCoupon(this.editingId, body);
      else await BusinessRepository.createCoupon(body);
      this.editorVisible = false;
      IBestToast.show(I18n.text(this.language, '优惠券已保存', 'Coupon saved'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.formSaving = false;
    }
  }
  private async toggle(item: MarketingCoupon): Promise<void> {
    if (this.actionId || this.formSaving) return;
    this.actionId = item.id;
    try { await BusinessRepository.toggleCoupon(item.id, item.status !== 'active'); await this.load(); }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '操作失败', 'Operation failed')); }
    finally { this.actionId = ''; }
  }
  private remove(item: MarketingCoupon): void { IBestDialogUtil.open({ title: I18n.text(this.language, '删除优惠券', 'Delete coupon'), message: I18n.text(this.language, `确定删除“${item.name}”吗？`, `Delete “${item.name}”?`), showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'), confirmButtonText: I18n.text(this.language, '确认', 'Confirm'), confirmButtonColor: DesignTokens.danger(this.darkMode), onConfirm: () => { this.deleteCoupon(item.id); } }); }
  private async deleteCoupon(id: string): Promise<void> {
    if (this.actionId || this.formSaving) return;
    this.actionId = id;
    try { await BusinessRepository.deleteCoupon(id); await this.load(); }
    catch (error) { IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '删除失败', 'Failed to delete')); }
    finally { this.actionId = ''; }
  }

  private selectKind(kind: string): void {
    if (this.activityKind === kind) return;
    this.activityKind = kind;
    this.load();
  }

  @Builder private metric(value: number, label: string) { Column({ space: 5 }) { Text(`${value}`).fontSize(21).fontWeight(FontWeight.Bold); Text(label).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)); }.layoutWeight(1); }
  @Builder
  private couponCard(item: MarketingCoupon) {
    Row({ space: 12 }) {
      Column({ space: 2 }) {
        Text(item.type === 'discount'
          ? I18n.text(this.language, `${((item.discountPercent || 0) / 10).toFixed(1)}折`, `${item.discountPercent || 0}% off`)
          : `¥${(item.amount || 0).toFixed(0)}`)
          .fontSize(24).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
        Text(item.threshold
          ? I18n.text(this.language, `满¥${item.threshold}可用`, `Spend ¥${item.threshold}`)
          : I18n.text(this.language, '无门槛', 'No minimum'))
          .fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
      }.width(76);
      Column({ space: 5 }) {
        Row({ space: 6 }) {
          Text(item.name).fontSize(15).fontWeight(FontWeight.Medium).layoutWeight(1).maxLines(1);
          IBestTag({
            text: item.status === 'active' ? I18n.text(this.language, '进行中', 'Active')
              : item.status === 'paused' ? I18n.text(this.language, '已暂停', 'Paused')
                : item.status === 'ended' ? I18n.text(this.language, '已结束', 'Ended')
                  : I18n.text(this.language, '未开始', 'Upcoming'),
            plain: true, color: item.status === 'active' ? DesignTokens.success(this.darkMode) : DesignTokens.brand(this.darkMode)
          });
        }.width('100%');
        Text(I18n.text(this.language,
          `库存 ${item.stock}  领取 ${item.received}  使用 ${item.used}  每人限 ${item.perUserLimit}`,
          `Stock ${item.stock}  Claimed ${item.received}  Used ${item.used}  Limit ${item.perUserLimit}`))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        Text(I18n.text(this.language, `${item.validFrom.slice(0, 10)} 至 ${item.validTo.slice(0, 10)}`,
          `${item.validFrom.slice(0, 10)} to ${item.validTo.slice(0, 10)}`))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        Row({ space: 6 }) {
          Blank();
          if (item.status !== 'ended') {
            IBestButton({ text: item.status === 'active' ? I18n.text(this.language, '暂停', 'Pause') : I18n.text(this.language, '启用', 'Enable'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.toggle(item) });
          }
          IBestButton({ text: I18n.text(this.language, '复制', 'Copy'), plain: true, onBtnClick: () => this.duplicate(item) });
          IBestButton({ text: I18n.text(this.language, '编辑', 'Edit'), plain: true, onBtnClick: () => this.open(item) });
          IBestButton({ text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', onBtnClick: () => this.remove(item) });
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  @Builder
  private activityCard(item: MarketingActivity) {
    Row({ space: 12 }) {
      if (item.productImage) {
        Image(item.productImage).width(64).height(64).objectFit(ImageFit.Cover).borderRadius(10);
      } else {
        Column() { MerchantIcon({ name: item.kind === 'flashSale' ? 'fire-o' : 'cluster-o',
          color: DesignTokens.brand(this.darkMode), iconSize: 21 }); }
          .width(64).height(64).justifyContent(FlexAlign.Center).backgroundColor(DesignTokens.brandTint(this.darkMode)).borderRadius(10);
      }
      Column({ space: 6 }) {
        Row() {
          Text(item.name).fontSize(15).fontWeight(FontWeight.Medium).layoutWeight(1).maxLines(1);
          IBestTag({ text: item.status === 'active' ? I18n.text(this.language, '进行中', 'Active') : item.status === 'pending' ? I18n.text(this.language, '未开始', 'Upcoming') : I18n.text(this.language, '已结束', 'Ended'), plain: true, color: item.status === 'active' ? DesignTokens.success(this.darkMode) : DesignTokens.brand(this.darkMode) });
        }.width('100%');
        if (item.price !== undefined) {
          Text(I18n.text(this.language, `活动价 ¥${Number(item.price).toFixed(2)}`, `Offer price ¥${Number(item.price).toFixed(2)}`)).fontSize(13).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
        }
        if (item.kind === 'flashSale') {
          Text(I18n.text(this.language, `库存 ${item.stock || 0} · 已售 ${item.sold || 0}`, `Stock ${item.stock || 0} · Sold ${item.sold || 0}`)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        } else {
          Text(I18n.text(this.language, `${item.groupSize || 0} 人成团 · ${item.validHours || 0} 小时有效`, `${item.groupSize || 0} people · Valid for ${item.validHours || 0} hours`)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        }
        if (item.validFrom && item.validTo) {
          Text(I18n.text(this.language, `${item.validFrom.slice(0, 16).replace('T', ' ')} 至 ${item.validTo.slice(0, 16).replace('T', ' ')}`,
            `${item.validFrom.slice(0, 16).replace('T', ' ')} to ${item.validTo.slice(0, 16).replace('T', ' ')}`))
            .fontSize(10).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        }
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({ title: I18n.text(this.language, '营销中心', 'Marketing'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back() });
          if (this.loading) Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }.layoutWeight(1).justifyContent(FlexAlign.Center);
          else Scroll() { Column({ space: 14 }) {
            if (this.overview) Row() { this.metric(this.overview.coupons.active, I18n.text(this.language, '生效优惠券', 'Active coupons')); this.metric(this.overview.coupons.totalReceived || 0, I18n.text(this.language, '累计领取', 'Total claimed')); this.metric(this.overview.flashSales.active, I18n.text(this.language, '限时活动', 'Flash sales')); this.metric(this.overview.groupBuys.active, I18n.text(this.language, '团购活动', 'Group buys')); }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
            Row({ space: 8 }) {
              ForEach(['coupon', 'flashSale', 'groupBuy'], (kind: string) => {
                Text(kind === 'coupon' ? I18n.text(this.language, '优惠券', 'Coupons') : kind === 'flashSale' ? I18n.text(this.language, '限时活动', 'Flash sales') : I18n.text(this.language, '团购活动', 'Group buys'))
                  .fontSize(13).textAlign(TextAlign.Center).layoutWeight(1).padding({ top: 9, bottom: 9 })
                  .fontColor(this.activityKind === kind ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                  .backgroundColor(this.activityKind === kind ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode)).borderRadius(18)
                  .onClick(() => this.selectKind(kind));
              }, (kind: string) => kind);
            }.width('100%');
            if (this.activityKind === 'coupon') {
              Row() { Text(I18n.text(this.language, '我的优惠券', 'My coupons')).fontSize(18).fontWeight(FontWeight.Bold); Blank(); IBestButton({ text: I18n.text(this.language, '新增优惠券', 'Add coupon'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.open() }); }.width('100%');
              Row({ space: 8 }) {
                ForEach(['all', 'active', 'pending', 'ended'], (status: string) => {
                  Text(status === 'all' ? I18n.text(this.language, '全部', 'All') : status === 'active' ? I18n.text(this.language, '进行中', 'Active') : status === 'pending' ? I18n.text(this.language, '未开始', 'Upcoming') : I18n.text(this.language, '已结束', 'Ended'))
                    .fontSize(12).textAlign(TextAlign.Center).layoutWeight(1).padding({ top: 8, bottom: 8 })
                    .fontColor(this.couponStatus === status ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                    .backgroundColor(this.couponStatus === status ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode)).borderRadius(18)
                    .onClick(() => { this.couponStatus = status; this.load(); });
                }, (status: string) => status);
              }.width('100%');
              if (this.coupons.length === 0) IBestEmpty({ description: I18n.text(this.language, '暂无优惠券', 'No coupons') });
              ForEach(this.coupons, (item: MarketingCoupon) => { this.couponCard(item); }, (item: MarketingCoupon) => item.id);
            } else {
              Text(this.activityKind === 'flashSale' ? I18n.text(this.language, '限时活动由平台统一配置，商家可查看真实进度。', 'Flash sales are configured by the platform. Merchants can track live progress.') : I18n.text(this.language, '团购活动由平台统一配置，商家可查看成团规则。', 'Group buys are configured by the platform. Merchants can view the rules.'))
                .fontSize(12).lineHeight(19).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
              if (this.activities.length === 0) IBestEmpty({ description: this.activityKind === 'flashSale' ? I18n.text(this.language, '暂无限时活动', 'No flash sales') : I18n.text(this.language, '暂无团购活动', 'No group buys') });
              ForEach(this.activities, (item: MarketingActivity) => { this.activityCard(item); }, (item: MarketingActivity) => item.id);
            }
          }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 }); }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
        if (this.editorVisible) {
          Column({ space: 12 }) {
            Text(this.editingId ? I18n.text(this.language, '编辑优惠券', 'Edit coupon') : I18n.text(this.language, '新增优惠券', 'Add coupon'))
              .fontSize(20).fontWeight(FontWeight.Bold);
            IBestField({ value: $name, label: I18n.text(this.language, '名称', 'Name'), placeholder: I18n.text(this.language, '请输入活动名称', 'Enter a campaign name') });
            Row({ space: 8 }) {
              ForEach(['fullReduce', 'discount', 'fixed'], (couponType: string) => {
                Text(couponType === 'fullReduce' ? I18n.text(this.language, '满减券', 'Spend and save')
                  : couponType === 'discount' ? I18n.text(this.language, '折扣券', 'Percentage')
                    : I18n.text(this.language, '固定金额', 'Fixed amount'))
                  .fontSize(12).textAlign(TextAlign.Center).layoutWeight(1).padding({ top: 8, bottom: 8 })
                  .fontColor(this.type === couponType ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode))
                  .backgroundColor(this.type === couponType ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
                  .borderRadius(16).onClick(() => this.type = couponType);
              }, (couponType: string) => couponType);
            }.width('100%');
            if (this.type === 'discount') {
              IBestField({ value: $discountPercent, label: I18n.text(this.language, '折扣百分比', 'Discount percentage'), type: 'decimal', placeholder: I18n.text(this.language, '例：90 表示 9 折', 'Example: 90 means 10% off') });
            } else {
              IBestField({ value: $amount, label: I18n.text(this.language, '优惠金额', 'Discount amount'), type: 'decimal', placeholder: '0.00' });
            }
            if (this.type !== 'fixed') {
              IBestField({ value: $threshold, label: I18n.text(this.language, '使用门槛', 'Minimum spend'), type: 'decimal', placeholder: '0.00' });
            }
            IBestField({ value: $stock, label: I18n.text(this.language, '发放数量', 'Quantity'), type: 'number', placeholder: '1' });
            IBestField({ value: $perUserLimit, label: I18n.text(this.language, '每人限领', 'Limit per person'), type: 'number', placeholder: '1' });
            IBestField({ value: $validFrom, label: I18n.text(this.language, '开始日期', 'Start date'), placeholder: 'YYYY-MM-DD' });
            IBestField({ value: $validTo, label: I18n.text(this.language, '结束日期', 'End date'), placeholder: 'YYYY-MM-DD' });
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.formSaving, onBtnClick: () => this.editorVisible = false });
              IBestButton({ text: I18n.text(this.language, '保存', 'Save'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', loading: this.formSaving, disabled: this.formSaving, onBtnClick: () => this.save() });
            }.width('100%');
          }.width('100%').padding({ left: 20, right: 20, top: 22, bottom: this.safeBottom + 22 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 });
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true);
  }
}
