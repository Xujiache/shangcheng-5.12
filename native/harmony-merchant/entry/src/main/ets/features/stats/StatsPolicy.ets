import { MerchantAnalytics, AnalyticsTrendPoint, AnalyticsProduct, AnalyticsCategory, StatsSelection, StatsCalendarCell } from './StatsModels';

export class StatsPolicy {
  static today(now: number = Date.now()): string { return new Date(now + 8 * 3600000).toISOString().slice(0, 10); }
  static validDate(value: string): boolean {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '0001-01-01') return false;
    const time = Date.parse(`${value}T00:00:00+08:00`);
    return Number.isFinite(time) && StatsPolicy.today(time) === value;
  }
  static rangeError(start: string, end: string, today: string = StatsPolicy.today()): string {
    if (!StatsPolicy.validDate(start) || !StatsPolicy.validDate(end)) return 'date';
    if (end < start || end > today) return 'range';
    if ((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / 86400000 + 1 > 366) return 'limit';
    return '';
  }
  static resolve(selection: StatsSelection, now: number = Date.now()): StatsSelection {
    if (selection.period === 'custom') return new StatsSelection('custom', selection.startDate, selection.endDate);
    const today = StatsPolicy.today(now);
    let start = today;
    if (selection.period === 'week') {
      const date = new Date(`${today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() - (date.getUTCDay() + 6) % 7);
      start = date.toISOString().slice(0, 10);
    } else if (selection.period === 'month') start = `${today.slice(0, 7)}-01`;
    else if (selection.period === 'year') start = `${today.slice(0, 4)}-01-01`;
    return new StatsSelection(selection.period, start, today);
  }
  static key(selection: StatsSelection): string {
    const range = StatsPolicy.resolve(selection);
    return `${range.period}:${range.startDate}:${range.endDate}`;
  }
  static calendar(month: string, today: string = StatsPolicy.today()): StatsCalendarCell[] {
    const first = new Date(`${month}-01T00:00:00Z`);
    const offset = (first.getUTCDay() + 6) % 7;
    const result: StatsCalendarCell[] = [];
    for (let index = 0; index < 42; index++) {
      const date = new Date(first.getTime() + (index - offset) * 86400000);
      const value = date.toISOString().slice(0, 10);
      result.push({ date: value, day: date.getUTCDate(), inMonth: value.slice(0, 7) === month, disabled: value < '0001-01-01' || value > today });
    }
    return result;
  }
  static money(value: number): string { return Number.isFinite(value) ? `¥${value.toFixed(2)}` : '—'; }
  static percent(value: number, total: number): string { return total > 0 ? `${(100 * value / total).toFixed(1)}%` : '0.0%'; }
  static bucketLabel(iso: string, granularity: string, full: boolean = false): string {
    const date = new Date(Date.parse(iso) + 8 * 3600000).toISOString();
    if (granularity === 'hour') return full ? `${date.slice(0, 10)} ${date.slice(11, 16)}` : date.slice(11, 16);
    if (granularity === 'month') return date.slice(0, 7);
    return full ? date.slice(0, 10) : date.slice(5, 10);
  }
  static verify(data: MerchantAnalytics): MerchantAnalytics {
    if (!data || typeof data !== 'object' || data.version !== 1 || data.timeZone !== 'Asia/Shanghai' ||
      !['today', 'week', 'month', 'year', 'custom'].includes(data.period) || !['hour', 'day', 'month'].includes(data.granularity) ||
      !StatsPolicy.validDate(data.startDate) || !StatsPolicy.validDate(data.endDate) || !Number.isFinite(Date.parse(data.asOf))) throw new Error('stats-contract');
    const amounts: number[] = [data.paidAmount, data.avgOrderValue, data.refundAmount];
    if (amounts.some((value: number) => typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value * 100 > Number.MAX_SAFE_INTEGER)) throw new Error('stats-contract');
    if (![data.paidOrderCount, data.totalQuantity].every((value: number) => Number.isSafeInteger(value) && value >= 0)) throw new Error('stats-contract');
    if (!Array.isArray(data.trend) || !Array.isArray(data.topProducts) || !Array.isArray(data.categories)) throw new Error('stats-contract');
    const trend: AnalyticsTrendPoint[] = Array.isArray(data.trend) ? data.trend.slice() : [];
    const products: AnalyticsProduct[] = Array.isArray(data.topProducts) ? data.topProducts.slice() : [];
    const categories: AnalyticsCategory[] = Array.isArray(data.categories) ? data.categories.slice() : [];
    if (trend.some((p: AnalyticsTrendPoint) => !p || !Number.isFinite(Date.parse(p.bucketStart)) || typeof p.amount !== 'number' || !Number.isFinite(p.amount) || p.amount < 0) ||
      products.some((p: AnalyticsProduct) => !p || typeof p.productId !== 'string' || typeof p.name !== 'string' || !Number.isSafeInteger(p.quantity) || p.quantity < 0) ||
      categories.some((p: AnalyticsCategory) => !p || typeof p.categoryId !== 'string' || typeof p.name !== 'string' || !Number.isSafeInteger(p.quantity) || p.quantity < 0)) throw new Error('stats-contract');
    const total = trend.reduce((sum: number, p: AnalyticsTrendPoint) => sum + Math.round(p.amount * 100), 0);
    const units = categories.reduce((sum: number, p: AnalyticsCategory) => sum + p.quantity, 0);
    if (units !== data.totalQuantity || products.reduce((sum: number, p: AnalyticsProduct) => sum + p.quantity, 0) > data.totalQuantity || total !== Math.round(data.paidAmount * 100)) throw new Error('stats-contract');
    return { version: 1, period: data.period, startDate: data.startDate, endDate: data.endDate, timeZone: data.timeZone, asOf: data.asOf,
      granularity: data.granularity, paidAmount: data.paidAmount, paidOrderCount: data.paidOrderCount, avgOrderValue: data.avgOrderValue,
      refundAmount: data.refundAmount, totalQuantity: data.totalQuantity, trend, topProducts: products, categories };
  }
}

export class StatsRequests {
  private epoch: number = 0;
  private activeKey: string = '';
  private loading: boolean = false;
  begin(key: string): number {
    if (this.loading && key === this.activeKey) return 0;
    this.activeKey = key; this.loading = true; return ++this.epoch;
  }
  current(epoch: number): boolean { return epoch === this.epoch; }
  finish(epoch: number): void { if (this.current(epoch)) this.loading = false; }
  invalidate(): void { this.epoch++; this.loading = false; this.activeKey = ''; }
}
