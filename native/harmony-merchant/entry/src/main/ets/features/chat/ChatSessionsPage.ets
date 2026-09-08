import { IBestButton, IBestEmpty, IBestNavBar, IBestSearch, IBestTag, IBestToast } from '@ibestservices/ibest-ui';
import { AppRouter } from '../../core/navigation/AppRouter';
import { FilterRouteParams, IdRouteParams } from '../../core/navigation/RouteParams';
import { ApiError } from '../../core/network/ApiClient';
import { HarmonyRealtime, RealtimeEnvelope } from '../../core/realtime/HarmonyRealtime';
import { DesignTokens } from '../../core/theme/DesignTokens';
import { ChatMessage, ChatSession } from '../business/BusinessModels';
import { BusinessRepository } from '../business/BusinessRepository';
import { I18n } from '../../core/i18n/I18n';

interface ChatListRealtimePayload {
  sessionId: string;
  message?: ChatMessage;
}

@Builder
export function ChatSessionsBuilder(_: string, raw: Object) {
  ChatSessionsPage({ params: raw as FilterRouteParams });
}

@Component
struct ChatSessionsPage {
  params: FilterRouteParams = new FilterRouteParams();
  @StorageProp('safeBottom') private safeBottom: number = 16;
  @StorageLink('language') private language: string = 'zh-CN';
  @StorageLink('darkMode') private darkMode: boolean = false;
  @State private sessions: ChatSession[] = [];
  @State private keyword: string = '';
  @State private unreadOnly: boolean = false;
  @State private loading: boolean = true;
  @State private refreshing: boolean = false;
  @State private errorMessage: string = '';
  private unsubscribe?: () => void;

  aboutToAppear(): void {
    this.unreadOnly = this.params.status === 'unread';
    this.unsubscribe = HarmonyRealtime.shared().subscribe(
      (event: RealtimeEnvelope): void => this.onRealtime(event)
    );
    this.load(false);
  }

  aboutToDisappear(): void {
    this.unsubscribe?.();
    this.unsubscribe = undefined;
  }

  private sortSessions(source: ChatSession[]): ChatSession[] {
    return source.slice().sort((left: ChatSession, right: ChatSession): number =>
      (right.lastMessageAt || '').localeCompare(left.lastMessageAt || ''));
  }

  private onRealtime(event: RealtimeEnvelope): void {
    if (event.event !== 'chat.message') return;
    const payload = (event.data || {}) as ChatListRealtimePayload;
    if (!payload.sessionId || !payload.message) return;
    const index = this.sessions.findIndex((item: ChatSession): boolean => item.id === payload.sessionId);
    if (index < 0) {
      this.load(false);
      return;
    }
    const previous = this.sessions[index];
    const message = payload.message;
    const updated: ChatSession = {
      id: previous.id, userId: previous.userId, userName: previous.userName,
      userAvatar: previous.userAvatar,
      lastMessage: {
        content: message.content, type: message.type, sender: message.sender, createdAt: message.createdAt
      },
      lastMessageAt: message.createdAt,
      unreadCount: message.sender === 'merchant' ? previous.unreadCount : previous.unreadCount + 1,
      status: previous.status, online: previous.online
    };
    const next = this.sessions.slice();
    next[index] = updated;
    this.sessions = this.sortSessions(next);
  }

  private async load(fromRefresh: boolean): Promise<void> {
    if (fromRefresh) this.refreshing = true;
    else if (this.sessions.length === 0) this.loading = true;
    this.errorMessage = '';
    try {
      this.sessions = this.sortSessions(await BusinessRepository.chatSessions());
    } catch (error) {
      this.errorMessage = error instanceof ApiError ? error.message : 'i18n:conversations-load';
      if (fromRefresh) IBestToast.show(I18n.state(this.language, this.errorMessage));
    } finally {
      this.loading = false;
      this.refreshing = false;
    }
  }

  private visible(): ChatSession[] {
    const key = this.keyword.trim().toLowerCase();
    return this.sessions.filter((item: ChatSession): boolean =>
      (!this.unreadOnly || item.unreadCount > 0) &&
      (!key || item.userName.toLowerCase().includes(key) ||
        (item.lastMessage?.content || '').toLowerCase().includes(key)));
  }

  private preview(item: ChatSession): string {
    if (!item.lastMessage) return I18n.text(this.language, '暂无消息', 'No messages');
    if (item.lastMessage.type === 'image') return I18n.text(this.language, '[图片]', '[Image]');
    if (item.lastMessage.type === 'system') {
      return I18n.text(this.language, `[系统] ${item.lastMessage.content}`, `[System] ${item.lastMessage.content}`);
    }
    return item.lastMessage.content || I18n.text(this.language, '[暂不支持的消息]', '[Unsupported message]');
  }

  private timeLabel(value: string): string {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return value.replace('T', ' ').slice(5, 16);
    const now = new Date();
    const sameDay = date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth() &&
      date.getDate() === now.getDate();
    const hh = `${date.getHours()}`.padStart(2, '0');
    const mm = `${date.getMinutes()}`.padStart(2, '0');
    if (sameDay) return `${hh}:${mm}`;
    return `${date.getMonth() + 1}/${date.getDate()} ${hh}:${mm}`;
  }

  private open(item: ChatSession): void {
    this.sessions = this.sessions.map((session: ChatSession): ChatSession => session.id === item.id ? {
      id: session.id, userId: session.userId, userName: session.userName, userAvatar: session.userAvatar,
      lastMessage: session.lastMessage, lastMessageAt: session.lastMessageAt,
      unreadCount: 0, status: session.status, online: session.online
    } : session);
    AppRouter.push('ChatDetail', new IdRouteParams(item.id));
  }

