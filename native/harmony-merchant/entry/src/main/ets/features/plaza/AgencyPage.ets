import { ResilientRemoteImage } from '../../core/ui/ResilientRemoteImage';
import { LeaveGuard } from '../../core/ui/LeaveGuard';
import { PageReadScope, SecondaryPolicy } from '../../core/ui/SecondaryPolicy';
import { SecondaryFeedback, SecondaryHeader } from '../../core/ui/SecondaryPage';
import {
  IBestButton, IBestDialogUtil, IBestEmpty, IBestField, IBestTag, IBestToast
} from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { AgencyApplication, AgencyMutation } from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function AgencyProductsBuilder(_: string, raw: Object) {
  AgencyPage({ params: raw as IdRouteParams });
}

@Component
struct AgencyPage {
  private handleBack(): void {
    if (this.editorVisible) { this.closeLocalEditor(); return; }

    this.leaveGuard.request(this.language, false, false, () => AppRouter.back());
  }

  private editStamp: string = '';
  private localStamp(): string { return JSON.stringify([this.editingId, this.retailPrice, this.markupRatio]); }
  private closeLocalEditor(): void {
    this.leaveGuard.request(this.language, this.saving || Boolean(this.actionId), this.localStamp() !== this.editStamp, () => { this.editorVisible = false; });
  }

  private leaveGuard: LeaveGuard = new LeaveGuard();
  aboutToDisappear(): void { this.pageScope.dispose(); }

  private pageScope: PageReadScope = new PageReadScope();
  @State private pageError: string = '';

  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private items: AgencyApplication[] = [];
  @State private status: string = '';
  @State private loading: boolean = true;
  @State private editorVisible: boolean = false;
  @State private editingId: string = '';
  @State private editingName: string = '';
  @State private factoryPrice: number = 0;
  @State private retailPrice: string = '';
  @State private markupRatio: string = '';
  @State private saving: boolean = false;
  @State private actionId: string = '';
  @State private showSuccessHint: boolean = false;
  private requestEpoch: number = 0;

  aboutToAppear(): void { this.pageScope.open();
    this.showSuccessHint = this.params.action === 'applied';
    this.load();
  }

