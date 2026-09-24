import { LeaveGuard } from '../../core/ui/LeaveGuard';
import { PageReadScope, SecondaryPolicy } from '../../core/ui/SecondaryPolicy';
import { SecondaryFeedback, SecondaryHeader, SecondarySaveBar } from '../../core/ui/SecondaryPage';
import { IBestButton, IBestDialogUtil, IBestSwitch, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { I18n } from '../../core/i18n/I18n';
import { ShopPriceRule } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';

@Builder
export function PriceRuleBuilder(_: string) { PriceRulePage(); }

@Component
struct PriceRulePage {
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @State private verifying: boolean = false;
  private handleBack(): void {


    this.leaveGuard.request(this.language, this.saving, this.dirty, () => AppRouter.back());
  }

  private leaveGuard: LeaveGuard = new LeaveGuard();
  private pageScope: PageReadScope = new PageReadScope();
  @State private pageError: string = '';

  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private guest: boolean = false;
  @State private customer: string = 'retail';
  @State private agency: string = 'wholesale';
  @State private member: string = 'member';
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  @State private dirty: boolean = false;
  @State private loaded: boolean = false;
  private savedRule: string = '';

  aboutToAppear(): void { this.pageScope.open(); this.load(); }

  aboutToDisappear(): void { this.pageScope.dispose();}



  private applyRule(data: ShopPriceRule): void {
    this.guest = data.guestAllow;
    this.customer = data.customerPrice;
    this.agency = data.agencyPrice;
    this.member = data.memberPrice;
  }

  private currentRule(): ShopPriceRule {
    return {
      guestAllow: this.guest,
      customerPrice: this.customer,
      agencyPrice: this.agency,
      memberPrice: this.member
    };
  }

  private async load(): Promise<void> {
    if (!this.pageScope.isCurrent()) return;
    const pageTicket = this.pageScope.begin('load');
    this.pageError = '';
    this.loading = true;
    try {
      const remote = await this.pageScope.read(BusinessRepository.priceRule(), pageTicket);
      if (!this.dirty) this.applyRule(remote);
      this.savedRule = JSON.stringify(remote); this.loaded = true; this.verifying = false;
      this.dirty = JSON.stringify(this.currentRule()) !== this.savedRule;
      // Legacy unowned dirty cache is preserved, never silently uploaded into the current account.
    } catch (error) {
      if (!this.pageScope.accepts(pageTicket)) return;
      this.pageError = SecondaryPolicy.errorKind(error);
      IBestToast.show(I18n.text(this.language, '价格规则加载失败，请重试后再编辑', 'Load pricing rules before editing. Please retry.'));

    } finally {
      if (this.pageScope.accepts(pageTicket)) { this.loading = false; }
    }
  }

  private queueSave(_tier: string): void {
    this.dirty = this.loaded && JSON.stringify(this.currentRule()) !== this.savedRule;
  }

  private async flushSave(): Promise<void> {
    if (this.saving || !this.dirty) return;
    if (!this.pageScope.isCurrent()) return;
    const writeTicket = this.pageScope.begin('save');
    if (!this.loaded || this.verifying || this.loading) return;
    const body = this.currentRule();
    this.saving = true;
    try {
      const synced = await BusinessRepository.savePriceRule(body);
      if (!this.pageScope.accepts(writeTicket)) return;
      this.savedRule = JSON.stringify(synced);
      this.dirty = JSON.stringify(this.currentRule()) !== this.savedRule;
      IBestToast.show(I18n.text(this.language, '价格规则已保存', 'Pricing rules saved'));
    } catch (error) {
      if (!this.pageScope.accepts(writeTicket)) return;
      this.verifying = true;
      await this.load();
      IBestToast.show(I18n.text(this.language, '保存未确认，请保留草稿并重新读取规则核对结果。', 'Save was not confirmed. Keep the draft and reload to verify the result.'));
    } finally { if (this.pageScope.accepts(writeTicket)) this.saving = false; }
  }

  private reset(): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '恢复默认规则', 'Restore defaults'),
      message: I18n.text(this.language,
        '将恢复为：访客禁止、普通客户看零售价、授权门店看批发价、会员看会员价。',
        'Guests blocked, customers see retail, authorised stores see wholesale, and members see member prices.'),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.brand(this.darkMode),
      onConfirm: () => {
        this.guest = false;
        this.customer = 'retail';
        this.agency = 'wholesale';
        this.member = 'member';
        this.queueSave(I18n.text(this.language, '默认规则', 'Default rules'));
      }
    });
  }

  private summary(): string {
    return I18n.text(this.language,
      `${this.guest ? '访客允许浏览' : '访客禁止进入'} · 普通客户${this.customer === 'retail' ? '零售价' : '隐藏价格'} · 授权门店${this.agency === 'wholesale' ? '批发价' : '零售价'} · 会员${this.member === 'member' ? '会员价' : '零售价'}`,
      `${this.guest ? 'Guests allowed' : 'Guests blocked'} · Customers ${this.customer === 'retail' ? 'retail' : 'hidden'} · Stores ${this.agency === 'wholesale' ? 'wholesale' : 'retail'} · Members ${this.member === 'member' ? 'member' : 'retail'}`);
  }

  @Builder
  private choice(value: string, label: string, current: string, onTap: () => void) {
    Text(label).fontSize(13).textAlign(TextAlign.Center).padding({ top: 9, bottom: 9 }).layoutWeight(1)
      .backgroundColor(current === value ? DesignTokens.brand(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .fontColor(current === value ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode))
      .constraintSize({ minHeight: 44 }).borderRadius(10).onClick(onTap);
  }

  build() {
    NavDestination() {
      Column() {
        SecondaryHeader({
          title: I18n.text(this.language, '价格显示规则', 'Price display rules'),
          isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => this.handleBack()
        });
          SecondaryFeedback({ errorKind: this.pageError, updating: this.loading, onRetry: () => this.load() });
        if (this.loading && !this.loaded) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            GridRow({ columns: this.windowWidth >= 720 ? 2 : 1, gutter: 12 }) {
              GridCol() {
                Column({ space: 8 }) {
                  Text(I18n.text(this.language, '价格显示规则', 'Price display rules')).fontSize(20).fontWeight(FontWeight.Bold).width('100%');
                  Text(I18n.text(this.language, '按访问者身份展示对应价格，保存后全店商品生效。', 'Show prices by visitor role. Save to apply changes to all products.'))
                    .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  Text(this.summary()).fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.brandTint(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column() {
                  Row() {
                    Column({ space: 4 }) {
                      Text(I18n.text(this.language, '未登录访客', 'Signed-out visitors')).fontSize(16).fontWeight(FontWeight.Medium);
                      Text(this.guest
                        ? I18n.text(this.language, '允许浏览，价格按普通客户规则显示', 'Can browse using customer pricing')
                        : I18n.text(this.language, '禁止进入，必须登录后看店', 'Must sign in before browsing'))
                        .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                    }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                    IBestSwitch({ value: $guest, activeColor: DesignTokens.brand(this.darkMode),
                      onChange: () => this.queueSave(I18n.text(this.language, '未登录访客', 'Signed-out visitors')) });
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 10 }) {
                  Text(I18n.text(this.language, '普通客户', 'Customers')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
                  Text(I18n.text(this.language, '已登录但未授权门店', 'Signed in but not an authorised store')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  Row({ space: 8 }) {
                    this.choice('retail', I18n.text(this.language, '显示零售价', 'Show retail'), this.customer, () => {
                      this.customer = 'retail'; this.queueSave(I18n.text(this.language, '普通客户', 'Customers'));
                    });
                    this.choice('hidden', I18n.text(this.language, '隐藏价格', 'Hide prices'), this.customer, () => {
                      this.customer = 'hidden'; this.queueSave(I18n.text(this.language, '普通客户', 'Customers'));
                    });
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 10 }) {
                  Text(I18n.text(this.language, '授权门店', 'Authorised stores')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
                  Text(I18n.text(this.language, '已申请代理或加盟门店', 'Agency or franchise stores')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  Row({ space: 8 }) {
                    this.choice('wholesale', I18n.text(this.language, '批发价', 'Wholesale'), this.agency, () => {
                      this.agency = 'wholesale'; this.queueSave(I18n.text(this.language, '授权门店', 'Authorised stores'));
                    });
                    this.choice('retail', I18n.text(this.language, '零售价', 'Retail'), this.agency, () => {
                      this.agency = 'retail'; this.queueSave(I18n.text(this.language, '授权门店', 'Authorised stores'));
                    });
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                Column({ space: 10 }) {
                  Text(I18n.text(this.language, '会员客户', 'Member customers')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
                  Row({ space: 8 }) {
                    this.choice('member', I18n.text(this.language, '会员价', 'Member price'), this.member, () => {
                      this.member = 'member'; this.queueSave(I18n.text(this.language, '会员客户', 'Member customers'));
                    });
                    this.choice('retail', I18n.text(this.language, '零售价', 'Retail'), this.member, () => {
                      this.member = 'retail'; this.queueSave(I18n.text(this.language, '会员客户', 'Member customers'));
                    });
                  }.width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16);
              }
              GridCol() {
                IBestButton({ btnHeight: 44, text: I18n.text(this.language, '恢复默认规则', 'Restore defaults'),
                  plain: true, type: 'danger', btnWidth: '100%', loading: this.saving, onBtnClick: () => this.reset() });
              }
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: 12 });
          }.enabled(this.loaded && !this.saving && !this.loading).layoutWeight(1).align(Alignment.Top);
          SecondarySaveBar({ saving: this.saving, canSave: this.loaded && this.dirty && !this.verifying && !this.loading, changed: this.dirty, onSave: () => this.flushSave() });
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true).onBackPressed((): boolean => { this.handleBack(); return true; });
  }
}
