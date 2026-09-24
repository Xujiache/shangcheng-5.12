import { ProductSku, ProductSpecGroup } from './ProductModels';

export class ProductSkuMatrix {
  static combinationKey(values: string[]): string {
    return values.join('\u001F');
  }

  static specsRecord(groups: ProductSpecGroup[], values: string[]): Record<string, string> {
    const record: Record<string, string> = {};
    groups.forEach((group: ProductSpecGroup, index: number): void => {
      record[group.name] = values[index] || '';
    });
    return record;
  }

  static regenerate(
    groups: ProductSpecGroup[],
    existing: ProductSku[],
    defaultLabel: string
  ): ProductSku[] {
    if (groups.length === 0) {
      const prior = existing.length > 0 ? existing[0] : ProductSkuMatrix.empty(defaultLabel);
      return [{
        id: prior.specValues?.length === 0 ? prior.id : undefined,
        specs: {}, specValues: [], specsLabel: defaultLabel, image: prior.image,
        priceRetail: prior.priceRetail, priceWholesale: prior.priceWholesale,
        priceMember: prior.priceMember, stock: prior.stock, active: prior.active !== false
      }];
    }
    if (groups.some((group: ProductSpecGroup): boolean => group.values.length === 0)) return [];
    const combinations: string[][] = [];
    ProductSkuMatrix.collect(groups, 0, [], combinations);
    const oldByKey: Record<string, ProductSku> = {};
    existing.forEach((sku: ProductSku): void => {
      oldByKey[ProductSkuMatrix.combinationKey(sku.specValues || [])] = sku;
    });
    return combinations.map((values: string[]): ProductSku => {
      const old = oldByKey[ProductSkuMatrix.combinationKey(values)];
      if (old) {
        return {
          id: old.id, specs: ProductSkuMatrix.specsRecord(groups, values), specValues: values,
          specsLabel: values.join(' · '), image: old.image,
          priceRetail: old.priceRetail, priceWholesale: old.priceWholesale,
          priceMember: old.priceMember, stock: old.stock, active: old.active !== false
        };
      }
      return {
        specs: ProductSkuMatrix.specsRecord(groups, values), specValues: values,
        specsLabel: values.join(' · '), priceRetail: 0, priceWholesale: 0,
        priceMember: 0, stock: 0, active: true
      };
    });
  }

  static normalize(
    groups: ProductSpecGroup[],
    skus: ProductSku[],
    defaultLabel: string
  ): ProductSku[] {
    return skus.map((sku: ProductSku): ProductSku => {
      const wholesale = Number(sku.priceWholesale || 0);
      const retail = Number(sku.priceRetail || 0) > 0 ? Number(sku.priceRetail) : wholesale;
      const member = Number(sku.priceMember || 0) > 0 ? Number(sku.priceMember) : retail;
      return {
        id: sku.id,
        specs: sku.specs || ProductSkuMatrix.specsRecord(groups, sku.specValues || []),
        specValues: sku.specValues,
        specsLabel: sku.specsLabel || defaultLabel,
        image: sku.image,
        priceWholesale: wholesale,
        priceRetail: retail,
        priceMember: member,
        stock: Math.floor(Number(sku.stock || 0)),
        active: sku.active !== false
      };
    });
  }

  private static collect(
    groups: ProductSpecGroup[],
    index: number,
    current: string[],
    output: string[][]
  ): void {
    if (index >= groups.length) {
      output.push(current.slice());
      return;
    }
    groups[index].values.forEach((value: string): void => {
      const next = current.slice();
      next.push(value);
      ProductSkuMatrix.collect(groups, index + 1, next, output);
    });
  }

  private static empty(defaultLabel: string): ProductSku {
    return {
      specs: {}, specValues: [], specsLabel: defaultLabel,
      priceRetail: 0, priceWholesale: 0, priceMember: 0, stock: 0, active: true
    };
  }
}
