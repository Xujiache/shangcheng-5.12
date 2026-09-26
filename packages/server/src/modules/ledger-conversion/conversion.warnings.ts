export const CONVERSION_WARNINGS_OPTION_KEY = '__conversionWarnings'

const MAX_WARNINGS = 12
const MAX_MESSAGE_LENGTH = 180

function cleanWarning(value: unknown, password: unknown): string {
  if (typeof value !== 'string') return ''
  let message = value.replace(/[\x00-\x1f\x7f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (typeof password === 'string' && password) message = message.split(password).join('***')
  return message.slice(0, MAX_MESSAGE_LENGTH)
}

export function collectConversionWarnings(outputs: { warnings?: unknown }[], options: Record<string, unknown>): string[] {
  const warnings: string[] = []
  for (const output of outputs) {
    if (!Array.isArray(output.warnings)) continue
    for (const warning of output.warnings) {
      if (!warning || typeof warning !== 'object') continue
      const item = warning as { code?: unknown; messages?: { zhCN?: unknown } }
      if (typeof item.code !== 'string' || !/^[A-Z][A-Z0-9_]{1,63}$/.test(item.code)) continue
      const message = cleanWarning(item.messages?.zhCN, options.password)
      if (message && !warnings.includes(message)) warnings.push(message)
      if (warnings.length >= MAX_WARNINGS) return warnings
    }
  }
  return warnings
}

export function publicConversionWarnings(options: unknown): string[] {
  if (!options || typeof options !== 'object' || Array.isArray(options)) return []
  const stored = options as Record<string, unknown>
  if (!Array.isArray(stored[CONVERSION_WARNINGS_OPTION_KEY])) return []
  return (stored[CONVERSION_WARNINGS_OPTION_KEY] as unknown[])
    .slice(0, MAX_WARNINGS)
    .map((item) => cleanWarning(item, stored.password))
    .filter(Boolean)
}
