export class AppRouter {
  private static stack?: NavPathStack;
  private static lastPush: string = '';
  private static lastPushAt: number = 0;

  static attach(stack: NavPathStack): void {
    AppRouter.stack = stack;
  }

  static push(name: string, param?: Object): void {
    if (!AppRouter.stack) return;
    const key = `${name}:${JSON.stringify(param || {})}`;
    const now = Date.now();
    if (key === AppRouter.lastPush && now - AppRouter.lastPushAt < 400) return;
    AppRouter.lastPush = key; AppRouter.lastPushAt = now;
    AppRouter.stack?.pushPathByName(name, param, true);
  }

  static replace(name: string, param?: Object): void {
    AppRouter.stack?.replacePathByName(name, param, true);
  }

  static back(result?: Object): void {
    AppRouter.lastPush = '';
    if (!AppRouter.stack) return;
    if (result) AppRouter.stack.pop(result, true);
    else AppRouter.stack.pop(true);
  }

  static clear(): void {
    AppRouter.lastPush = '';
    AppRouter.stack?.clear(true);
  }
}
