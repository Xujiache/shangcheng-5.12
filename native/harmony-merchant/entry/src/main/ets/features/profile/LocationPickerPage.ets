import { abilityAccessCtrl, common, Permissions } from '@kit.AbilityKit';
import { BusinessError } from '@kit.BasicServicesKit';
import { geoLocationManager } from '@kit.LocationKit';
import { MapComponent, map, mapCommon, site } from '@kit.MapKit';
import { IBestButton, IBestNavBar, IBestSearch, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { I18n } from '../../core/i18n/I18n';
import { LocationPolicy } from './LocationPolicy';

interface PlaceSearchItem {
  id: string;
  name: string;
  address: string;
  region: string;
  latitude: number;
  longitude: number;
}

@Builder
export function LocationPickerBuilder(_: string) { LocationPickerPage(); }

@Component
struct LocationPickerPage {
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private latitude: number = 34.3416;
  @State private longitude: number = 108.9398;
  @State private region: string = '';
  @State private address: string = '';
  @State private locating: boolean = false;
  @State private keyword: string = '';
  @State private searching: boolean = false;
  @State private resolvingAddress: boolean = false;
  @State private searchResults: PlaceSearchItem[] = [];
  @State private mapFailed: boolean = false;
  private skipNextCameraLookup: boolean = false;
  private reverseTimer: number = -1;
  private reverseEpoch: number = 0;
  private searchEpoch: number = 0;
  private controller?: map.MapComponentController;
  private cameraIdleListener = (): void => {
    const controller = this.controller;
    if (!controller) return;
    try {
      const target = controller.getCameraPosition().target;
      if (!LocationPolicy.isValidCoordinate(target.latitude, target.longitude)) return;
      this.latitude = target.latitude;
      this.longitude = target.longitude;
      if (this.skipNextCameraLookup) {
        this.skipNextCameraLookup = false;
        return;
      }
      this.scheduleReverseGeocode();
    } catch (_) {
      // A map callback can race with destination teardown; ignore that stale frame.
    }
  };
  private options: mapCommon.MapOptions = {
    position: { target: { latitude: 34.3416, longitude: 108.9398 }, zoom: 14 }
  };

  private mapCallback = (error: BusinessError, controller: map.MapComponentController): void => {
    if (error) { this.mapFailed = true; return; }
    this.controller = controller;
    controller.on('cameraIdle', this.cameraIdleListener);
  };

  aboutToAppear(): void {
    const savedLatitude = AppStorage.get<number>('pickedLatitude') || 0;
    const savedLongitude = AppStorage.get<number>('pickedLongitude') || 0;
    const hasSavedLocation = AppStorage.get<boolean>('pickedLocationSet') || false;
    if (hasSavedLocation && LocationPolicy.isValidCoordinate(savedLatitude, savedLongitude)) {
      this.latitude = savedLatitude;
      this.longitude = savedLongitude;
      this.options = { position: { target: { latitude: savedLatitude, longitude: savedLongitude }, zoom: 16 } };
    }
  }

  aboutToDisappear(): void {
    try {
      this.controller?.off('cameraIdle', this.cameraIdleListener);
    } catch (_) {
    }
    this.controller = undefined;
    if (this.reverseTimer >= 0) clearTimeout(this.reverseTimer);
    this.reverseTimer = -1;
    this.reverseEpoch += 1;
    this.searchEpoch += 1;
  }

  private scheduleReverseGeocode(): void {
    if (this.reverseTimer >= 0) clearTimeout(this.reverseTimer);
    this.resolvingAddress = true;
    this.reverseTimer = setTimeout((): void => {
      this.reverseTimer = -1;
      this.reverseGeocode();
    }, 280);
  }

  private async locateCurrent(): Promise<void> {
    if (this.locating) return;
    this.locating = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const manager = abilityAccessCtrl.createAtManager();
      const permissions: Permissions[] = ['ohos.permission.LOCATION', 'ohos.permission.APPROXIMATELY_LOCATION'];
      const result = await manager.requestPermissionsFromUser(context, permissions);
      if (result.authResults.every((value: number): boolean => value !== 0)) {
        IBestToast.show(I18n.text(this.language, '需要定位权限才能获取当前位置', 'Location permission is required to get your current position'));
        return;
      }
      const request: geoLocationManager.CurrentLocationRequest = {
        priority: geoLocationManager.LocationRequestPriority.ACCURACY
      };
      const location = await geoLocationManager.getCurrentLocation(request);
      if (!LocationPolicy.isValidCoordinate(location.latitude, location.longitude)) {
        throw new Error(I18n.text(this.language, '系统返回了无效坐标', 'The system returned invalid coordinates'));
      }
      this.latitude = location.latitude;
      this.longitude = location.longitude;
      if (this.controller) {
        this.skipNextCameraLookup = true;
        const position: mapCommon.CameraPosition = {
          target: { latitude: this.latitude, longitude: this.longitude }, zoom: 17
        };
        this.controller.animateCamera(map.newCameraPosition(position), 350);
      }
      await this.reverseGeocode();
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '当前位置获取失败', 'Failed to get current location'));
    } finally { this.locating = false; }
  }

  private async reverseGeocode(): Promise<void> {
    const epoch = ++this.reverseEpoch;
    const requestedLatitude = this.latitude;
    const requestedLongitude = this.longitude;
    this.resolvingAddress = true;
    if (!LocationPolicy.isValidCoordinate(requestedLatitude, requestedLongitude)) {
      this.resolvingAddress = false;
      IBestToast.show(I18n.text(this.language, '当前位置坐标无效', 'The current coordinates are invalid'));
      return;
    }
    try {
      const request: geoLocationManager.ReverseGeoCodeRequest = {
        latitude: requestedLatitude, longitude: requestedLongitude, maxItems: 1,
        locale: this.language === 'en-US' ? 'en' : 'zh'
      };
      const results = await geoLocationManager.getAddressesFromLocation(request);
      if (LocationPolicy.acceptsEpoch(epoch, this.reverseEpoch) && results.length > 0) {
        const item = results[0];
        this.region = LocationPolicy.joinRegion(item.administrativeArea || '', item.locality || '', item.subLocality || '');
        this.address = `${item.roadName || ''}${item.subRoadName || ''}${item.placeName || ''}` || this.region;
      } else if (LocationPolicy.acceptsEpoch(epoch, this.reverseEpoch)) {
        this.region = '';
        this.address = LocationPolicy.coordinateLabel(requestedLatitude, requestedLongitude,
          I18n.text(this.language, '经纬度', 'Coordinates'));
      }
    } catch (_) {
      if (!LocationPolicy.acceptsEpoch(epoch, this.reverseEpoch)) return;
      this.address = LocationPolicy.coordinateLabel(requestedLatitude, requestedLongitude,
        I18n.text(this.language, '经纬度', 'Coordinates'));
    } finally {
      if (LocationPolicy.acceptsEpoch(epoch, this.reverseEpoch)) this.resolvingAddress = false;
    }
  }

  private async searchPlaces(): Promise<void> {
    const query = this.keyword.trim();
    if (!query) return;
    const epoch = ++this.searchEpoch;
    const requestedLatitude = this.latitude;
    const requestedLongitude = this.longitude;
    this.searching = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const params: site.SearchByTextParams = {
        query,
        location: { latitude: requestedLatitude, longitude: requestedLongitude },
        radius: 50000,
        language: this.language === 'en-US' ? 'en' : 'zh',
        pageIndex: 1,
        pageSize: 8
      };
      const result = await site.searchByText(context, params);
      const values: PlaceSearchItem[] = [];
      (result.sites || []).forEach((item: site.Site): void => {
        if (!item.location) return;
        if (!LocationPolicy.isValidCoordinate(item.location.latitude, item.location.longitude)) return;
        const component = item.addressComponent;
        const region = LocationPolicy.joinRegion(component.adminLevel1 || '', component.locality || component.city?.cityName || '', component.subLocality1 || '');
        const value: PlaceSearchItem = {
          id: item.siteId,
          name: item.name || query,
          address: item.formatAddress || region,
          region,
          latitude: item.location.latitude,
          longitude: item.location.longitude
        };
        values.push(value);
      });
      if (epoch !== this.searchEpoch) return;
      this.searchResults = values;
      if (values.length === 0) {
        IBestToast.show(I18n.text(this.language, '没有找到匹配地点', 'No matching places found'));
      }
    } catch (error) {
      if (epoch !== this.searchEpoch) return;
      this.searchResults = [];
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '地点搜索失败', 'Place search failed'));
    } finally {
      if (epoch === this.searchEpoch) this.searching = false;
    }
  }

  private selectPlace(item: PlaceSearchItem): void {
    if (!LocationPolicy.isValidCoordinate(item.latitude, item.longitude)) {
      IBestToast.show(I18n.text(this.language, '该地点坐标无效', 'This place has invalid coordinates'));
      return;
    }
    this.reverseEpoch += 1;
    if (this.reverseTimer >= 0) clearTimeout(this.reverseTimer);
    this.reverseTimer = -1;
    this.resolvingAddress = false;
    this.latitude = item.latitude;
    this.longitude = item.longitude;
    this.region = item.region;
    this.address = LocationPolicy.selectedAddress(item.name, item.address);
    this.searchResults = [];
    this.keyword = item.name;
    this.skipNextCameraLookup = true;
    if (this.controller) {
      const position: mapCommon.CameraPosition = {
        target: { latitude: item.latitude, longitude: item.longitude }, zoom: 17
      };
      this.controller.animateCamera(map.newCameraPosition(position), 350);
    }
  }

  private confirm(): void {
    if (this.resolvingAddress) {
      IBestToast.show(I18n.text(this.language, '正在确认地址，请稍候', 'Confirming the address. Please wait.'));
      return;
    }
    if (!LocationPolicy.isValidCoordinate(this.latitude, this.longitude)) {
      IBestToast.show(I18n.text(this.language, '当前位置坐标无效', 'The current coordinates are invalid'));
      return;
    }
    AppStorage.setOrCreate<string>('pickedRegion', this.region);
    AppStorage.setOrCreate<string>('pickedAddress', this.address);
    AppStorage.setOrCreate<number>('pickedLatitude', this.latitude);
    AppStorage.setOrCreate<number>('pickedLongitude', this.longitude);
    AppStorage.setOrCreate<boolean>('pickedLocationSet', true);
    AppStorage.setOrCreate<number>('locationEpoch', (AppStorage.get<number>('locationEpoch') || 0) + 1);
    AppRouter.back();
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '地图选址', 'Choose location'), isShowStatusBar: true,
          navBarBgColor: DesignTokens.surface(this.darkMode), titleColor: DesignTokens.text(this.darkMode),
          leftIconColor: DesignTokens.text(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        Stack({ alignContent: Alignment.Center }) {
          MapComponent({ mapOptions: this.options, mapCallback: this.mapCallback });
          Column({ space: 2 }) {
            Column() { MerchantIcon({ name: 'location-o', color: DesignTokens.onBrand(this.darkMode), iconSize: 22 }); }
              .width(42).height(42).justifyContent(FlexAlign.Center).borderRadius(21)
              .backgroundColor(DesignTokens.brand(this.darkMode))
              .shadow({ color: '#42000000', radius: 12, offsetY: 5 });
            Row().width(3).height(16).backgroundColor(DesignTokens.brand(this.darkMode));
            Row().width(12).height(4).borderRadius(2).backgroundColor('#4A000000');
          }.translate({ y: -44 });

          Column() {
            IBestSearch({
              value: $keyword,
              placeholder: I18n.text(this.language, '搜索店名、商圈或详细地址', 'Search a shop, area or address'),
              isRound: true, radius: DesignTokens.RADIUS_FIELD,
              outBgColor: Color.Transparent, innerBgColor: DesignTokens.card(this.darkMode),
              showRightButton: true,
              rightButtonText: this.searching ? I18n.text(this.language, '搜索中', 'Searching')
                : I18n.text(this.language, '搜索', 'Search'),
              onSearch: () => this.searchPlaces(), onRightButtonClick: () => this.searchPlaces()
            });
            if (this.searchResults.length > 0) {
              Scroll() {
                Column() {
                  ForEach(this.searchResults, (item: PlaceSearchItem) => {
                    Row({ space: 10 }) {
                      Column() { MerchantIcon({ name: 'location-o', color: DesignTokens.brand(this.darkMode), iconSize: 18 }); }
                        .width(34).height(34).justifyContent(FlexAlign.Center).borderRadius(12)
                        .backgroundColor(DesignTokens.selectedSurface(this.darkMode));
                      Column({ space: 3 }) {
                        Text(item.name).fontSize(14).fontWeight(FontWeight.Medium)
                          .fontColor(DesignTokens.text(this.darkMode)).width('100%').maxLines(1);
                        Text(item.address).fontSize(11).fontColor(DesignTokens.muted(this.darkMode))
                          .width('100%').maxLines(2);
                      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
                    }.width('100%').padding({ left: 12, right: 12, top: 9, bottom: 9 })
                      .border({ width: { bottom: 0.5 }, color: DesignTokens.border(this.darkMode) })
                      .onClick(() => this.selectPlace(item));
                  }, (item: PlaceSearchItem) => item.id);
                }.width('100%');
              }.width('100%').constraintSize({ maxHeight: 270 }).scrollBar(BarState.Off)
                .backgroundColor(DesignTokens.card(this.darkMode))
                .borderRadius(DesignTokens.RADIUS_FIELD).shadow({ color: '#28000000', radius: 18, offsetY: 8 });
            }
          }.width('100%').padding({ left: 12, right: 12, top: 10 }).align(Alignment.Top).zIndex(5);

          Column() {
            MerchantIcon({ name: 'aim', color: DesignTokens.brand(this.darkMode), iconSize: 23 });
          }.width(48).height(48).justifyContent(FlexAlign.Center).borderRadius(24)
            .backgroundColor(DesignTokens.card(this.darkMode))
            .border({ width: 0.5, color: DesignTokens.border(this.darkMode) })
            .shadow({ color: '#30000000', radius: 12, offsetY: 5 })
            .position({ right: 14, bottom: this.safeBottom + 190 }).zIndex(4)
            .onClick(() => this.locateCurrent());

          if (this.mapFailed) {
            Column({ space: 8 }) {
              Text(I18n.text(this.language, '地图服务尚未配置', 'Map service is not configured')).fontSize(16).fontWeight(FontWeight.Medium);
              Text(I18n.text(this.language, '仍可使用系统定位与地址解析', 'System location and address lookup remain available')).fontSize(12).fontColor(DesignTokens.muted(this.darkMode));
            }.padding(18).backgroundColor(DesignTokens.elevatedSurface(this.darkMode))
              .borderRadius(DesignTokens.RADIUS_LARGE).zIndex(3);
          }

          Column({ space: 10 }) {
            Row({ space: 8 }) {
              Column() { MerchantIcon({ name: 'location-o', color: DesignTokens.brand(this.darkMode), iconSize: 20 }); }
                .width(38).height(38).justifyContent(FlexAlign.Center).borderRadius(13)
                .backgroundColor(DesignTokens.selectedSurface(this.darkMode));
              Column({ space: 3 }) {
                Text(this.region || I18n.text(this.language, '移动地图选择位置', 'Move the map to choose a location'))
                  .fontSize(15).fontWeight(FontWeight.Bold).fontColor(DesignTokens.text(this.darkMode)).width('100%').maxLines(1);
                Text(this.resolvingAddress ? I18n.text(this.language, '正在解析当前位置…', 'Resolving this location…')
                  : this.address || `${this.latitude.toFixed(6)}, ${this.longitude.toFixed(6)}`)
                  .fontSize(12).fontColor(DesignTokens.muted(this.darkMode)).width('100%').maxLines(2);
              }.layoutWeight(1).alignItems(HorizontalAlign.Start);
            }.width('100%');
            Row({ space: 10 }) {
              IBestButton({ text: I18n.text(this.language, '定位到我', 'My location'), plain: true,
                color: DesignTokens.brand(this.darkMode), btnWidth: '33%', btnHeight: 48,
                btnBorderRadius: DesignTokens.RADIUS_FIELD, loading: this.locating, disabled: this.locating,
                onBtnClick: () => this.locateCurrent() });
              IBestButton({ text: this.resolvingAddress ? I18n.text(this.language, '正在确认', 'Confirming')
                : I18n.text(this.language, '使用此位置', 'Use this location'), type: 'primary',
                color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode),
                btnWidth: '64%', btnHeight: 48, btnBorderRadius: DesignTokens.RADIUS_FIELD,
                loading: this.resolvingAddress, disabled: this.resolvingAddress, onBtnClick: () => this.confirm() });
            }.width('100%');
          }.width('calc(100% - 24vp)').padding({ left: 16, right: 16, top: 14, bottom: this.safeBottom + 12 })
            .backgroundColor(DesignTokens.elevatedSurface(this.darkMode))
            .borderRadius(DesignTokens.RADIUS_XL).border({ width: 0.5, color: DesignTokens.border(this.darkMode) })
            .margin({ bottom: 10 }).align(Alignment.Bottom).zIndex(4)
            .shadow({ color: '#30000000', radius: 20, offsetY: 7 });
        }.width('100%').layoutWeight(1).backgroundColor(DesignTokens.subtle(this.darkMode));
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true).onBackPressed((): boolean => {
      if (this.searchResults.length > 0) {
        this.searchResults = [];
        return true;
      }
      AppRouter.back();
      return true;
    });
  }
}
