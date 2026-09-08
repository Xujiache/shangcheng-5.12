import { common } from '@kit.AbilityKit';
import { IBestButton, IBestDialogUtil, IBestNavBar, IBestSwitch, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { I18n } from '../../core/i18n/I18n';
import { ShopPriceRule } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';
import { CachedPriceRule, PriceRuleStore } from './PriceRuleStore';

@Builder
export function PriceRuleBuilder(_: string) { PriceRulePage(); }

@Component
struct PriceRulePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private guest: boolean = false;
  @State private customer: string = 'retail';
  @State private agency: string = 'wholesale';
  @State private member: string = 'member';
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  private dirty: boolean = false;
  private saveTimer: number = -1;

  aboutToAppear(): void { this.load(); }

  aboutToDisappear(): void {
    if (this.saveTimer >= 0) {
      clearTimeout(this.saveTimer);
      this.saveTimer = -1;
    }
    if (this.dirty) this.flushSave();
  }

  private context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
  }

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
    let cached: CachedPriceRule | null = null;
    try {
      cached = await PriceRuleStore.read(this.context());
      if (cached) {
        this.applyRule(cached.rule);
        this.loading = false;
      }
      if (cached?.dirty) {
        const synced = await BusinessRepository.savePriceRule(cached.rule);
        this.applyRule(synced);
        await PriceRuleStore.write(this.context(), synced, false);
      } else {
        const remote = await BusinessRepository.priceRule();
        this.applyRule(remote);
        await PriceRuleStore.write(this.context(), remote, false);
      }
    } catch (error) {
      if (!cached) IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '价格规则加载失败', 'Failed to load pricing rules'));
    } finally {
      this.loading = false;
    }
  }

  private queueSave(tier: string): void {
    this.dirty = true;
    PriceRuleStore.write(this.context(), this.currentRule(), true);
    if (this.saveTimer >= 0) clearTimeout(this.saveTimer);
    this.saveTimer = setTimeout((): void => {
      this.saveTimer = -1;
      this.flushSave();
    }, 250);
    IBestToast.show(I18n.text(this.language, `${tier} · 已保存`, `${tier} · Saved`));
  }

  private async flushSave(): Promise<void> {
    if (this.saving || !this.dirty) return;
    const body = this.currentRule();
    this.dirty = false;
    this.saving = true;
    let failed = false;
    await PriceRuleStore.write(this.context(), body, true);
    try {
      const synced = await BusinessRepository.savePriceRule(body);
      if (!this.dirty) {
        this.applyRule(synced);
        await PriceRuleStore.write(this.context(), synced, false);
      } else {
        await PriceRuleStore.write(this.context(), this.currentRule(), true);
      }
    } catch (error) {
      this.dirty = true;
      failed = true;
      IBestToast.show(error instanceof ApiError
        ? I18n.text(this.language, `${error.message}，修改已保存在本机`, `${error.message}. Changes are saved on this device.`)
        : I18n.text(this.language, '网络不可用，修改已保存在本机', 'Network unavailable. Changes are saved on this device.'));
    } finally {
      this.saving = false;
      // A new edit made while this request was in flight is flushed next.
      // A network failure stays dirty for the next edit/page visit instead of
      // hammering the server every 250 ms while the device is offline.
      if (this.dirty && !failed) {
        if (this.saveTimer >= 0) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout((): void => {
          this.saveTimer = -1;
          this.flushSave();
        }, 250);
      }
    }
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
      .borderRadius(17).onClick(onTap);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '价格显示规则', 'Price display rules'),
          isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 14 }) {
              Column({ space: 8 }) {
                Text(I18n.text(this.language, '价格显示规则', 'Price display rules')).fontSize(20).fontWeight(FontWeight.Bold).width('100%');
                Text(I18n.text(this.language, '按访问者身份展示对应价格，修改后全店商品立即生效。', 'Show prices by visitor role. Changes apply to all products immediately.'))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                Text(this.summary()).fontSize(11).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
              }.width('100%').padding(18).backgroundColor(DesignTokens.brandTint(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

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
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 10 }) {
                Text(I18n.text(this.language, '普通客户', 'Customers')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
                Text(I18n.text(this.language, '已登录但未授权门店', 'Signed in but not an authorised store')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                Row({ space: 8 }) {
                  this.choice('retail', I18n.text(this.language, '显示零售价', 'Show retail'), this.customer, () => {
                    this.customer = 'retail'; this.queueSave(I18n.text(this.language, '普通客户', 'Customers'));
                  });
                  this.choice('hidden', I18n.text(this.language, '隐藏价格', 'Hide prices'), this.customer, () => {
                    this.customer = 'hidden'; this.queueSave(I18n.text(this.language, '普通客户', 'Customers'));
                  });
                }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              Column({ space: 10 }) {
                Text(I18n.text(this.language, '授权门店', 'Authorised stores')).fontSize(16).fontWeight(FontWeight.Medium).width('100%');
                Text(I18n.text(this.language, '已申请代理或加盟门店', 'Agency or franchise stores')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                Row({ space: 8 }) {
                  this.choice('wholesale', I18n.text(this.language, '批发价', 'Wholesale'), this.agency, () => {
                    this.agency = 'wholesale'; this.queueSave(I18n.text(this.language, '授权门店', 'Authorised stores'));
                  });
                  this.choice('retail', I18n.text(this.language, '零售价', 'Retail'), this.agency, () => {
                    this.agency = 'retail'; this.queueSave(I18n.text(this.language, '授权门店', 'Authorised stores'));
                  });
                }.width('100%');
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

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
              }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);

              IBestButton({ text: I18n.text(this.language, '恢复默认规则', 'Restore defaults'),
                plain: true, type: 'danger', btnWidth: '100%', loading: this.saving, onBtnClick: () => this.reset() });
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
