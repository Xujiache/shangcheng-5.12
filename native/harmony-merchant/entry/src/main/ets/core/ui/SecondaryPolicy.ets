import { SessionStore } from '../storage/SessionStore';
import { ApiError } from '../network/ApiClient';
import { I18n } from '../i18n/I18n';

export class PageReadTicket {
  key: string = '';
  epoch: number = 0;
  owner: string = '';
}

/** Per-page read ownership. Never retries mutations or decides business permissions. */
export class PageReadScope {
  private epochs: Map<string, number> = new Map();
  private alive: boolean = true;
  private serial: number = 0;
  private openedOwner: string = '';
  open(): void { this.alive = true; this.openedOwner = this.owner(); }
  isCurrent(): boolean { return this.alive && this.openedOwner === this.owner(); }
  dispose(): void { this.alive = false; this.epochs.clear(); }
  private owner(): string { return `${SessionStore.shared().user?.id || 'guest'}:${AppStorage.get<number>('sessionEpoch') || 0}`; }
  begin(key: string): PageReadTicket {
    const ticket = new PageReadTicket();
    ticket.key = key; ticket.epoch = ++this.serial; ticket.owner = this.openedOwner;
    this.epochs.set(key, ticket.epoch); return ticket;
  }
  accepts(ticket: PageReadTicket): boolean {
    return this.isCurrent() && ticket.owner === this.owner() && this.epochs.get(ticket.key) === ticket.epoch;
  }
  async read<T>(work: Promise<T>, ticket: PageReadTicket): Promise<T> {
    const result = await work;
    if (!this.accepts(ticket)) throw new Error('discarded-page-read');
    return result;
  }
}

export class SecondaryPolicy {
  static validBusinessDate(value: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parts = value.split('-');
    const year = Number(parts[0]); const month = Number(parts[1]); const day = Number(parts[2]);
    if (year < 1900 || month < 1 || month > 12 || day < 1) return false;
    const days = new Date(year, month, 0).getDate();
    return day <= days;
  }

  static errorKind(error: Object): string {
    if (error instanceof ApiError) {
      if (error.code === 401 || error.code === 403 || error.code === 2001 || error.code === 2003) return 'permission';
      if (error.code === 404 || error.code === 1002) return 'unavailable';
    }
    return 'network';
  }
  static message(error: Object, language: string): string {
    const kind = SecondaryPolicy.errorKind(error);
    if (kind === 'permission') return I18n.text(language, '当前账号无权执行此操作，请重新登录或联系管理员。', 'This account cannot perform this action. Sign in again or contact an administrator.');
    if (kind === 'unavailable') return I18n.text(language, '此功能暂不可用，请稍后重试。', 'This feature is unavailable. Please retry later.');
    return I18n.text(language, '结果尚未确认，请检查网络后核对。', 'The result is not confirmed. Check your connection and verify the result.');
  }
}

export class PageSearch {
  private timer: number = -1;
  schedule(action: () => void): void {
    this.cancel();
    this.timer = setTimeout(() => { this.timer = -1; action(); }, 300);
  }
  cancel(): void { if (this.timer >= 0) clearTimeout(this.timer); this.timer = -1; }
}

/** Route-local back delegation; never stored globally or shared between page instances. */
export class SecondaryBackHandler {
  closeOverlay: () => boolean = () => false;
}
