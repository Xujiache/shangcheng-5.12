import { common } from '@kit.AbilityKit';
import {
  IBestActionSheet,
  IBestButton,
  IBestDialogUtil,
  IBestEmpty,
  IBestField,
  IBestNavBar,
  IBestSkeleton,
  IBestTag,
  IBestToast
} from '@ibestservices/ibest-ui';
import { PhoneService } from '../../core/device/PhoneService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon, MerchantIconName } from '../../core/theme/MerchantIcon';
import { InputValidators } from '../../core/validation/InputValidators';
import { I18n } from '../../core/i18n/I18n';
import { StaffItem, StaffMutation } from './BusinessModels';
import { BusinessRepository } from './BusinessRepository';

@Builder
export function StaffsBuilder(_: string) { StaffPage(); }

@Component
struct StaffPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @State private staffs: StaffItem[] = [];
  @State private roleFilter: string = 'all';
  @State private loading: boolean = false;
  @State private refreshing: boolean = false;
  @State private loadError: string = '';
  @State private editorVisible: boolean = false;
  @State private editingId: string = '';
  @State private name: string = '';
  @State private phone: string = '';
  @State private role: string = 'sales';
  @State private editingStatus: string = 'active';
  @State private editingPermissions: string[] = [];
  @State private saving: boolean = false;
  @State private actionId: string = '';
  private readonly defaultPermissions: string[] = ['product:read', 'product:write', 'order:read'];

  aboutToAppear(): void { this.load(); }

  private async load(): Promise<void> {
    if (this.loading) return;
    this.loading = true;
    try {
      const result = await BusinessRepository.staffs('', 1, 100);
      this.staffs = result.list;
      this.loadError = '';
    } catch (error) {
      this.loadError = error instanceof ApiError ? error.message
        : I18n.text(this.language, '员工加载失败，请稍后重试', 'Failed to load staff. Try again later.');
      if (this.staffs.length > 0) IBestToast.show(this.loadError);
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  private async refresh(): Promise<void> {
    if (this.loading) {
      this.refreshing = false;
      return;
    }
    this.refreshing = true;
    await this.load();
  }

  private open(item?: StaffItem): void {
    this.editingId = item?.id || '';
    this.name = item?.name || '';
    this.phone = item?.phone || '';
    this.role = item?.role || 'sales';
    this.editingStatus = item?.status || 'active';
    this.editingPermissions = item?.permissions || this.defaultPermissions;
    this.editorVisible = true;
  }

  private closeEditor(): void {
    if (!this.saving) this.editorVisible = false;
  }

  private async save(): Promise<void> {
    if (this.saving || this.actionId) return;
    if (!this.name.trim() || !InputValidators.isMainlandPhone(this.phone)) {
      IBestToast.show(I18n.text(this.language, '请填写姓名和正确手机号', 'Enter a name and valid phone number'));
      return;
    }
    const body: StaffMutation = {
      name: this.name.trim(), phone: this.phone, role: this.role, status: this.editingStatus,
      permissions: this.editingPermissions.length > 0 ? this.editingPermissions : this.defaultPermissions
    };
    this.saving = true;
    try {
      if (this.editingId) await BusinessRepository.updateStaff(this.editingId, body);
      else await BusinessRepository.createStaff(body);
      this.editorVisible = false;
      IBestToast.show(I18n.text(this.language, '员工已保存', 'Staff member saved'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message : I18n.text(this.language, '保存失败', 'Failed to save'));
    } finally {
      this.saving = false;
    }
  }

  private showStaffActions(item: StaffItem): void {
    if (item.status !== 'active') return;
    IBestActionSheet.show({
      actions: [I18n.text(this.language, '办理离职', 'Mark as left')],
      cancelText: I18n.text(this.language, '取消', 'Cancel'),
      onSelect: (_index: number): void => this.changeEmployment(item)
    });
  }

  private changeEmployment(item: StaffItem): void {
    IBestDialogUtil.open({
      title: I18n.text(this.language, '办理离职', 'Mark as left'),
      message: I18n.text(this.language,
        `确定将 ${item.name} 标记为离职吗？离职后将无法登录后台，历史业务记录会保留。`,
        `Mark ${item.name} as having left? They will no longer be able to sign in, while business history remains.`),
      showCancelButton: true,
      cancelButtonText: I18n.text(this.language, '取消', 'Cancel'),
      confirmButtonText: I18n.text(this.language, '确认', 'Confirm'),
      confirmButtonColor: DesignTokens.danger(this.darkMode),
      onConfirm: () => { this.updateEmployment(item); }
    });
  }

  private async updateEmployment(item: StaffItem): Promise<void> {
    if (this.actionId || this.saving) return;
    this.actionId = item.id;
    const body: StaffMutation = {
      name: item.name, phone: item.phone, role: item.role, status: 'left', permissions: item.permissions
    };
    try {
      await BusinessRepository.updateStaff(item.id, body);
      IBestToast.show(I18n.text(this.language, '已办理离职', 'Marked as left'));
      await this.load();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '状态更新失败', 'Failed to update status'));
    } finally {
      this.actionId = '';
    }
  }

  private roleLabel(value: string): string {
    return value === 'manager' ? I18n.text(this.language, '店长', 'Manager')
      : value === 'cs' ? I18n.text(this.language, '客服', 'Support')
        : I18n.text(this.language, '销售员', 'Sales');
  }

  private roleIcon(value: string): MerchantIconName {
    if (value === 'manager') return 'manager-o';
    if (value === 'cs') return 'service-o';
    return 'friends-o';
  }

  private permissionLabel(value: string): string {
    if (value === 'product:read') return I18n.text(this.language, '商品查看', 'View products');
    if (value === 'product:write') return I18n.text(this.language, '商品编辑', 'Edit products');
    if (value === 'order:read') return I18n.text(this.language, '订单查看', 'View orders');
    if (value === 'order:write') return I18n.text(this.language, '订单处理', 'Manage orders');
    if (value === 'customer:read') return I18n.text(this.language, '客户查看', 'View customers');
    if (value === 'customer:write') return I18n.text(this.language, '客户管理', 'Manage customers');
    return value;
  }

  private permissionSummary(item: StaffItem): string {
    const labels = item.permissions.slice(0, 3).map((value: string) => this.permissionLabel(value));
    const suffix = item.permissions.length > 3 ? ` +${item.permissions.length - 3}` : '';
    const prefix = I18n.text(this.language, '权限：', 'Access: ');
    return `${prefix}${labels.join(' · ')}${suffix}`;
  }

  private visibleStaffs(): StaffItem[] {
    return this.roleFilter === 'all' ? this.staffs
      : this.staffs.filter((item: StaffItem) => item.role === this.roleFilter);
  }

  private roleCount(value: string): number {
    return value === 'all' ? this.staffs.length
      : this.staffs.filter((item: StaffItem) => item.role === value).length;
  }

  private countActiveStaff(): number {
    return this.staffs.filter((item: StaffItem) => item.status === 'active').length;
  }

  private countLeftStaff(): number {
    return this.staffs.filter((item: StaffItem) => item.status !== 'active').length;
  }

  private monthlyTotal(): number {
    return this.staffs.reduce((total: number, item: StaffItem) => total + (item.monthlyPerformance || 0), 0);
  }

  private topPerformance(): number {
    return Math.max(...this.staffs.map((item: StaffItem) => item.monthlyPerformance || 0), 1);
  }

  private maskedPhone(phone: string): string {
    if (phone.length !== 11) return phone;
    return `${phone.slice(0, 3)}****${phone.slice(7)}`;
  }

  private async call(item: StaffItem): Promise<void> {
    try {
      await PhoneService.dial(this.getUIContext().getHostContext() as common.UIAbilityContext, item.phone);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '无法打开拨号界面', 'Unable to open the dialer'));
    }
  }

  @Builder
  private overviewMetric(value: string, label: string, emphasized: boolean = false) {
    Column({ space: 4 }) {
      Text(value).fontSize(emphasized ? 20 : 18).fontWeight(FontWeight.Bold)
        .fontColor(emphasized ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode))
        .maxLines(1).textOverflow({ overflow: TextOverflow.Ellipsis });
      Text(label).fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1);
    }.layoutWeight(1).alignItems(HorizontalAlign.Start);
  }

  @Builder
  private overviewCard() {
    Column({ space: 12 }) {
      Row() {
        Text(I18n.text(this.language, '团队概览', 'Team overview'))
          .fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
        Blank();
        Row({ space: 5 }) {
          Circle().width(6).height(6).fill(DesignTokens.success(this.darkMode));
          Text(I18n.text(this.language, '数据实时更新', 'Live data'))
            .fontSize(10).fontColor(DesignTokens.muted(this.darkMode));
        }
      }.width('100%');
      Row({ space: 12 }) {
        this.overviewMetric(`${this.countActiveStaff()}`, I18n.text(this.language, '在职员工', 'Active staff'));
        Divider().vertical(true).height(34).color(DesignTokens.border(this.darkMode));
        this.overviewMetric(`¥${this.monthlyTotal().toFixed(2)}`,
          I18n.text(this.language, '本月业绩', 'Monthly performance'), true);
        Divider().vertical(true).height(34).color(DesignTokens.border(this.darkMode));
        this.overviewMetric(`${this.countLeftStaff()}`, I18n.text(this.language, '已离职', 'Former staff'));
      }.width('100%');
    }.width('100%').padding({ left: 16, right: 16, top: 14, bottom: 14 })
      .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private filterSegment(value: string, label: string) {
    Column({ space: 2 }) {
      Text(label).fontSize(12).fontWeight(this.roleFilter === value ? FontWeight.Medium : FontWeight.Regular)
        .fontColor(this.roleFilter === value ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
      Text(`${this.roleCount(value)}`).fontSize(10)
        .fontColor(this.roleFilter === value ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode));
    }.layoutWeight(1).height(44).justifyContent(FlexAlign.Center)
      .backgroundColor(this.roleFilter === value ? DesignTokens.selectedSurface(this.darkMode) : Color.Transparent)
      .borderRadius(12)
      .border({ width: this.roleFilter === value ? 0.75 : 0, color: DesignTokens.brandOpacity(this.darkMode) })
      .onClick(() => { this.roleFilter = value; });
  }

  @Builder
  private roleSelector(value: string, label: string) {
    Row({ space: 6 }) {
      MerchantIcon({ name: this.roleIcon(value),
        color: this.role === value ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode), iconSize: 17 });
      Text(label).fontSize(13)
        .fontColor(this.role === value ? DesignTokens.brand(this.darkMode) : DesignTokens.text(this.darkMode));
    }.layoutWeight(1).height(42).justifyContent(FlexAlign.Center)
      .backgroundColor(this.role === value ? DesignTokens.selectedSurface(this.darkMode) : DesignTokens.subtle(this.darkMode))
      .borderRadius(13)
      .border({ width: this.role === value ? 0.75 : 0, color: DesignTokens.brandOpacity(this.darkMode) })
      .onClick(() => { this.role = value; });
  }

  @Builder
  private compactAction(icon: MerchantIconName, label: string, onTap: () => void, muted: boolean = false) {
    Row({ space: 5 }) {
      MerchantIcon({ name: icon,
        color: muted ? DesignTokens.muted(this.darkMode) : DesignTokens.brand(this.darkMode), iconSize: 17 });
      Text(label).fontSize(12)
        .fontColor(muted ? DesignTokens.muted(this.darkMode) : DesignTokens.text(this.darkMode));
    }.height(34).padding({ left: 10, right: 10 }).backgroundColor(DesignTokens.subtle(this.darkMode))
      .borderRadius(11).onClick(() => onTap());
  }

  @Builder
  private staffCard(item: StaffItem) {
    Column({ space: 10 }) {
      Row({ space: 10 }) {
        Stack({ alignContent: Alignment.Center }) {
          Circle().width(44).height(44).fill(DesignTokens.iconSurface(this.darkMode));
          MerchantIcon({ name: this.roleIcon(item.role), color: DesignTokens.brand(this.darkMode), iconSize: 23 });
        }.width(44).height(44);
        Column({ space: 5 }) {
          Row({ space: 6 }) {
            Text(item.name).fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode))
              .maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis }).layoutWeight(1);
            IBestTag({ text: this.roleLabel(item.role), plain: true, color: DesignTokens.brand(this.darkMode) });
            if (item.status !== 'active') {
              IBestTag({ text: I18n.text(this.language, '已离职', 'Left'), plain: true,
                color: DesignTokens.muted(this.darkMode) });
            }
          }.width('100%');
          Text(this.maskedPhone(item.phone)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Column({ space: 3 }) {
          Text(`¥${(item.monthlyPerformance || 0).toFixed(2)}`).fontSize(15).fontWeight(FontWeight.Bold)
            .fontColor(DesignTokens.brand(this.darkMode)).maxLines(1);
          Text(I18n.text(this.language, '本月业绩', 'This month')).fontSize(10)
            .fontColor(DesignTokens.muted(this.darkMode));
        }.alignItems(HorizontalAlign.End);
      }.width('100%');
      if (item.permissions.length > 0) {
        Text(this.permissionSummary(item)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode))
          .width('100%').maxLines(2).textOverflow({ overflow: TextOverflow.Ellipsis });
      }
      if (item.status === 'active') {
        Stack({ alignContent: Alignment.Start }) {
          Row().height(3).width('100%').backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(2);
          Row().height(3).width(`${Math.round((item.monthlyPerformance || 0) / this.topPerformance() * 100)}%`)
            .backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius(2);
        }.width('100%').height(3);
      }
      Row({ space: 8 }) {
        this.compactAction('phone-o', I18n.text(this.language, '联系', 'Contact'), () => this.call(item));
        this.compactAction('records-o', I18n.text(this.language, '编辑', 'Edit'), () => this.open(item));
        Blank();
        if (item.status === 'active') {
          this.compactAction('more-o', I18n.text(this.language, '更多', 'More'), () => this.showStaffActions(item), true);
        }
      }.width('100%');
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private loadingSkeleton() {
    Column({ space: 10 }) {
      ForEach([0, 1, 2], (_: number) => {
        Column() { IBestSkeleton({ rows: 3, animated: true, radius: 8 }); }
          .width('100%').height(132).padding(14)
          .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE);
      });
    }.width('100%').padding({ left: 16, right: 16, top: 10 });
  }

  @Builder
  private editorSheet() {
    Column({ space: 14 }) {
      Row() {
        Column({ space: 3 }) {
          Text(this.editingId ? I18n.text(this.language, '编辑员工', 'Edit staff member')
            : I18n.text(this.language, '邀请员工', 'Invite staff member'))
            .fontSize(20).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Text(I18n.text(this.language, '员工资料和原有权限规则将保持不变', 'Existing access rules remain unchanged'))
            .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.alignItems(HorizontalAlign.Start).layoutWeight(1);
        Column() { MerchantIcon({ name: 'cross', color: DesignTokens.muted(this.darkMode), iconSize: 19 }); }
          .width(38).height(38).justifyContent(FlexAlign.Center)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(19).onClick(() => this.closeEditor());
      }.width('100%');
      IBestField({ value: $name, label: I18n.text(this.language, '姓名', 'Name'),
        placeholder: I18n.text(this.language, '请输入员工姓名', 'Enter the staff name') });
      IBestField({ value: $phone, label: I18n.text(this.language, '手机号', 'Phone'),
        placeholder: I18n.text(this.language, '请输入11位手机号', 'Enter an 11-digit phone number'), type: 'phone' });
      Text(I18n.text(this.language, '员工角色', 'Staff role')).fontSize(12)
        .fontColor(DesignTokens.muted(this.darkMode)).width('100%');
      Row({ space: 8 }) {
        this.roleSelector('sales', I18n.text(this.language, '销售', 'Sales'));
        this.roleSelector('cs', I18n.text(this.language, '客服', 'Support'));
        this.roleSelector('manager', I18n.text(this.language, '店长', 'Manager'));
      }.width('100%');
      Row({ space: 10 }) {
        IBestButton({ text: I18n.text(this.language, '取消', 'Cancel'), plain: true,
          color: DesignTokens.muted(this.darkMode), btnWidth: '48%', disabled: this.saving,
          onBtnClick: () => this.closeEditor() });
        IBestButton({ text: I18n.text(this.language, '保存', 'Save'), type: 'primary',
          color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), btnWidth: '48%',
          loading: this.saving, disabled: this.saving || this.actionId.length > 0, onBtnClick: () => this.save() });
      }.width('100%');
    }.width('100%').padding({ left: 20, right: 20, top: 20, bottom: this.safeBottom + 20 })
      .backgroundColor(DesignTokens.elevatedSurface(this.darkMode))
      .borderRadius({ topLeft: 26, topRight: 26 }).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({
            title: I18n.text(this.language, '员工管理', 'Staff management'), isShowRight: true,
            rightLabel: I18n.text(this.language, '邀请', 'Invite'), rightLabelColor: DesignTokens.brand(this.darkMode),
            rightIcon: 'add-o', rightIconColor: DesignTokens.brand(this.darkMode), rightIconSize: 19,
            isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
            titleColor: DesignTokens.text(this.darkMode), leftIconColor: DesignTokens.text(this.darkMode),
            onLeftClick: () => AppRouter.back(), onRightClick: () => this.open()
          });
          Column({ space: 10 }) {
            this.overviewCard();
            Row({ space: 4 }) {
              this.filterSegment('all', I18n.text(this.language, '全部', 'All'));
              this.filterSegment('sales', I18n.text(this.language, '销售', 'Sales'));
              this.filterSegment('cs', I18n.text(this.language, '客服', 'Support'));
              this.filterSegment('manager', I18n.text(this.language, '店长', 'Managers'));
            }.width('100%').padding(4).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(16)
              .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
          }.width('100%').padding({ left: this.windowWidth >= 720 ? 24 : 16,
            right: this.windowWidth >= 720 ? 24 : 16, top: 10 });

          if (this.loading && this.staffs.length === 0) {
            this.loadingSkeleton();
          } else if (this.loadError && this.staffs.length === 0) {
            Column({ space: 12 }) {
              IBestEmpty({ description: this.loadError });
              IBestButton({ text: I18n.text(this.language, '重新加载', 'Reload'), type: 'primary',
                color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                onBtnClick: () => this.load() });
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.visibleStaffs().length === 0) {
            Column() { IBestEmpty({ description: I18n.text(this.language,
              '当前筛选下暂无员工', 'No staff for this filter') }); }
              .layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            Refresh({ refreshing: $$this.refreshing }) {
              List({ space: 10 }) {
                if (this.loadError) {
                  ListItem() {
                    Row() {
                      Text(this.loadError).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
                      Blank();
                      Text(I18n.text(this.language, '重试', 'Retry')).fontSize(11)
                        .fontColor(DesignTokens.brand(this.darkMode)).onClick(() => this.load());
                    }.width('100%').padding(10).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10);
                  }
                }
                ForEach(this.visibleStaffs(), (item: StaffItem) => {
                  ListItem() { this.staffCard(item); }
                }, (item: StaffItem) => item.id);
              }.lanes(this.windowWidth >= 720 ? 2 : 1).layoutWeight(1)
                .padding({ left: this.windowWidth >= 720 ? 24 : 16, right: this.windowWidth >= 720 ? 24 : 16,
                  top: 10, bottom: this.safeBottom + 16 }).scrollBar(BarState.Off);
            }.layoutWeight(1).onRefreshing(() => this.refresh());
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));

        if (this.editorVisible) {
          Column().width('100%').height('100%').backgroundColor('#8A000000').onClick(() => this.closeEditor());
          this.editorSheet();
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true);
  }
}
