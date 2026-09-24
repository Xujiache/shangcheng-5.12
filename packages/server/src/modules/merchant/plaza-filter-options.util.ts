export function internalTestMerchantIds(value: unknown): string[] {
  const candidate = value as { merchantIds?: unknown; ids?: unknown } | null
  const raw = Array.isArray(value)
    ? value
    : Array.isArray(candidate?.merchantIds)
      ? candidate.merchantIds
      : Array.isArray(candidate?.ids)
        ? candidate.ids
        : []
  return raw.filter((id: unknown): id is string => typeof id === 'string' && id.length > 0)
}

export function excludedPlazaMerchantIds(
  currentMerchantId: string,
  internalIds: string[],
): string[] {
  return Array.from(new Set([currentMerchantId, ...internalIds].filter(Boolean)))
}

export function filterOptionValues(values: string[]): Array<{ value: string; label: string }> {
  return Array.from(new Set(values.filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'zh-CN'))
    .map((value) => ({ value, label: value }))
}
