import { common } from '@kit.AbilityKit';
import { IBestButton, IBestNavBar, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { HuaweiIapService } from '../../core/iap/HuaweiIapService';
import { IapTransactionPolicy } from '../../core/iap/IapTransactionPolicy';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import {
  IapVerifyResult, MemberPlan, MembershipInfo, MembershipNotice, PaymentRecord, UsageQuota
} from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

@Builder
export function MembershipBuilder(_: string) { MembershipPage(); }

@Component
struct MembershipPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') @Watch('onLanguageChanged') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private plans: MemberPlan[] = [];
  @State private membership: MembershipInfo | null = null;
  @State private quota: UsageQuota | null = null;
  @State private notices: MembershipNotice[] = [];
  @State private payments: PaymentRecord[] = [];
  @State private loading: boolean = true;
  @State private purchasing: string = '';
  @State private restoring: boolean = false;
  private requestEpoch: number = 0;

  aboutToAppear(): void { this.load(); }

  private onLanguageChanged(): void { this.load(); }

  private context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
  }

  private async load(): Promise<void> {
    const epoch = ++this.requestEpoch;
    this.loading = true;
    let failedSections: number = 0;
    try {
      const plans = await BusinessRepository.memberPlans();
      if (epoch === this.requestEpoch) this.plans = plans;
    } catch (_) {
      failedSections += 1;
    }
    try {
      const membership = await BusinessRepository.membership();
      if (epoch === this.requestEpoch) this.membership = membership;
    } catch (_) {
      failedSections += 1;
    }
    try {
      const quota = await BusinessRepository.quota();
      if (epoch === this.requestEpoch) this.quota = quota;
    } catch (_) {
      failedSections += 1;
    }
    try {
      const notices = await BusinessRepository.membershipNotices();
      if (epoch === this.requestEpoch) this.notices = notices;
    } catch (_) {
      failedSections += 1;
    }
    try {
      const payments = await BusinessRepository.payments();
      if (epoch === this.requestEpoch) this.payments = payments;
    } catch (_) {
      failedSections += 1;
    } finally {
      if (epoch === this.requestEpoch) this.loading = false;
    }
    if (epoch === this.requestEpoch && failedSections > 0) {
      IBestToast.show(I18n.text(this.language,
        `部分会员数据暂时加载失败（${failedSections}/5），其他内容仍可使用`,
        `${failedSections} of 5 membership sections could not be loaded. Other content remains available.`));
    }
  }

  private async finishPurchase(result: IapVerifyResult): Promise<boolean> {
    if (!IapTransactionPolicy.canFinish(result)) return false;
    try {
      await HuaweiIapService.finish(
        this.context(),
        result.productType || '',
        result.purchaseToken || '',
        result.purchaseOrderId || ''
      );
      return true;
    } catch (_) {
      return false;
    }
  }

  private async purchase(plan: MemberPlan): Promise<void> {
    if (this.purchasing || this.restoring) return;
    this.purchasing = plan.id;
    try {
      const prepared = await BusinessRepository.prepareIap(plan.id);
      const purchaseData = await HuaweiIapService.purchase(this.context(), prepared);
      const verified = await BusinessRepository.verifyIap(prepared.orderNo, purchaseData);
      const finished = await this.finishPurchase(verified);
      IBestToast.show(finished
        ? I18n.text(this.language, '购买成功，会员已激活', 'Purchase successful. Membership activated.')
        : I18n.text(this.language, '权益已激活，请稍后点击恢复购买完成确认', 'Benefits are active. Use Restore Purchases later to finish confirmation.'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : error instanceof Error ? error.message
        : I18n.text(this.language, '购买未完成', 'Purchase was not completed'));
    } finally {
      this.purchasing = '';
    }
  }

  private async restorePurchases(): Promise<void> {
    if (this.restoring || this.purchasing) return;
    this.restoring = true;
    try {
      const records = await HuaweiIapService.restore(this.context());
      if (records.length === 0) {
        IBestToast.show(I18n.text(this.language, '当前华为账号没有可恢复的购买记录', 'No restorable purchases were found for this Huawei account'));
        return;
      }
      let restored: number = 0;
      let failed: number = 0;
      for (const record of records) {
        try {
          const result = await BusinessRepository.restoreIap(record.productType, record.purchaseData);
          if (await this.finishPurchase(result)) restored += 1;
          else failed += 1;
        } catch (_) {
          failed += 1;
        }
      }
      await this.load();
      IBestToast.show(failed === 0
        ? I18n.text(this.language, `已恢复 ${restored} 条购买记录`, `Restored ${restored} purchase(s)`)
        : I18n.text(this.language,
          `恢复完成：成功 ${restored} 条，待处理 ${failed} 条`,
          `Restore completed: ${restored} succeeded, ${failed} pending`));
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '恢复购买失败', 'Failed to restore purchases'));
    } finally {
      this.restoring = false;
    }
  }

  private async manageSubscription(): Promise<void> {
    if (this.restoring || this.purchasing) return;
    this.purchasing = '__manage__';
    try {
      await HuaweiIapService.manageSubscriptions(this.context());
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '无法打开华为订阅管理', 'Unable to open Huawei subscription management'));
    } finally {
      this.purchasing = '';
    }
  }

  private plansOf(type: string): MemberPlan[] {
    return this.plans.filter((item: MemberPlan): boolean => item.type === type && item.status === 'active');
  }

  private planRights(item: MemberPlan): string[] {
    return item.rights && item.rights.length > 0 ? item.rights
      : [I18n.text(this.language, '具体权益以套餐配置为准', 'Benefits are determined by the plan configuration')];
  }

  private periodLabel(item: MemberPlan): string {
    const count = Math.max(1, item.periodCount);
    if (item.period === 'monthly') return count === 1
      ? I18n.text(this.language, '月', 'month')
      : I18n.text(this.language, `${count}个月`, `${count} months`);
    if (item.period === 'yearly') return count === 1
      ? I18n.text(this.language, '年', 'year')
      : I18n.text(this.language, `${count}年`, `${count} years`);
    if (item.period === 'weekly') return count === 1
      ? I18n.text(this.language, '周', 'week')
      : I18n.text(this.language, `${count}周`, `${count} weeks`);
    if (item.period === 'daily') return count === 1
      ? I18n.text(this.language, '天', 'day')
      : I18n.text(this.language, `${count}天`, `${count} days`);
    return I18n.text(this.language, '次', 'purchase');
  }

  private statusLabel(value: string): string {
    if (value === 'active' || value === 'paid') return I18n.text(this.language, '有效', 'Active');
    if (value === 'trial') return I18n.text(this.language, '试用', 'Trial');
    if (value === 'expired') return I18n.text(this.language, '已到期', 'Expired');
    if (value === 'cancelled') return I18n.text(this.language, '已取消', 'Cancelled');
    if (value === 'refunded') return I18n.text(this.language, '已退款', 'Refunded');
    if (value === 'failed') return I18n.text(this.language, '失败', 'Failed');
    return value;
  }

  private remainingDays(): number {
    if (!this.membership?.endAt) return 0;
    return Math.max(0, Math.ceil((new Date(this.membership.endAt).getTime() - Date.now()) / 86400000));
  }

  private usedPercent(): number {
    if (!this.membership) return 0;
    const start = new Date(this.membership.startAt).getTime();
    const end = new Date(this.membership.endAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.max(0, Math.min(100, Math.round((Date.now() - start) / (end - start) * 100)));
  }

  @Builder
  private plan(item: MemberPlan) {
    Column({ space: 10 }) {
      Row() {
        Text(item.name).fontSize(18).fontWeight(FontWeight.Bold).layoutWeight(1);
        if (this.membership?.planId === item.id) {
          IBestTag({ text: I18n.text(this.language, '当前套餐', 'Current plan'), color: DesignTokens.brand(this.darkMode), round: true });
        }
      }.width('100%');
      Text(`¥${item.price.toFixed(2)} / ${this.periodLabel(item)}`)
        .fontSize(23).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
      if (item.originalPrice && item.originalPrice > item.price) {
        Text(I18n.text(this.language, `原价 ¥${item.originalPrice.toFixed(2)}`, `Regular ¥${item.originalPrice.toFixed(2)}`)).fontSize(11)
          .fontColor(DesignTokens.muted(this.darkMode)).decoration({ type: TextDecorationType.LineThrough });
      }
      ForEach(this.planRights(item), (feature: string) => {
        Text(`✓ ${feature}`).fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      }, (feature: string) => feature);
      IBestButton({
        text: this.membership?.planId === item.id
          ? I18n.text(this.language, '续费', 'Renew')
          : I18n.text(this.language, '立即开通', 'Subscribe'), type: 'primary',
        color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '100%', loading: this.purchasing === item.id,
        disabled: this.purchasing.length > 0 || this.restoring,
        onBtnClick: () => this.purchase(item)
      });
    }.width('100%').alignItems(HorizontalAlign.Start).padding(16)
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '会员中心', 'Membership'), isShowRight: true,
          rightLabel: this.restoring
            ? I18n.text(this.language, '恢复中…', 'Restoring…')
            : I18n.text(this.language, '恢复购买', 'Restore purchases'),
          isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back(),
          onRightClick: () => this.restorePurchases()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 14 }) {
              ForEach(this.notices, (notice: MembershipNotice) => {
                Row({ space: 10 }) {
                  Column() {
                    MerchantIcon({ name: notice.type === 'error' ? 'warning-o' : 'info-o',
                      color: notice.type === 'error' ? Color.White : DesignTokens.onBrand(this.darkMode), iconSize: 14 });
                  }.width(24).height(24).justifyContent(FlexAlign.Center)
                    .backgroundColor(notice.type === 'error' ? DesignTokens.danger(this.darkMode) : DesignTokens.brand(this.darkMode)).borderRadius(12);
                  Text(notice.text).fontSize(13).lineHeight(19).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
                }
                .width('100%').padding(12)
                .backgroundColor(notice.type === 'error' ? DesignTokens.dangerTint(this.darkMode) : DesignTokens.warningTint(this.darkMode))
                .borderRadius(12);
              }, (notice: MembershipNotice, index: number) => `${notice.type}-${notice.text}-${index}`);
              if (this.membership) {
                Column({ space: 8 }) {
                  Row() {
                    Text(this.membership.plan?.name || this.membership.planCode)
                      .fontSize(20).fontWeight(FontWeight.Bold).layoutWeight(1);
                    IBestTag({ text: this.statusLabel(this.membership.status), color: DesignTokens.success(this.darkMode), round: true });
                  }.width('100%');
                  Text(I18n.text(this.language,
                    `有效期至 ${this.membership.endAt.slice(0, 10)}`,
                    `Valid until ${this.membership.endAt.slice(0, 10)}`))
                    .fontSize(13).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  Row({ space: 5 }) {
                    Text(`${this.remainingDays()}`).fontSize(30).fontWeight(FontWeight.Bold).fontColor(DesignTokens.brand(this.darkMode));
                    Text(I18n.text(this.language, '天剩余', 'days left')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
                  }.width('100%').alignItems(VerticalAlign.Bottom);
                  Progress({ value: this.usedPercent(), total: 100 }).color(DesignTokens.brand(this.darkMode)).width('100%');
                  if (this.remainingDays() > 0 && this.remainingDays() <= 7) {
                    Text(I18n.text(this.language,
                      '即将到期，请及时续费以免影响经营功能。',
                      'Your membership expires soon. Renew to keep all business features available.'))
                      .fontSize(12).fontColor(DesignTokens.brand(this.darkMode)).width('100%');
                  }
                  if (this.membership.autoRenew) {
                    IBestButton({
                      text: I18n.text(this.language, '管理自动续费', 'Manage auto-renewal'),
                      plain: true, color: DesignTokens.brand(this.darkMode), btnWidth: '100%',
                      loading: this.purchasing === '__manage__',
                      disabled: this.purchasing.length > 0 || this.restoring,
                      onBtnClick: () => this.manageSubscription()
                    });
                  }
                }.width('100%').padding(18).backgroundColor(DesignTokens.brandTint(this.darkMode))
                  .borderRadius(DesignTokens.RADIUS_LARGE);
              }
              if (this.quota) {
                Column({ space: 8 }) {
                  Text(I18n.text(this.language, '本期配额', 'Current quota')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                  Text(I18n.text(this.language,
                    `推荐位 ${this.quota.pushSlotsUsed}/${this.quota.pushSlotsLimit}`,
                    `Featured slots ${this.quota.pushSlotsUsed}/${this.quota.pushSlotsLimit}`)).fontSize(13).width('100%');
                  Progress({ value: this.quota.pushSlotsUsed, total: Math.max(1, this.quota.pushSlotsLimit) })
                    .color(DesignTokens.brand(this.darkMode)).width('100%');
                  Text(`Banner ${this.quota.bannerUsed}/${this.quota.bannerLimit}`).fontSize(13).width('100%');
                  Progress({ value: this.quota.bannerUsed, total: Math.max(1, this.quota.bannerLimit) })
                    .color(DesignTokens.brand(this.darkMode)).width('100%');
                  Text(I18n.text(this.language,
                    `曝光量 ${this.quota.impressionUsed}/${this.quota.impressionLimit}`,
                    `Impressions ${this.quota.impressionUsed}/${this.quota.impressionLimit}`)).fontSize(13).width('100%');
                  Progress({ value: this.quota.impressionUsed, total: Math.max(1, this.quota.impressionLimit) })
                    .color(DesignTokens.brand(this.darkMode)).width('100%');
                }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
                  .borderRadius(DesignTokens.RADIUS_LARGE);
              }
              if (this.plansOf('basic').length > 0) {
                Text(I18n.text(this.language, '基础会员', 'Core membership')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Text(I18n.text(this.language, '商品、客户、门店、数据与营销能力', 'Product, customer, store, analytics and marketing features')).fontSize(12)
                  .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                ForEach(this.plansOf('basic'), (item: MemberPlan) => { this.plan(item); }, (item: MemberPlan) => item.id);
              }
              if (this.plansOf('ad').length > 0) {
                Text(I18n.text(this.language, '广告推广套餐', 'Advertising plans')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                Text(I18n.text(this.language, '选品广场曝光提升，与基础会员独立计费', 'Increased sourcing-plaza exposure, billed separately from core membership')).fontSize(12)
                  .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                ForEach(this.plansOf('ad'), (item: MemberPlan) => { this.plan(item); }, (item: MemberPlan) => item.id);
              }
              if (this.plansOf('addon').length > 0) {
                Text(I18n.text(this.language, '增值单项', 'Add-ons')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
                ForEach(this.plansOf('addon'), (item: MemberPlan) => { this.plan(item); }, (item: MemberPlan) => item.id);
              }
              Text(I18n.text(this.language, '缴费记录', 'Payment history')).fontSize(18).fontWeight(FontWeight.Bold).width('100%');
              ForEach(this.payments.slice(0, 10), (item: PaymentRecord) => {
                Row() {
                  Column({ space: 4 }) {
                    Text(item.planName).fontSize(14).fontWeight(FontWeight.Medium);
                    Text(item.createdAt.slice(0, 10)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                  }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                  Text(`¥${item.amount.toFixed(2)}`).fontSize(14);
                  IBestTag({ text: this.statusLabel(item.status), plain: true, color: DesignTokens.brand(this.darkMode) });
                }.width('100%').padding(12).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(10);
              }, (item: PaymentRecord) => item.id);
            }.width('100%').padding({ left: 16, right: 16, top: 12, bottom: this.safeBottom + 20 });
          }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