  private async load(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('load');
    this.pageError = '';
    const epoch = ++this.requestEpoch;
    this.loading = true;
    try {
      const result = await this.pageScope.read(BusinessRepository.agencyApplications(''), pageTicket);
      if (epoch === this.requestEpoch) this.items = result;
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      if (epoch === this.requestEpoch) {
        IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '代理商品加载失败', 'Failed to load agency products'));
      }
    } finally {
      if (this.pageScope.accepts(pageTicket)) {
      if (epoch === this.requestEpoch) this.loading = false;
    }
    }
  }

  private visibleItems(): AgencyApplication[] {
    if (!this.status) return this.items;
    return this.items.filter((item: AgencyApplication): boolean => item.status === this.status);
  }

  private countStatus(status: string): number {
    return this.items.filter((item: AgencyApplication): boolean => item.status === status).length;
  }

  private factoryCount(): number {
    const ids: string[] = [];
    this.items.forEach((item: AgencyApplication): void => {
      if (!ids.includes(item.factoryId)) ids.push(item.factoryId);
    });
    return ids.length;
  }

  private label(value: string): string {
    return value === 'pending' ? I18n.text(this.language, '待审核', 'Pending')
      : value === 'approved' ? I18n.text(this.language, '已通过', 'Approved')
        : value === 'rejected' ? I18n.text(this.language, '已驳回', 'Rejected')
          : value === 'offline' ? I18n.text(this.language, '已下线', 'Offline') : value;
  }

  private openEditor(item: AgencyApplication): void {
    this.editingId = item.id;
    this.editingName = item.productName;
    this.factoryPrice = item.factoryPrice;
    this.retailPrice = item.myRetailPrice.toFixed(2);
    this.markupRatio = item.markupRatio.toFixed(2);
    this.editStamp = this.localStamp(); this.editorVisible = true;
  }

  private syncFromPrice(): void {
    const price = Number(this.retailPrice);
    if (price > 0 && this.factoryPrice > 0) {
      this.markupRatio = (((price - this.factoryPrice) / this.factoryPrice) * 100).toFixed(2);
    }
  }

  private syncFromRatio(): void {
    const ratio = Number(this.markupRatio);
    if (ratio >= 0 && this.factoryPrice > 0) {
      this.retailPrice = (this.factoryPrice * (1 + ratio / 100)).toFixed(2);
    }
  }

  private async save(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.saving) return;
    const price = Number(this.retailPrice);
    const ratio = Number(this.markupRatio);
    if (!Number.isFinite(price) || !Number.isFinite(ratio) || !(price > 0) || ratio < 0 || price < this.factoryPrice) {
      IBestToast.show(I18n.text(this.language, '零售价不能低于厂家供货价，加价比例不能为负数', 'Retail price cannot be below supply price and markup cannot be negative'));
      return;
    }
    const body: AgencyMutation = { myRetailPrice: price, markupRatio: ratio };
    this.saving = true;
    const mutationTicket = this.pageScope.begin('save');
    try {
      await this.pageScope.read(BusinessRepository.updateAgencyApplication(this.editingId, body), mutationTicket);
      this.editorVisible = false;
      IBestToast.show(I18n.text(this.language, '代理售价已更新', 'Agency price updated'));
      await this.pageScope.read(this.load(), mutationTicket);
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '代理售价保存失败', 'Failed to save agency price'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.saving = false;
    }
    }
  }

  private confirmCancel(item: AgencyApplication): void {
    IBestDialogUtil.open({
      title: item.status === 'approved' ? I18n.text(this.language, '解除代理', 'End agency') : I18n.text(this.language, '撤销申请', 'Withdraw request'),
      message: item.status === 'approved'
        ? I18n.text(this.language, `解除“${item.productName}”后将不再同步厂家商品，确定继续吗？`, `End agency for “${item.productName}” and stop syncing it?`)
        : I18n.text(this.language, `确定撤销“${item.productName}”的代理申请吗？`, `Withdraw the agency request for “${item.productName}”?`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => this.cancel(item.id)
    });
  }

  private async cancel(id: string): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.actionId || this.saving) return;
    this.actionId = id;
    const mutationTicket = this.pageScope.begin('cancel');
    try {
      await this.pageScope.read(BusinessRepository.cancelAgencyApplication(id), mutationTicket);
      IBestToast.show(I18n.text(this.language, '代理关系已撤销', 'Agency relationship removed'));
      await this.pageScope.read(this.load(), mutationTicket);
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '撤销失败', 'Failed to withdraw'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.actionId = '';
    }
    }
  }

  private confirmOffline(item: AgencyApplication): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '下架代理', 'Unpublish agency product'), message: I18n.text(this.language, `下架“${item.productName}”？该商品将从店铺中下架。`, `Unpublish “${item.productName}” from your store?`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'), confirmButtonText: I18n.text(this.language, '确认', 'Confirm'), confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => this.changeStatus(item.id, 'offline')
    });
  }

  private async changeStatus(id: string, status: string): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    if (this.actionId || this.saving) return;
    this.actionId = id;
    const mutationTicket = this.pageScope.begin('changeStatus');
    try {
      await this.pageScope.read(BusinessRepository.updateAgencyApplication(id, { status }), mutationTicket);
      IBestToast.show(status === 'approved' ? I18n.text(this.language, '已重新上架', 'Published again') : I18n.text(this.language, '已下架', 'Unpublished'));
      await this.pageScope.read(this.load(), mutationTicket);
    } catch (error) {
      if (!this.pageScope.accepts(mutationTicket)) return;
      IBestToast.show(error instanceof ApiError ? SecondaryPolicy.message(error, this.language) : I18n.text(this.language, '操作失败', 'Operation failed'));
    } finally {
      if (this.pageScope.accepts(mutationTicket)) {
      this.actionId = '';
    }
    }
  }

  @Builder
  private card(item: AgencyApplication) {
    Column({ space: 10 }) {
      Row({ space: 11 }) {
        ResilientRemoteImage({ originalUrl: item.productImage, widthValue: 74, heightValue: 74, radius: 10 });
        Column({ space: 5 }) {
          Row() {
            Text(item.productName).fontSize(15).fontWeight(FontWeight.Medium).layoutWeight(1).maxLines(1);
            IBestTag({ text: this.label(item.status), plain: true, color: DesignTokens.brand(this.darkMode) });
          }.width('100%');
          Text(item.factoryName).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          Text(I18n.text(this.language, `厂价 ¥${item.factoryPrice.toFixed(2)}  零售 ¥${item.myRetailPrice.toFixed(2)}`,
            `Supply ¥${item.factoryPrice.toFixed(2)}  Retail ¥${item.myRetailPrice.toFixed(2)}`))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
          Text(I18n.text(this.language, `加价 ${item.markupRatio.toFixed(2)}% · 同步 ${item.syncStatus || '--'}`,
            `Markup ${item.markupRatio.toFixed(2)}% · Sync ${item.syncStatus || '--'}`))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      }.width('100%');
      Row() {
        Text(I18n.text(this.language, `申请于 ${item.appliedAt ? item.appliedAt.slice(0, 10) : '--'}`,
          `Applied ${item.appliedAt ? item.appliedAt.slice(0, 10) : '--'}`))
          .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).layoutWeight(1);
        if (item.status === 'pending' || item.status === 'approved') {
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '调整售价', 'Edit price'), plain: true, color: DesignTokens.brand(this.darkMode), onBtnClick: () => this.openEditor(item) });
        }
        if (item.status === 'pending') IBestButton({ btnHeight: 44, text: I18n.text(this.language, '取消申请', 'Withdraw'), plain: true, type: 'danger', onBtnClick: () => this.confirmCancel(item) });
        else if (item.status === 'approved') {
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '下架', 'Unpublish'), plain: true, type: 'danger', onBtnClick: () => this.confirmOffline(item) });
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '代理设置', 'Agency settings'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.openEditor(item) });
        } else if (item.status === 'offline') {
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', onBtnClick: () => this.confirmCancel(item) });
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '重新上架', 'Publish again'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.changeStatus(item.id, 'approved') });
        } else if (item.status === 'rejected') {
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '删除', 'Delete'), plain: true, type: 'danger', onBtnClick: () => this.confirmCancel(item) });
          IBestButton({ btnHeight: 44, text: I18n.text(this.language, '查看厂家', 'View factory'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => AppRouter.push('FactoryDetail', new IdRouteParams(item.factoryId)) });
        }
      }.width('100%');
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          SecondaryHeader({ title: I18n.text(this.language, '代理商品', 'Agency products'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.handleBack() });
          SecondaryFeedback({ errorKind: this.pageError, updating: this.loading, onRetry: () => this.load() });
          if (this.showSuccessHint) {
            Row({ space: 10 }) {
              MerchantIcon({ name: 'success', color: Color.White, iconSize: 18 });
              Column({ space: 2 }) {
                Text(I18n.text(this.language, '代理申请已提交', 'Agency request submitted')).fontSize(14).fontWeight(FontWeight.Bold).fontColor(Color.White);
                Text(I18n.text(this.language, '厂家审核通过后即可配置并上架商品', 'Configure and publish products after factory approval'))
                  .fontSize(12).fontColor('#F4FFF0');
              }.layoutWeight(1).alignItems(HorizontalAlign.Start);
              Column() { MerchantIcon({ name: 'cross', color: Color.White, iconSize: 17 }); }
                .width(32).height(32).justifyContent(FlexAlign.Center).onClick(() => this.showSuccessHint = false);
            }.margin({ left: 16, right: 16, top: 10 }).padding(12).backgroundColor(DesignTokens.success(this.darkMode)).borderRadius(14).width('auto');
          }
          Row() {
            this.statCell(`${this.items.length}`, I18n.text(this.language, '代理商品', 'Products'));
            this.statCell(`${this.countStatus('pending')}`, I18n.text(this.language, '待审核', 'Pending'));
            this.statCell(`${this.countStatus('approved')}`, I18n.text(this.language, '已通过', 'Approved'));
            this.statCell(`${this.factoryCount()}`, I18n.text(this.language, '合作厂家', 'Factories'));
          }.margin({ left: 16, right: 16, top: 10 }).padding({ top: 12, bottom: 12 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16).width('auto');
          Scroll() {
            Row({ space: 8 }) {
              ForEach(['', 'pending', 'approved', 'rejected', 'offline'], (value: string) => {
                Text(value === '' ? I18n.text(this.language, '全部', 'All') : this.label(value)).fontSize(13)
                  .padding({ left: 14, right: 14, top: 8, bottom: 8 })
                  .backgroundColor(this.status === value ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
                  .fontColor(this.status === value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode))
                  .borderRadius(18).onClick(() => { this.status = value; this.load(); });
              }, (value: string) => value);
            }.padding(12);
          }.scrollable(ScrollDirection.Horizontal).scrollBar(BarState.Off);
          if (this.loading) {
            Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
              .layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.visibleItems().length === 0) {
            Column({ space: 12 }) {
              IBestEmpty({ description: this.status
                ? I18n.text(this.language, '当前状态暂无代理商品', 'No agency products in this status')
                : I18n.text(this.language, '暂无代理商品', 'No agency products') });
              IBestButton({ btnHeight: 44, text: I18n.text(this.language, '去选品广场', 'Browse sourcing plaza'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => AppRouter.push('Plaza') });
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            List({ space: 10 }) {
              ForEach(this.visibleItems(), (item: AgencyApplication) => {
                ListItem() { this.card(item); }
              }, (item: AgencyApplication) => item.id);
            }.layoutWeight(1).padding({ left: 16, right: 16, bottom: this.safeBottom + 16 });
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
        if (this.editorVisible) {
          Column({ space: 12 }) {
            Text(I18n.text(this.language, '调整代理售价', 'Edit agency price')).fontSize(20).fontWeight(FontWeight.Bold).width('100%');
            Text(this.editingName).fontSize(14).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(2);
            Text(I18n.text(this.language, `厂家供货价 ¥${this.factoryPrice.toFixed(2)}`, `Supply price ¥${this.factoryPrice.toFixed(2)}`)).fontSize(13).width('100%');
            IBestField({
              value: $retailPrice, label: I18n.text(this.language, '我的零售价', 'My retail price'), placeholder: I18n.text(this.language, '请输入金额', 'Enter an amount'), type: 'decimal',
              onChange: () => this.syncFromPrice()
            });
            IBestField({
              value: $markupRatio, label: I18n.text(this.language, '加价比例(%)', 'Markup (%)'), placeholder: I18n.text(this.language, '请输入比例', 'Enter a percentage'), type: 'decimal',
              onChange: () => this.syncFromRatio()
            });
            Row({ space: 10 }) {
              IBestButton({ btnHeight: 44, text: I18n.text(this.language, '取消', 'Cancel'), plain: true, btnWidth: '48%', disabled: this.saving, onBtnClick: () => { this.closeLocalEditor(); } });
              IBestButton({ btnHeight: 44,
                text: I18n.text(this.language, '保存', 'Save'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%', loading: this.saving, disabled: this.saving,
                onBtnClick: () => this.save()
              });
            }.width('100%');
          }.width('100%').padding({ left: 16, right: 16, top: 22, bottom: this.safeBottom + 22 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius({ topLeft: 24, topRight: 24 });
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onBackPressed((): boolean => { this.handleBack(); return true; });
  }

  @Builder
  private statCell(value: string, label: string) {
    Column({ space: 3 }) {
      Text(value).fontSize(19).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
      Text(label).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
    }.layoutWeight(1);
  }
}
