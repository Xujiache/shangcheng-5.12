import { IBestButton, IBestNavBar } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { ApiError } from '../../core/network/ApiClient';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { AgreementRouteParams, LegalAgreementSet } from './LegalModels';
import { LegalRepository } from './LegalRepository';
import { I18n } from '../../core/i18n/I18n';
import { MerchantIcon } from '../../core/theme/MerchantIcon';

@Builder
export function AgreementsBuilder(_: string, raw: Object) {
  AgreementsPage({ params: raw as AgreementRouteParams });
}

@Component
struct AgreementsPage {
  params: AgreementRouteParams = new AgreementRouteParams('user');
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') @Watch('onLanguageChanged') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private title: string = '';
  @State private updatedAt: string = '';
  @State private body: string = '';
  @State private errorMessage: string = '';
  @State private loading: boolean = true;
  private requestEpoch: number = 0;

  aboutToAppear(): void {
    this.load();
  }

  private onLanguageChanged(): void {
    this.load();
  }

  private async load(): Promise<void> {
    const epoch = ++this.requestEpoch;
    this.loading = true;
    this.errorMessage = '';
    try {
      const data: LegalAgreementSet = await LegalRepository.agreements();
      if (epoch !== this.requestEpoch) return;
      const section = this.params.kind === 'privacy' ? data.privacy :
        this.params.kind === 'collect' ? data.collect : data.user;
      this.title = section.title;
      this.updatedAt = section.updatedAt;
      this.body = section.body;
    } catch (error) {
      if (epoch === this.requestEpoch) {
        this.errorMessage = error instanceof ApiError ? error.message : 'i18n:agreement-load';
      }
    } finally {
      if (epoch === this.requestEpoch) this.loading = false;
    }
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: this.title || I18n.text(this.language, '法律协议', 'Legal agreements'),
          isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column({ space: 10 }) {
            Column({ space: 10 }) {
              Column().width('72%').height(16).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(8);
              Column().width('100%').height(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(6);
              Column().width('92%').height(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(6);
              Column().width('96%').height(12).backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(6);
            }.width('86%').padding(20).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(20);
            Text(I18n.text(this.language, '正在加载协议', 'Loading agreement')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
          }.layoutWeight(1).justifyContent(FlexAlign.Center);
        } else if (this.errorMessage) {
          Column({ space: 12 }) {
            MerchantIcon({ name: 'replay', color: DesignTokens.brand(this.darkMode), iconSize: 30 });
            Text(I18n.state(this.language, this.errorMessage)).fontSize(14).fontColor(DesignTokens.muted(this.darkMode));
            IBestButton({ text: I18n.text(this.language, '重新加载', 'Reload'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.load() });
          }.layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll() {
            Column({ space: 16 }) {
              Row({ space: 10 }) {
                Column() { MerchantIcon({ name: 'description-o', color: DesignTokens.brand(this.darkMode), iconSize: 22 }); }
                  .width(42).height(42).justifyContent(FlexAlign.Center)
                  .backgroundColor(DesignTokens.selectedSurface(this.darkMode)).borderRadius(14);
                Column({ space: 3 }) {
                  Text(this.title).fontSize(18).fontWeight(FontWeight.Bold)
                    .fontColor(DesignTokens.text(this.darkMode)).width('100%').maxLines(3)
                    .wordBreak(WordBreak.BREAK_ALL);
                  if (this.updatedAt) {
                    Text(I18n.text(this.language, `更新日期：${this.updatedAt}`, `Updated: ${this.updatedAt}`))
                      .fontSize(11).fontColor(DesignTokens.muted(this.darkMode)).width('100%');
                  }
                }.layoutWeight(1).alignItems(HorizontalAlign.Start);
              }.width('100%');
              Text(this.body)
                .fontSize(15)
                .fontColor(DesignTokens.text(this.darkMode))
                .lineHeight(26)
                .width('100%')
                .wordBreak(WordBreak.BREAK_ALL);
            }
            .width('calc(100% - 28vp)')
            .constraintSize({ maxWidth: 760 })
            .padding({ left: 20, right: 20, top: 18, bottom: this.safeBottom + 24 })
            .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
            .margin({ left: 14, right: 14, top: 14, bottom: this.safeBottom + 18 });
          }
          .layoutWeight(1)
          .align(Alignment.Top)
          .scrollBar(BarState.Off);
        }
      }
      .width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
