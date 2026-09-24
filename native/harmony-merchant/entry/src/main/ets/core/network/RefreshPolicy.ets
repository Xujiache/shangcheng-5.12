export type RefreshWork = () => Promise<string>;

/** Coalesces concurrent 401 responses into exactly one refresh-token rotation. */
export class RefreshSingleFlight {
  private task?: Promise<string>;

  run(work: RefreshWork): Promise<string> {
    if (this.task) return this.task;
    this.task = this.execute(work);
    return this.task;
  }

  private async execute(work: RefreshWork): Promise<string> {
    try {
      return await work();
    } finally {
      this.task = undefined;
    }
  }
}

export class RefreshFailurePolicy {
  static clearsSession(code: number): boolean {
    return code === 401 || code === 2001 || code === 2002;
  }
}
