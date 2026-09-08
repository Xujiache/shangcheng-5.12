import { util } from '@kit.ArkTS';
import { common } from '@kit.AbilityKit';
import { IBestButton, IBestImagePreview, IBestNavBar, IBestToast } from '@ibestservices/ibest-ui';
import { FileUploadService } from '../../core/file/FileUploadService';
import { AppRouter } from '../../core/navigation/AppRouter';
import { IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { HarmonyRealtime, RealtimeEnvelope } from '../../core/realtime/HarmonyRealtime';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { MerchantIcon } from '../../core/theme/MerchantIcon';
import { BusinessRepository } from '../business/BusinessRepository';
import { ChatMessage, ChatSession, QuickReply, SendMessageRequest } from '../business/BusinessModels';
import { I18n } from '../../core/i18n/I18n';
import { ChatMessagePolicy } from './ChatMessagePolicy';

interface ChatRealtimePayload {
  sessionId: string;
  message?: ChatMessage;
  fromRole?: string;
  byRole?: string;
  on?: boolean;
}

@Builder
export function ChatDetailBuilder(_: string, raw: Object) {
  ChatDetailPage({ params: raw as IdRouteParams });
}

@Component
struct ChatDetailPage {
  params: IdRouteParams = new IdRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private session: ChatSession | null = null;
  @State private messages: ChatMessage[] = [];
  @State private replies: QuickReply[] = [];
  @State private text: string = '';
  @State private draftType: string = 'text';
  @State private loading: boolean = true;
  @State private sending: boolean = false;
  @State private uploading: boolean = false;
  @State private panel: string = '';
  @State private userTyping: boolean = false;
  @State private loadingEarlier: boolean = false;
  @State private hasEarlier: boolean = true;
  @State private errorMessage: string = '';
  private scroller: Scroller = new Scroller();
  private unsubscribe?: () => void;
  private typingTimer: number = -1;

  aboutToAppear(): void {
    AppStorage.setOrCreate<string>('activeChatSessionId', this.params.id);
    this.unsubscribe = HarmonyRealtime.shared().subscribe(
      (event: RealtimeEnvelope): void => this.onRealtime(event)
    );
    HarmonyRealtime.shared().joinChat(this.params.id);
    this.load();
  }

  aboutToDisappear(): void {
    if ((AppStorage.get<string>('activeChatSessionId') || '') === this.params.id) {
      AppStorage.setOrCreate<string>('activeChatSessionId', '');
    }
    HarmonyRealtime.shared().setTyping(this.params.id, false);
    HarmonyRealtime.shared().leaveChat(this.params.id);
    this.unsubscribe?.();
    this.unsubscribe = undefined;
    if (this.typingTimer >= 0) clearTimeout(this.typingTimer);
  }

  private onRealtime(event: RealtimeEnvelope): void {
    const payload = (event.data || {}) as ChatRealtimePayload;
    if (payload.sessionId !== this.params.id) return;
    if (event.event === 'chat.typing' && payload.fromRole !== 'merchant') {
      this.userTyping = !!payload.on;
      return;
    }
    if (event.event === 'chat.read' && payload.byRole === 'user') {
      this.messages = ChatMessagePolicy.markMerchantRead(this.messages);
      return;
    }
    if (event.event !== 'chat.message' || !payload.message) return;
    const reconciled = ChatMessagePolicy.reconcileRealtime(this.messages, payload.message);
    if (reconciled === this.messages) return;
    this.messages = reconciled;
    if (payload.message.sender !== 'merchant') {
      HarmonyRealtime.shared().markChatRead(this.params.id);
    }
    this.scrollBottom();
  }

  private async load(): Promise<void> {
    this.errorMessage = '';
    let criticalFailure: string = '';
    try {
      this.session = await BusinessRepository.chatSession(this.params.id);
    } catch (error) {
      criticalFailure = error instanceof ApiError ? error.message : 'i18n:conversation-detail-load';
    }
    try {
      this.messages = await BusinessRepository.chatMessages(this.params.id);
      this.hasEarlier = this.messages.length >= 30;
    } catch (error) {
      if (!criticalFailure) {
        criticalFailure = error instanceof ApiError ? error.message : 'i18n:message-history-load';
      }
    }
    try {
      this.replies = await BusinessRepository.quickReplies();
    } catch (_) {
      this.replies = [];
    }
    if (!criticalFailure) {
      try {
        await BusinessRepository.markRead(this.params.id);
      } catch (_) {}
      HarmonyRealtime.shared().markChatRead(this.params.id);
      this.scrollBottom(120);
    } else {
      this.errorMessage = criticalFailure;
      IBestToast.show(I18n.state(this.language, criticalFailure));
    }
    this.loading = false;
  }

  private localMessage(type: string, content: string): ChatMessage {
    return {
      id: `local-${util.generateRandomUUID(true)}`,
      sessionId: this.params.id,
      sender: 'merchant',
      type,
      content,
      createdAt: new Date().toISOString(),
      read: false,
      sendState: 'sending'
    };
  }

  private async send(type: string, content: string, retryId: string = ''): Promise<void> {
    const normalized = content.trim();
    if (!normalized || this.sending) return;
    if (this.session?.status === 'closed') {
      IBestToast.show(I18n.text(this.language, '会话已关闭，暂时无法发送消息', 'This conversation is closed and cannot receive new messages'));
      return;
    }
    this.sending = true;
    const optimistic = retryId
      ? this.messages.find((item: ChatMessage): boolean => item.id === retryId) || this.localMessage(type, normalized)
      : this.localMessage(type, normalized);
    optimistic.sendState = 'sending';
    if (retryId) {
      this.messages = this.messages.map((item: ChatMessage): ChatMessage => item.id === retryId ? optimistic : item);
    } else {
      this.messages = this.messages.concat([optimistic]);
      if (type === 'text' || type === 'quick') {
        this.text = '';
        this.draftType = 'text';
      }
      this.panel = '';
    }
    this.scrollBottom();
    const body: SendMessageRequest = { type, content: normalized };
    try {
      const serverMessage = await BusinessRepository.sendMessage(this.params.id, body);
      this.messages = ChatMessagePolicy.confirmHttp(this.messages, optimistic.id, serverMessage);
      this.scrollBottom();
    } catch (error) {
      this.messages = ChatMessagePolicy.markFailed(this.messages, optimistic.id);
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '发送失败，点击红色提示重试', 'Send failed. Tap the red status to retry.'));
    } finally {
      this.sending = false;
    }
  }

  private async sendImage(): Promise<void> {
    if (this.uploading || this.sending) return;
    this.uploading = true;
    try {
      const urls = await FileUploadService.chooseAndUploadImages(1, 'chat');
      if (urls.length > 0) await this.send('image', urls[0]);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message : I18n.text(this.language, '图片发送失败', 'Failed to send image'));
    } finally {
      this.uploading = false;
    }
  }

  private async takePhoto(): Promise<void> {
    if (this.uploading || this.sending) return;
    this.uploading = true;
    try {
      const context = this.getUIContext().getHostContext() as common.UIAbilityContext;
      const url = await FileUploadService.captureAndUploadImage(context, 'chat');
      if (url) await this.send('image', url);
    } catch (error) {
      IBestToast.show(error instanceof Error ? error.message
        : I18n.text(this.language, '拍照发送失败', 'Failed to capture and send photo'));
    } finally {
      this.uploading = false;
    }
  }

  private async loadEarlier(): Promise<void> {
    if (this.messages.length === 0 || this.loadingEarlier || !this.hasEarlier) return;
    const firstServer = this.messages.find((item: ChatMessage): boolean => !item.id.startsWith('local-'));
    if (!firstServer) return;
    this.loadingEarlier = true;
    try {
      const older = await BusinessRepository.chatMessages(this.params.id, firstServer.id);
      if (older.length > 0) {
        this.messages = ChatMessagePolicy.prependEarlier(this.messages, older);
        if (older.length < 30) this.hasEarlier = false;
      } else {
        this.hasEarlier = false;
        IBestToast.show(I18n.text(this.language, '没有更早消息了', 'No earlier messages'));
      }
    } catch (error) {
      IBestToast.show(error instanceof ApiError ? error.message
        : I18n.text(this.language, '历史消息加载失败', 'Failed to load message history'));
    } finally {
      this.loadingEarlier = false;
    }
  }

  private onTextChanged(value: string): void {
    this.text = value;
    this.draftType = 'text';
    HarmonyRealtime.shared().setTyping(this.params.id, !!value.trim());
    if (this.typingTimer >= 0) clearTimeout(this.typingTimer);
    this.typingTimer = setTimeout((): void => {
      HarmonyRealtime.shared().setTyping(this.params.id, false);
      this.typingTimer = -1;
    }, 1800);
  }

  private previewImage(url: string): void {
    IBestImagePreview.show([url], { closeOnClickImage: false, closeOnClickOverlay: true });
  }

  private scrollBottom(delay: number = 70): void {
    setTimeout((): void => this.scroller.scrollEdge(Edge.Bottom), delay);
  }

  @Builder
  private messageContent(item: ChatMessage) {
    if (item.type === 'image') {
      Image(item.content).width(150).height(150).objectFit(ImageFit.Cover).borderRadius(10)
        .onClick(() => this.previewImage(item.content));
    } else {
      Text(item.content).fontSize(15)
        .fontColor(item.sender === 'merchant' ? DesignTokens.onBrand(this.darkMode) : DesignTokens.text(this.darkMode)).lineHeight(22);
    }
  }

  @Builder
  private bubble(item: ChatMessage) {
    if (item.sender === 'system') {
      Text(item.content).fontSize(11).fontColor(DesignTokens.muted(this.darkMode))
        .padding({ left: 10, right: 10, top: 5, bottom: 5 })
        .backgroundColor(DesignTokens.subtle(this.darkMode)).borderRadius(10).margin({ top: 6, bottom: 6 });
    } else {
      Row({ space: 8 }) {
        if (item.sender !== 'merchant') {
          if (this.session?.userAvatar) {
            Image(this.session.userAvatar).width(38).height(38).borderRadius(8).objectFit(ImageFit.Cover);
          } else {
            Column().width(38).height(38).backgroundColor('#777777').borderRadius(8);
          }
        }
        Column({ space: 3 }) {
          Column() { this.messageContent(item); }
            .padding(item.type === 'image' ? 0 : 11)
            .backgroundColor(item.type === 'image' ? Color.Transparent :
              item.sender === 'merchant' ? DesignTokens.brand(this.darkMode) : Color.White)
            .borderRadius(12);
          if (item.sender === 'merchant') {
            Text(item.sendState === 'sending'
              ? I18n.text(this.language, '发送中…', 'Sending…')
              : item.sendState === 'failed'
                ? I18n.text(this.language, '发送失败，点击重试', 'Send failed. Tap to retry.')
                : item.read ? I18n.text(this.language, '已读', 'Read') : I18n.text(this.language, '未读', 'Unread'))
              .fontSize(10).fontColor(item.sendState === 'failed' ? DesignTokens.danger(this.darkMode) : DesignTokens.muted(this.darkMode))
              .textAlign(TextAlign.End).width('100%')
              .onClick(() => { if (item.sendState === 'failed') this.send(item.type, item.content, item.id); });
          }
        }.alignItems(item.sender === 'merchant' ? HorizontalAlign.End : HorizontalAlign.Start);
        if (item.sender === 'merchant') {
          Column() { Text(I18n.text(this.language, '商', 'M')).fontSize(13).fontColor(DesignTokens.onBrand(this.darkMode)); }
            .width(38).height(38).backgroundColor(DesignTokens.brand(this.darkMode)).borderRadius(8)
            .justifyContent(FlexAlign.Center);
        }
      }.width('100%').justifyContent(item.sender === 'merchant' ? FlexAlign.End : FlexAlign.Start)
        .alignItems(VerticalAlign.Top).margin({ top: 5, bottom: 5 });
    }
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: this.session?.userName || I18n.text(this.language, '在线客服', 'Customer service'), isShowRight: true,
          rightLabel: this.userTyping
            ? I18n.text(this.language, '正在输入…', 'Typing…')
            : this.session?.online ? I18n.text(this.language, '在线', 'Online') : I18n.text(this.language, '离线', 'Offline'),
          isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode), onLeftClick: () => AppRouter.back()
        });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else if (this.errorMessage) {
          Column({ space: 12 }) {
            Text(I18n.state(this.language, this.errorMessage)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            IBestButton({ text: I18n.text(this.language, '重新加载', 'Reload'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => {
              this.loading = true;
              this.load();
            } });
          }.layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Scroll(this.scroller) {
            Column() {
              Text(this.loadingEarlier
                ? I18n.text(this.language, '正在加载…', 'Loading…')
                : this.hasEarlier
                  ? I18n.text(this.language, '加载更早消息', 'Load earlier messages')
                  : I18n.text(this.language, '没有更早消息了', 'No earlier messages'))
                .fontSize(12).fontColor(this.hasEarlier ? DesignTokens.brand(this.darkMode) : DesignTokens.muted(this.darkMode)).padding(12)
                .onClick(() => this.loadEarlier());
              ForEach(this.messages, (item: ChatMessage) => { this.bubble(item); }, (item: ChatMessage) => item.id);
            }.width('100%').padding({ left: 14, right: 14, bottom: 10 });
          }.layoutWeight(1).scrollBar(BarState.Off).backgroundColor(DesignTokens.subtle(this.darkMode))
            .onClick(() => { this.panel = ''; });
          if (this.panel === 'quick') {
            Scroll() {
              Column() {
                ForEach(this.replies, (item: QuickReply) => {
                  Text(item.label).fontSize(14).width('100%').padding(12)
                    .backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(8).margin({ bottom: 6 })
                    .onClick(() => { this.text = item.content; this.draftType = 'quick'; this.panel = ''; });
                }, (item: QuickReply) => item.id);
              }.padding(10);
            }.height(180).backgroundColor(DesignTokens.subtle(this.darkMode));
          }
          if (this.panel === 'attachment') {
            Row({ space: 8 }) {
              Column({ space: 7 }) {
                Column() { MerchantIcon({ name: 'photo-o', color: DesignTokens.brand(this.darkMode), iconSize: 24 }); }
                  .width(54).height(54).justifyContent(FlexAlign.Center).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(12);
                Text(this.uploading
                  ? I18n.text(this.language, '上传中…', 'Uploading…')
                  : I18n.text(this.language, '图片', 'Image')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
              }.width(84).opacity(this.uploading || this.sending ? 0.5 : 1).onClick(() => this.sendImage());
              Column({ space: 7 }) {
                Column() { MerchantIcon({ name: 'photograph', color: DesignTokens.brand(this.darkMode), iconSize: 24 }); }
                  .width(54).height(54).justifyContent(FlexAlign.Center).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(12);
                Text(this.uploading
                  ? I18n.text(this.language, '上传中…', 'Uploading…')
                  : I18n.text(this.language, '拍照', 'Camera')).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
              }.width(84).opacity(this.uploading || this.sending ? 0.5 : 1).onClick(() => this.takePhoto());
            }.width('100%').height(150).padding(16).backgroundColor(DesignTokens.subtle(this.darkMode));
          }
          if (this.session?.status === 'closed') {
            Row() {
              Text(I18n.text(this.language, '会话已关闭，暂时无法继续回复', 'This conversation is closed and cannot receive replies')).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            }.width('100%').justifyContent(FlexAlign.Center)
              .padding({ top: 18, bottom: this.safeBottom + 18 }).backgroundColor(DesignTokens.subtle(this.darkMode));
          } else {
            Row({ space: 9 }) {
              Column() { MerchantIcon({ name: 'records-o', color: DesignTokens.muted(this.darkMode), iconSize: 25 }); }
                .width(44).height(44).justifyContent(FlexAlign.Center)
                .onClick(() => { this.panel = this.panel === 'quick' ? '' : 'quick'; });
              TextArea({ text: this.text, placeholder: I18n.text(this.language, '输入消息…', 'Message…') }).layoutWeight(1).height(48)
                .padding({ left: 12, right: 12, top: 8, bottom: 8 }).backgroundColor(DesignTokens.card(this.darkMode))
                .borderRadius(12).maxLength(1000).onChange((value: string) => this.onTextChanged(value));
              if (this.text.trim()) {
                IBestButton({
                  text: I18n.text(this.language, '发送', 'Send'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), loading: this.sending,
                  disabled: this.sending || this.uploading,
                  onBtnClick: () => this.send(this.draftType, this.text)
                });
              } else {
                Column() { MerchantIcon({ name: 'add-o', color: DesignTokens.muted(this.darkMode), iconSize: 27 }); }
                  .width(44).height(44).justifyContent(FlexAlign.Center)
                  .onClick(() => { this.panel = this.panel === 'attachment' ? '' : 'attachment'; });
              }
            }.width('100%').padding({ left: 8, right: 8, top: 8, bottom: this.safeBottom + 8 })
              .backgroundColor(DesignTokens.subtle(this.darkMode));
          }
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