  @Builder
  private sessionRow(item: ChatSession) {
    Row({ space: 11 }) {
      Stack({ alignContent: Alignment.BottomEnd }) {
        if (item.userAvatar) {
          Image(item.userAvatar).width(52).height(52).borderRadius(26).objectFit(ImageFit.Cover);
        } else {
          Column() { Text(item.userName.slice(0, 1)).fontColor(Color.White); }
            .width(52).height(52).borderRadius(26).backgroundColor('#777777')
            .justifyContent(FlexAlign.Center);
        }
        Column().width(11).height(11).borderRadius(6)
          .backgroundColor(item.online ? DesignTokens.success(this.darkMode) : '#999999')
          .border({ width: 2, color: Color.White });
      }.width(54).height(54);
      Column({ space: 6 }) {
        Row() {
          Text(item.userName).fontSize(15).fontWeight(FontWeight.Medium).layoutWeight(1).maxLines(1);
          Text(this.timeLabel(item.lastMessageAt)).fontSize(11).fontColor(DesignTokens.muted(this.darkMode));
        }.width('100%');
        Row({ space: 7 }) {
          Text(this.preview(item)).fontSize(12).fontColor(DesignTokens.muted(this.darkMode))
            .layoutWeight(1).maxLines(1);
          if (item.status === 'closed') IBestTag({ text: I18n.text(this.language, '已关闭', 'Closed'), plain: true });
          if (item.unreadCount > 0) {
            Text(item.unreadCount > 99 ? '99+' : `${item.unreadCount}`).fontSize(10).fontColor(Color.White)
              .textAlign(TextAlign.Center).padding({ left: 6, right: 6, top: 2, bottom: 2 })
              .backgroundColor(DesignTokens.danger(this.darkMode)).borderRadius(10);
          }
        }.width('100%');
      }.layoutWeight(1).alignItems(HorizontalAlign.Start);
    }.width('100%').padding(14).backgroundColor(DesignTokens.card(this.darkMode)).borderRadius(DesignTokens.RADIUS_LARGE)
      .onClick(() => this.open(item));
  }

  build() {
    NavDestination() {
      Column() {
        IBestNavBar({
          title: I18n.text(this.language, '客户消息', 'Customer messages'), isShowStatusBar: true, navBarBgColor: DesignTokens.surface(this.darkMode),
          onLeftClick: () => AppRouter.back()
        });
        IBestSearch({
          value: $keyword, placeholder: I18n.text(this.language, '搜索客户或消息', 'Search customers or messages'), isRound: true,
          outBgColor: DesignTokens.page(this.darkMode), innerBgColor: DesignTokens.card(this.darkMode)
        });
        Row({ space: 8 }) {
          Text(I18n.text(this.language, '全部', 'All')).fontSize(13).padding({ left: 16, right: 16, top: 8, bottom: 8 })
            .backgroundColor(!this.unreadOnly ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
            .fontColor(!this.unreadOnly ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).borderRadius(18)
            .onClick(() => { this.unreadOnly = false; });
          Text(I18n.text(this.language, '未读', 'Unread')).fontSize(13).padding({ left: 16, right: 16, top: 8, bottom: 8 })
            .backgroundColor(this.unreadOnly ? DesignTokens.brand(this.darkMode) : DesignTokens.card(this.darkMode))
            .fontColor(this.unreadOnly ? DesignTokens.onBrand(this.darkMode) : DesignTokens.muted(this.darkMode)).borderRadius(18)
            .onClick(() => { this.unreadOnly = true; });
        }.width('100%').padding({ left: 16, right: 16, bottom: 10 });
        if (this.loading) {
          Column() { LoadingProgress().width(34).height(34).color(DesignTokens.brand(this.darkMode)); }
            .layoutWeight(1).justifyContent(FlexAlign.Center);
        } else if (this.errorMessage && this.sessions.length === 0) {
          Column({ space: 12 }) {
            Text(I18n.state(this.language, this.errorMessage)).fontSize(13).fontColor(DesignTokens.muted(this.darkMode));
            IBestButton({ text: I18n.text(this.language, '重新加载', 'Reload'), type: 'primary', color: DesignTokens.brand(this.darkMode), fontColor: DesignTokens.onBrand(this.darkMode), onBtnClick: () => this.load(false) });
          }.layoutWeight(1).justifyContent(FlexAlign.Center);
        } else {
          Refresh({ refreshing: $$this.refreshing }) {
            if (this.visible().length === 0) {
              Column() { IBestEmpty({ description: this.unreadOnly
                ? I18n.text(this.language, '没有未读消息', 'No unread messages')
                : I18n.text(this.language, '暂无会话', 'No conversations') }); }
                .height('100%').justifyContent(FlexAlign.Center);
            } else {
              List({ space: 9 }) {
                ForEach(this.visible(), (item: ChatSession) => {
                  ListItem() { this.sessionRow(item); }
                }, (item: ChatSession) => item.id);
              }.width('100%').height('100%').padding({ left: 16, right: 16, bottom: this.safeBottom + 16 });
            }
          }.layoutWeight(1).onRefreshing(() => this.load(true));
        }
      }.width('100%').height('100%').backgroundColor(DesignTokens.page(this.darkMode));
    }.hideTitleBar(true);
  }
}
