import { ProductSummary } from './ProductModels';

/** Virtualized cards: never start all image requests just because a page was appended. */
export class ProductDataSource implements IDataSource {
  private items: ProductSummary[] = [];
  private listeners: DataChangeListener[] = [];
  totalCount(): number { return this.items.length; }
  getData(index: number): ProductSummary { return this.items[index]; }
  update(items: ProductSummary[]): void {
    this.items = items;
    this.listeners.forEach((listener: DataChangeListener): void => listener.onDataReloaded());
  }
  registerDataChangeListener(listener: DataChangeListener): void {
    if (!this.listeners.includes(listener)) this.listeners.push(listener);
  }
  unregisterDataChangeListener(listener: DataChangeListener): void {
    this.listeners = this.listeners.filter((item: DataChangeListener): boolean => item !== listener);
  }
}
