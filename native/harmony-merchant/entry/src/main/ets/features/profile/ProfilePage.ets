import { common } from '@kit.AbilityKit';
import { IBestActionSheet, IBestButton, IBestField, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { FileUploadService } from '../../core/file/FileUploadService';
import { I18n } from '../../core/i18n/I18n';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { MerchantProfile, ProfileMutation } from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { LocationPolicy } from './LocationPolicy';

@Builder
export function ProfileBuilder(_: string) { ProfilePage(); }

@Component
struct ProfilePage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageProp('windowWidth') private windowWidth: number = 390;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @StorageLink('locationEpoch') @Watch('onLocationChanged') private locationEpoch: number = 0;
  @State private original: MerchantProfile | null = null;
  @State private originalFingerprint: string = '';
  @State private shopName: string = '';
  @State private contactName: string = '';
  @State private contactPhone: string = '';
  @State private email: string = '';
  @State private categories: string[] = [];
  @State private region: string = '';
  @State private address: string = '';
  @State private description: string = '';
  @State private avatar: string = '';
  @State private latitude: number = 0;
  @State private longitude: number = 0;
  @State private hasLocation: boolean = false;
  @State private loading: boolean = true;
  @State private loadError: boolean = false;
  @State private saving: boolean = false;
  @State private uploading: boolean = false;
  @State private categorySheetVisible: boolean = false;
  @State private categoryDraft: string[] = [];
  @State private categoryKeyword: string = '';

  private readonly categoryOptions: string[] = [
    I18n.contract('家具'), I18n.contract('灯具'), I18n.contract('布艺'), I18n.contract('家居'),
    I18n.contract('建材'), I18n.contract('厨卫'), I18n.contract('家电'), I18n.contract('装饰'),
    I18n.contract('办公'), I18n.contract('户外')
  ];

  aboutToAppear(): void { this.load(); }

  private onLocationChanged(): void {
    this.region = AppStorage.get<string>('pickedRegion') || this.region;
    this.address = AppStorage.get<string>('pickedAddress') || this.address;
    const latitude = AppStorage.get<number>('pickedLatitude');
    const longitude = AppStorage.get<number>('pickedLongitude');
    const hasLocation = AppStorage.get<boolean>('pickedLocationSet') || false;
    if (hasLocation && latitude !== undefined && longitude !== undefined &&
      LocationPolicy.isValidCoordinate(latitude, longitude)) {
      this.latitude = latitude;
      this.longitude = longitude;
      this.hasLocation = true;
    }
  }

  private async load(): Promise<void> {
    this.loading = true;
    this.loadError = false;
    try {
      const data = await BusinessRepository.profile();
      this.original = data;
      this.shopName = data.shopName;
      this.contactName = data.contactName;
      this.contactPhone = data.contactPhone;
      this.email = data.email;
      this.categories = (data.categories || []).map((item: string): string => this.categoryCode(item));
      this.region = data.region || '';
      this.address = data.address;
      this.description = data.description;
      this.avatar = data.avatar || '';
      const hasNumericCoordinates = typeof data.latitude === 'number' && typeof data.longitude === 'number';
      this.hasLocation = hasNumericCoordinates &&
        LocationPolicy.isValidCoordinate(data.latitude as number, data.longitude as number);
      this.latitude = this.hasLocation ? data.latitude as number : 0;
      this.longitude = this.hasLocation ? data.longitude as number : 0;
      this.originalFingerprint = this.fingerprint();
      AppStorage.setOrCreate<number>('pickedLatitude', this.latitude);
      AppStorage.setOrCreate<number>('pickedLongitude', this.longitude);
      AppStorage.setOrCreate<boolean>('pickedLocationSet', this.hasLocation);
    } catch (error) {
      this.loadError = this.original === null;
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '资料加载失败', 'Failed to load profile'));
    } finally {
      this.loading = false;
    }
  }

  private chooseAvatar(): void {
    if (this.uploading || this.saving) return;
    IBestActionSheet.show({
      actions: [
        I18n.text(this.language, '从相册选择', 'Choose from Photos'),
        I18n.text(this.language, '拍照', 'Take photo')
      ],
      cancelText: I18n.text(this.language, '取消', 'Cancel'),
      onSelect: (index: number): void => {
        if (index === 0) this.chooseAvatarFromAlbum();
        else if (index === 1) this.captureAvatar();
      }
    });
  }

  private async chooseAvatarFromAlbum(): Promise<void> {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(1, 'avatar');
      if (urls.length > 0) this.avatar = urls[0];
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '头像上传失败', 'Failed to upload avatar'));
    } finally {
      this.uploading = false;
    }
  }

  private async captureAvatar(): Promise<void> {
    if (this.uploading || this.saving) return;
    this.uploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'avatar');
      if (url) this.avatar = url;
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '头像拍摄上传失败', 'Failed to capture and upload avatar'));
    } finally {
      this.uploading = false;
    }
  }

  private categoryCode(value: string): string {
    switch (value.toLowerCase()) {
      case 'furniture': return I18n.contract('家具');
      case 'lights':
      case 'lighting': return I18n.contract('灯具');
      case 'fabric':
      case 'textile': return I18n.contract('布艺');
      case 'home':
      case 'household': return I18n.contract('家居');
      case 'building':
      case 'buildingmaterial': return I18n.contract('建材');
      case 'kitchen':
      case 'bathroom': return I18n.contract('厨卫');
      case 'appliance':
      case 'appliances': return I18n.contract('家电');
      case 'decor':
      case 'decoration': return I18n.contract('装饰');
      case 'office': return I18n.contract('办公');
      case 'outdoor': return I18n.contract('户外');
      default: return value;
    }
  }

  private categoryLabel(value: string): string {
    if (value === I18n.contract('家具')) return I18n.text(this.language, '家具', 'Furniture');
    if (value === I18n.contract('灯具')) return I18n.text(this.language, '灯具', 'Lighting');
    if (value === I18n.contract('布艺')) return I18n.text(this.language, '布艺', 'Fabrics');
    if (value === I18n.contract('家居')) return I18n.text(this.language, '家居', 'Home');
    if (value === I18n.contract('建材')) return I18n.text(this.language, '建材', 'Building materials');
    if (value === I18n.contract('厨卫')) return I18n.text(this.language, '厨卫', 'Kitchen and bath');
    if (value === I18n.contract('家电')) return I18n.text(this.language, '家电', 'Appliances');
    if (value === I18n.contract('装饰')) return I18n.text(this.language, '装饰', 'Decor');
    if (value === I18n.contract('办公')) return I18n.text(this.language, '办公', 'Office');
    if (value === I18n.contract('户外')) return I18n.text(this.language, '户外', 'Outdoor');
    return value;
  }

  private openCategorySheet(): void {
    this.categoryDraft = [...this.categories];
    this.categoryKeyword = '';
    this.categorySheetVisible = true;
  }

  private closeCategorySheet(): void {
    this.categorySheetVisible = false;
    this.categoryKeyword = '';
  }

  private toggleDraftCategory(value: string): void {
    this.categoryDraft = this.categoryDraft.includes(value)
      ? this.categoryDraft.filter((item: string): boolean => item !== value)
      : [...this.categoryDraft, value];
  }

  private confirmCategories(): void {
    if (this.categoryDraft.length === 0) {
      IBestToast.show(I18n.text(this.language, '至少选择 1 个经营品类', 'Select at least one operating category'));
      return;
    }
    this.categories = [...this.categoryDraft];
    this.closeCategorySheet();
  }

  private visibleCategoryOptions(): string[] {
    const keyword = this.categoryKeyword.trim().toLowerCase();
    if (!keyword) return this.categoryOptions;
    return this.categoryOptions.filter((item: string): boolean =>
      this.categoryLabel(item).toLowerCase().includes(keyword));
  }

  private categorySummary(): string {
    if (this.categories.length === 0) return I18n.text(this.language, '请选择经营品类', 'Select operating categories');
    const labels = this.categories.map((item: string): string => this.categoryLabel(item));
    if (labels.length <= 3) return labels.join(I18n.text(this.language, '、', ', '));
    return I18n.text(this.language, `${labels.slice(0, 3).join('、')}等 ${labels.length} 项`,
      `${labels.slice(0, 3).join(', ')} and ${labels.length - 3} more`);
  }

  private fingerprint(): string {
    return [
      this.shopName, this.contactName, this.contactPhone, this.email,
      [...this.categories].sort().join(','), this.region, this.address,
      this.description, this.avatar, `${this.latitude}`, `${this.longitude}`, `${this.hasLocation}`
    ].join('|');
  }

  private hasChanges(): boolean { return this.fingerprint() !== this.originalFingerprint; }

  private async save(): Promise<void> {
    if (this.saving) return;
    if (this.uploading) {
      IBestToast.show(I18n.text(this.language, '头像仍在上传，请稍候', 'The avatar is still uploading. Please wait.'));
      return;
    }
    if (!this.shopName.trim()) {
      IBestToast.show(I18n.text(this.language, '请填写店名', 'Enter a store name'));
      return;
    }
    if (this.contactPhone && !/^[\d\s+\-*()]+$/.test(this.contactPhone)) {
      IBestToast.show(I18n.text(this.language, '联系手机格式不对', 'Invalid contact phone format'));
      return;
    }
    if (this.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email)) {
      IBestToast.show(I18n.text(this.language, '邮箱格式不对', 'Invalid email format'));
      return;
    }
    if (this.categories.length === 0) {
      IBestToast.show(I18n.text(this.language, '至少选择 1 个经营品类', 'Select at least one operating category'));
      return;
    }
    const body: ProfileMutation = {
      shopName: this.shopName.trim(),
      contactName: this.contactName.trim(),
      contactPhone: this.contactPhone.trim(),
      email: this.email.trim(),
      categories: this.categories,
      region: this.region.trim(),
      address: this.address.trim(),
      description: this.description.trim(),
      avatar: this.avatar || undefined,
      latitude: this.hasLocation ? this.latitude : undefined,
      longitude: this.hasLocation ? this.longitude : undefined
    };
    this.saving = true;
    try {
      const updated = await BusinessRepository.saveProfile(body);
      this.original = updated;
      this.originalFingerprint = this.fingerprint();
      AppStorage.setOrCreate<number>('merchantProfileChangedAt', Date.now());
      IBestToast.show(I18n.text(this.language, '资料已保存', 'Profile saved'));
      AppRouter.back();
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '保存失败', 'Save failed'));
    } finally {
      this.saving = false;
    }
  }

  @Builder
  private identitySection() {
    Row({ space: 14 }) {
      Stack({ alignContent: Alignment.BottomEnd }) {
        if (this.avatar) {
          Image(this.avatar).width(72).height(72).borderRadius(24).objectFit(ImageFit.Cover);
        } else {
          Column() {
            Text((this.shopName || '?').slice(0, 1)).fontSize(26).fontWeight(FontWeight.Bold)
              .fontColor(DesignTokens.onBrand(this.darkMode));
          }.width(72).height(72).borderRadius(24).backgroundColor(DesignTokens.brand(this.darkMode))
            .justifyContent(FlexAlign.Center);
        }
        Column() { MerchantIcon({ name: 'photograph', color: DesignTokens.onBrand(this.darkMode), iconSize: 14 }); }
          .width(26).height(26).justifyContent(FlexAlign.Center).borderRadius(13)
          .backgroundColor(DesignTokens.brand(this.darkMode));
      }.width(74).height(74).onClick(() => this.chooseAvatar());
      Column({ space: 6 }) {
        Text(this.shopName || I18n.text(this.language, '未命名店铺', 'Unnamed store'))
          .fontSize(18).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).maxLines(1);
        if (this.original) {
          Text(I18n.text(this.language, `商户号 ${this.original.merchantNo}`, `Merchant ID ${this.original.merchantNo}`))
            .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).maxLines(1);
          Text(I18n.text(this.language, `状态：${this.original.status || '--'}`, `Status: ${this.original.status || '--'}`))
            .fontSize(11).fontColor(DesignTokens.brand(this.darkMode));
        }
        Text(this.uploading ? I18n.text(this.language, '头像上传中', 'Uploading avatar')
          : I18n.text(this.language, '点击头像更换', 'Tap the avatar to change it'))
          .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private contactSection() {
    Column() {
      Text(I18n.text(this.language, '基本与联系信息', 'Basic and contact information'))
        .fontSize(15).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode))
        .width('100%').padding({ left: 10, top: 8, bottom: 8 });
      IBestField({ value: $shopName, label: I18n.text(this.language, '店铺名称', 'Store name'),
        placeholder: I18n.text(this.language, '请输入店铺名称', 'Enter the store name'), maxlength: 40,
        radius: DesignTokens.RADIUS_FIELD });
      IBestField({ value: $contactName, label: I18n.text(this.language, '联系人', 'Contact'),
        placeholder: I18n.text(this.language, '请输入联系人', 'Enter the contact name'), maxlength: 20,
        radius: DesignTokens.RADIUS_FIELD });
      IBestField({ value: $contactPhone, label: I18n.text(this.language, '联系手机', 'Contact phone'),
        placeholder: I18n.text(this.language, '例：13912345678', 'Example: 13912345678'), type: 'phone', maxlength: 20,
        radius: DesignTokens.RADIUS_FIELD });
      IBestField({ value: $email, label: I18n.text(this.language, '邮箱', 'Email'),
        placeholder: 'contact@example.com', type: 'email', maxlength: 60, hasBorder: false,
        radius: DesignTokens.RADIUS_FIELD });
    }.width('100%').padding(6).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private categorySection() {
    Column({ space: 10 }) {
      Text(I18n.text(this.language, '经营品类', 'Operating categories')).fontSize(15).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).width('100%');
      Row({ space: 10 }) {
        Column({ space: 4 }) {
          Text(this.categorySummary()).fontSize(13).fontColor(DesignTokens.text(this.darkMode)).maxLines(2).width('100%');
          Text(I18n.text(this.language, `已选择 ${this.categories.length} 项`, `${this.categories.length} selected`))
            .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        MerchantIcon({ name: 'arrow', color: DesignTokens.muted(this.darkMode), iconSize: 17 });
      }.width('100%').constraintSize({ minHeight: 58 }).padding({ left: 14, right: 14, top: 10, bottom: 10 })
        .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(DesignTokens.RADIUS_FIELD)
        .onClick(() => this.openCategorySheet());
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private locationSection() {
    Column({ space: 8 }) {
      Row() {
        Text(I18n.text(this.language, '店铺地址', 'Store location')).fontSize(15).fontWeight(FontWeight.Bold)
          .fontColor(DesignTokens.text(this.darkMode));
        Blank();
        Row({ space: 4 }) {
          MerchantIcon({ name: 'location-o', color: DesignTokens.brand(this.darkMode), iconSize: 15 });
          Text(I18n.text(this.language, '地图选址', 'Choose on map')).fontSize(12).fontColor(DesignTokens.brand(this.darkMode));
        }.height(38).padding({ left: 10, right: 10 }).borderRadius(DesignTokens.RADIUS_CONTROL)
          .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).onClick(() => AppRouter.push('LocationPicker'));
      }.width('100%').padding({ left: 10, top: 4 });
      IBestField({ value: $region, label: I18n.text(this.language, '所在地区', 'Region'),
        placeholder: I18n.text(this.language, '例：陕西省西安市', 'Example: Xi’an, Shaanxi'),
        radius: DesignTokens.RADIUS_FIELD });
      IBestField({ value: $address, label: I18n.text(this.language, '详细地址', 'Detailed address'),
        placeholder: I18n.text(this.language, '请输入详细地址', 'Enter the detailed address'), maxlength: 100,
        hasBorder: false, radius: DesignTokens.RADIUS_FIELD });
      if (this.hasLocation) {
        Text(`${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`).fontSize(10)
          .fontColor(DesignTokens.muted(this.darkMode)).padding({ left: 10, right: 10, bottom: 6 }).width('100%');
      }
    }.width('100%').padding(6).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private descriptionSection() {
    Column({ space: 8 }) {
      Text(I18n.text(this.language, '店铺介绍', 'Store description')).fontSize(15).fontWeight(FontWeight.Bold)
        .fontColor(DesignTokens.text(this.darkMode)).width('100%');
      TextArea({ text: this.description,
        placeholder: I18n.text(this.language, '一句话介绍你的店铺，让客户更了解你', 'Briefly introduce your store to customers') })
        .height(112).padding(13).fontColor(DesignTokens.text(this.darkMode))
        .placeholderColor(DesignTokens.muted(this.darkMode)).backgroundColor(DesignTokens.subtle(this.darkMode))
        .borderRadius(DesignTokens.RADIUS_FIELD).maxLength(160)
        .onChange((value: string): void => { this.description = value; });
      Text(`${this.description.length} / 160`).fontSize(11).fontColor(DesignTokens.muted(this.darkMode))
        .width('100%').textAlign(TextAlign.End);
    }.width('100%').padding(16).backgroundColor(DesignTokens.card(this.darkMode))
      .borderRadius(DesignTokens.RADIUS_LARGE).border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private formContent() {
    if (this.windowWidth >= 600) {
      Row({ space: 14 }) {
        Column({ space: 14 }) { this.identitySection(); this.categorySection(); this.locationSection(); }
          .width('42%');
        Column({ space: 14 }) { this.contactSection(); this.descriptionSection(); }
          .layoutWeight(1);
      }.width('100%').alignItems(VerticalAlign.Top);
    } else {
      Column({ space: 12 }) {
        this.identitySection();
        this.contactSection();
        this.categorySection();
        this.locationSection();
        this.descriptionSection();
      }.width('100%');
    }
  }

  @Builder
  private saveBar() {
    Row() {
      IBestButton({
        text: this.hasChanges() ? I18n.text(this.language, '保存修改', 'Save changes')
          : I18n.text(this.language, '未做修改', 'No changes'),
        type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
        btnWidth: this.windowWidth >= 600 ? 320 : '100%', btnHeight: 50,
        btnBorderRadius: DesignTokens.RADIUS_FIELD,
        disabled: !this.hasChanges() || this.saving || this.uploading, loading: this.saving,
        onBtnClick: () => this.save()
      });
    }.width('100%').justifyContent(FlexAlign.Center).padding({ left: 16, right: 16, top: 10, bottom: this.safeBottom + 10 })
      .backgroundColor(DesignTokens.surface(this.darkMode)).border({ width: { top: 0.5 }, color: DesignTokens.border(this.darkMode) });
  }

  @Builder
  private categorySheet() {
    Column({ space: 12 }) {
      Row() {
        Column({ space: 3 }) {
          Text(I18n.text(this.language, '选择经营品类', 'Select operating categories')).fontSize(20)
            .fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode));
          Text(I18n.text(this.language, `已选择 ${this.categoryDraft.length} 项`, `${this.categoryDraft.length} selected`))
            .fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.layoutWeight(1).alignItems(HorizontalAlign.Start);
        Column() { MerchantIcon({ name: 'cross', color: DesignTokens.muted(this.darkMode), iconSize: 18 }); }
          .width(38).height(38).justifyContent(FlexAlign.Center).borderRadius(19)
          .backgroundColor(DesignTokens.subtle(this.darkMode)).onClick(() => this.closeCategorySheet());
      }.width('100%');
      TextInput({ text: this.categoryKeyword,
        placeholder: I18n.text(this.language, '搜索品类', 'Search categories') })
        .height(46).padding({ left: 14, right: 14 }).fontSize(14).fontColor(DesignTokens.text(this.darkMode))
        .placeholderColor(DesignTokens.muted(this.darkMode)).caretColor(DesignTokens.brand(this.darkMode))
        .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(DesignTokens.RADIUS_FIELD)
        .onChange((value: string): void => { this.categoryKeyword = value; });
      List({ space: 6 }) {
        ForEach(this.visibleCategoryOptions(), (item: string) => {
          ListItem() {
            Row({ space: 12 }) {
              Column() {
                if (this.categoryDraft.includes(item)) {
                  MerchantIcon({ name: 'success', color: DesignTokens.onBrand(this.darkMode), iconSize: 15 });
                }
              }.width(24).height(24).justifyContent(FlexAlign.Center).borderRadius(8)
                .backgroundColor(this.categoryDraft.includes(item) ? DesignTokens.brand(this.darkMode)
                  : DesignTokens.subtle(this.darkMode))
                .border({ width: this.categoryDraft.includes(item) ? 0 : 1, color: DesignTokens.border(this.darkMode) });
              Text(this.categoryLabel(item)).fontSize(14).fontColor(DesignTokens.text(this.darkMode)).layoutWeight(1);
            }.width('100%').height(48).padding({ left: 12, right: 12 })
              .backgroundColor(this.categoryDraft.includes(item) ? DesignTokens.selectedSurface(this.darkMode)
                : DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_CONTROL)
              .onClick(() => this.toggleDraftCategory(item));
          }
        }, (item: string) => item);
      }.layoutWeight(1).width('100%').scrollBar(BarState.Off);
      Row({ space: 10 }) {
        IBestButton({ text: I18n.text(this.language, '重置', 'Reset'), plain: true,
          color: DesignTokens.muted(this.darkMode), btnWidth: '32%', btnHeight: 48,
          btnBorderRadius: DesignTokens.RADIUS_FIELD, onBtnClick: () => { this.categoryDraft = []; } });
        IBestButton({ text: I18n.text(this.language, '确认选择', 'Confirm'), type: 'primary',
          color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
          btnWidth: '66%', btnHeight: 48, btnBorderRadius: DesignTokens.RADIUS_FIELD,
          onBtnClick: () => this.confirmCategories() });
      }.width('100%');
    }.width('100%').height(this.windowWidth >= 600 ? 560 : 520)
      .padding({ left: 20, right: 20, top: 20, bottom: this.safeBottom + 18 })
      .backgroundColor(DesignTokens.elevatedSurface(this.darkMode))
      .borderRadius({ topLeft: DesignTokens.RADIUS_XL, topRight: DesignTokens.RADIUS_XL })
      .border({ width: 0.5, color: DesignTokens.border(this.darkMode) });
  }

  build() {
    NavDestination() {
      Stack({ alignContent: Alignment.Bottom }) {
        Column() {
          IBestNavBar({
            title: I18n.text(this.language, '个人与店铺资料', 'Profile and store'), isShowStatusBar: true,
            navBarBgColor: DesignTokens.surface(this.darkMode), titleColor: DesignTokens.text(this.darkMode),
            leftIconColor: DesignTokens.text(this.darkMode), onLeftClick: () => AppRouter.back()
          });
          if (this.loading) {
            Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
              .layoutWeight(1).justifyContent(FlexAlign.Center);
          } else if (this.loadError) {
            Column({ space: 12 }) {
              MerchantIcon({ name: 'replay', color: DesignTokens.brand(this.darkMode), iconSize: 30 });
              Text(I18n.text(this.language, '资料暂时无法加载', 'Profile is temporarily unavailable'))
                .fontSize(15).fontWeight(FontWeight.Medium).fontColor(DesignTokens.text(this.darkMode));
              IBestButton({ text: I18n.text(this.language, '重新加载', 'Try again'), type: 'primary',
                color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                btnBorderRadius: DesignTokens.RADIUS_FIELD, onBtnClick: () => this.load() });
            }.layoutWeight(1).justifyContent(FlexAlign.Center);
          } else {
            Scroll() {
              Column() { this.formContent(); }.width('100%').constraintSize({ maxWidth: 980 })
                .padding({ left: this.windowWidth >= 720 ? 24 : 16, right: this.windowWidth >= 720 ? 24 : 16,
                  top: 12, bottom: 16 });
            }.layoutWeight(1).align(Alignment.Top).scrollBar(BarState.Off).edgeEffect(EdgeEffect.Spring);
            this.saveBar();
          }
        }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
        if (this.categorySheetVisible) {
          Column().width('100%').height('100%').backgroundColor('#8A000000')
            .onClick(() => this.closeCategorySheet());
          this.categorySheet();
        }
      }.width('100%').height('100%');
    }.hideTitleBar(true).onBackPressed((): boolean => {
      if (this.categorySheetVisible) {
        this.closeCategorySheet();
        return true;
      }
      AppRouter.back();
      return true;
    });
  }
}
