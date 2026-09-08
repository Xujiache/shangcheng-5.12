export class AfterSalePolicy {
  static approvedAmount(rawValue: string, appliedAmount: number): number | undefined {
    const amount = Number(rawValue.trim());
    if (!Number.isFinite(amount) || !Number.isFinite(appliedAmount)) return undefined;
    if (amount <= 0 || appliedAmount <= 0 || amount > appliedAmount) return undefined;
    return amount;
  }

  static rejectReason(rawValue: string): string | undefined {
    const reason = rawValue.trim();
    return reason.length > 0 ? reason : undefined;
  }
}
