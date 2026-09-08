export class AppRouter {
  private static stack?: NavPathStack;

  static attach(stack: NavPathStack): void {
    AppRouter.stack = stack;
  }

  static push(name: string, param?: Object): void {
    AppRouter.stack?.pushPathByName(name, param, true);
  }

  static replace(name: string, param?: Object): void {
    AppRouter.stack?.replacePathByName(name, param, true);
  }

  static back(result?: Object): void {
    if (!AppRouter.stack) return;
    if (result) AppRouter.stack.pop(result, true);
    else AppRouter.stack.pop(true);
  }

  static clear(): void {
    AppRouter.stack?.clear(true);
  }
}

