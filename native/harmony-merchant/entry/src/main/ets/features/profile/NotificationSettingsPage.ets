import { common } from '@kit.AbilityKit';
import { IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { HarmonyPushClient, PushPreferences } from '../../core/push/HarmonyPushClient';
import { PushPreferenceStore } from '../../core/push/PushPreferenceStore';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function NotificationSettingsBuilder(_: string) { NotificationSettingsPage(); }

@Component
struct NotificationSettingsPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private orders: boolean = true;
  @State private refunds: boolean = true;
  @State private chat: boolean = true;
  @State private loading: boolean = true;
  @State private saving: boolean = false;
  private lastSaved: PushPreferences = { orders: true, refunds: true, chat: true };

  aboutToAppear(): void { this.load(); }

  private context(): common.UIAbilityContext {
    return this.getUIContext().getHostContext() as common.UIAbilityContext;
  }

  private apply(value: PushPreferences): void {
    this.orders = value.orders;
    this.refunds = value.refunds;
    this.chat = value.chat;
  }

  private async load(): Promise<void> {
    this.loading = true;
    try {
      const cached = await PushPreferenceStore.read(this.context());
      this.apply(cached);
      this.lastSaved = cached;
    } catch (_) {}
    try {
      const remote = await HarmonyPushClient.getPreferences();
      this.apply(remote);
      this.lastSaved = remote;
      await PushPreferenceStore.write(this.context(), remote);
    } catch (_) {
      IBestToast.show(I18n.text(this.language,
        '当前显示设备上最后一次成功保存的通知设置',
        'Showing the last notification settings saved on this device'));
    } finally { this.loading = false; }
  }

  private async save(next: PushPreferences): Promise<void> {
    if (this.saving) return;
    this.apply(next);
    this.saving = true;
    try {
      const saved = await HarmonyPushClient.setPreferences(next);
      this.apply(saved);
      this.lastSaved = saved;
      await PushPreferenceStore.write(this.context(), saved);
      AppStorage.setOrCreate<number>('pushPreferencesEpoch',
        (AppStorage.get<number>('pushPreferencesEpoch') || 0) + 1);
    } catch (_) {
      this.apply(this.lastSaved);
      IBestToast.show(I18n.text(this.language, '通知设置保存失败，已恢复原设置',
        'Failed to save notification settings. Previous settings were restored.'));
    } finally { this.saving = false; }
  }

  private masterOn(): boolean { return this.orders && this.refunds && this.chat; }

  @Builder
  private toggleRow(title: string, description: string, value: boolean, onChange: (next: boolean) => void,
    border: boolean = true) {
    Row({ space: 12 }) {
      Column({ space: 4 }) {
        Text(title).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode)).width('100%');
        Text(description).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(2);
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
      Toggle({ type: ToggleType.Switch, isOn: value })
        .selectedColor(DesignTokens.brand(this.darkMode)).enabled(!this.loading && !this.saving)
        .onChange((next: boolean): void => onChange(next));
    }.width('100%').height(68).padding({ left: 16, right: 16 })
      .border({ width: { bottom: border ? 1 : 0 }, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '消息通知', 'Notifications'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Scroll() {
          Column({ space: 16 }) {
            Row({ space: 12 }) {
              Column() { MerchantIcon({ name: 'envelop-o', color: DesignTokens.brand(this.darkMode), iconSize: 28 }); }
                .width(54).height(54).justifyContent(FlexAlign.Center)
                .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(18);
              Column({ space: 4 }) {
                Text(I18n.text(this.language, '及时掌握店铺动态', 'Stay on top of store activity'))
                  .fontSize(17).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).width('100%');
                Text(I18n.text(this.language,
                  '只开启对经营重要的提醒，减少无关打扰。',
                  'Enable only the alerts that matter to your business.'))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%').lineHeight(18);
              }.layoutWeight(1).alignItems(HorizontalAlign.Start);
            }.width('100%').padding(18).backgroundColor(DesignTokens.card(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_XL).border({ width: 1, color: DesignTokens.border(this.darkMode) });
            Column() {
              this.toggleRow(I18n.text(this.language, '推送通知', 'Push notifications'),
                I18n.text(this.language, '统一开启或关闭全部业务提醒', 'Turn all business alerts on or off'),
                this.masterOn(), (next: boolean): void => { this.save({ orders: next, refunds: next, chat: next }); });
              this.toggleRow(I18n.text(this.language, '新订单提醒', 'New order alerts'),
                I18n.text(this.language, '新订单、待发货和订单状态变化', 'New orders, fulfillment and status changes'),
                this.orders, (next: boolean): void => { this.save({ orders: next, refunds: this.refunds, chat: this.chat }); });
              this.toggleRow(I18n.text(this.language, '售后提醒', 'After-sales alerts'),
                I18n.text(this.language, '退款申请与售后处理进度', 'Refund requests and after-sales progress'),
                this.refunds, (next: boolean): void => { this.save({ orders: this.orders, refunds: next, chat: this.chat }); });
              this.toggleRow(I18n.text(this.language, '客服消息', 'Customer messages'),
                I18n.text(this.language, '客户咨询和未读会话', 'Customer inquiries and unread conversations'),
                this.chat, (next: boolean): void => { this.save({ orders: this.orders, refunds: this.refunds, chat: next }); }, false);
            }.width('100%').backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20)
              .border({ width: 1, color: DesignTokens.border(this.darkMode) }).clip(true);
            if (this.loading || this.saving) {
              Row({ space: 8 }) {
                LoadingProgress().width(18).height(18).color(DesignTokens.brand(this.darkMode));
                Text(this.loading
                  ? I18n.text(this.language, '正在同步通知设置', 'Syncing notification settings')
                  : I18n.text(this.language, '正在保存', 'Saving'))
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
              }.width('100%').justifyContent(FlexAlign.Center);
            }
            Text(I18n.text(this.language,
              '系统级通知权限仍可在 HarmonyOS“设置 → 通知”中调整。',
              'System notification permissions can also be changed in HarmonyOS Settings.'))
              .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%').lineHeight(18).padding({ left: 4, right: 4 });
          }.width('100%').constraintSize({ maxWidth: 680 })
            .padding({ left: 16, right: 16, top: 16, bottom: this.safeBottom + 24 });
        }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off);
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
