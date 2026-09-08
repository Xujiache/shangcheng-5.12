import { Want } from '@kit.AbilityKit';
import { PushRouteIntent, PushRoutePolicy } from './PushRoutePolicy';
import { RecentEventIds } from '../model/RecentEventIds';

/**
 * Push Kit 点击参数的唯一入口。
 * 冷启动与热启动都先写入 AppStorage，待会话恢复并完成 ArkUI 首帧后再消费，
 * 避免 EntryAbility 生命周期早于 Navigation 挂载时丢失深链。
 */
export class PushRouteService {
  private static readonly recentEvents: RecentEventIds = new RecentEventIds(64);

  static capture(want: Want): void {
    const intent = PushRoutePolicy.fromRaw(
      want.parameters?.['route'], want.parameters?.['id'], want.parameters?.['status'],
      want.parameters?.['eventId']
    );
    if (!intent) return;
    if (!PushRouteService.recentEvents.accept(intent.eventId)) return;
    AppStorage.setOrCreate<string>('pendingPushRoute', intent.route);
    AppStorage.setOrCreate<string>('pendingPushId', intent.id);
    AppStorage.setOrCreate<string>('pendingPushStatus', intent.status);
    AppStorage.setOrCreate<string>('pendingPushEventId', intent.eventId);
    const epoch = AppStorage.get<number>('pushRouteEpoch') || 0;
    AppStorage.setOrCreate<number>('pushRouteEpoch', epoch + 1);
  }

  static peek(): PushRouteIntent | null {
    return PushRoutePolicy.fromRaw(
      AppStorage.get<string>('pendingPushRoute'),
      AppStorage.get<string>('pendingPushId'),
      AppStorage.get<string>('pendingPushStatus'),
      AppStorage.get<string>('pendingPushEventId')
    );
  }

  static consume(): PushRouteIntent | null {
    const value = PushRouteService.peek();
    if (!value) return null;
    AppStorage.setOrCreate<string>('pendingPushRoute', '');
    AppStorage.setOrCreate<string>('pendingPushId', '');
    AppStorage.setOrCreate<string>('pendingPushStatus', '');
    AppStorage.setOrCreate<string>('pendingPushEventId', '');
    return value;
  }
}
