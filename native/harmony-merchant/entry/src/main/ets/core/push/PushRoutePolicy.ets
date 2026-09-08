export interface PushRouteIntent {
  route: string;
  id: string;
  status: string;
  eventId: string;
}

export class PushRoutePolicy {
  static fromRaw(
    routeRaw: Object | undefined,
    idRaw: Object | undefined,
    statusRaw: Object | undefined,
    eventIdRaw?: Object | undefined
  ): PushRouteIntent | null {
    const route = PushRoutePolicy.value(routeRaw);
    const id = PushRoutePolicy.value(idRaw);
    if (!PushRoutePolicy.allowed(route) || !id) return null;
    return {
      route,
      id,
      status: PushRoutePolicy.value(statusRaw),
      eventId: PushRoutePolicy.value(eventIdRaw)
    };
  }

  static allowed(route: string): boolean {
    return route === 'order-detail' || route === 'after-sale-detail' || route === 'chat-detail';
  }

  static value(raw: Object | undefined): string {
    return raw === undefined || raw === null ? '' : String(raw).trim().slice(0, 256);
  }
}
