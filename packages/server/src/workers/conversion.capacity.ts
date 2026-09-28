import { freemem } from 'node:os'

export function freeWorkerMemoryBytes(
  host = freemem(),
  platform = process.platform,
  readAvailable: (() => number) | null | undefined = process.availableMemory,
) {
  if (platform !== 'linux' || typeof readAvailable !== 'function') return host
  try {
    const limited = readAvailable()
    return Number.isFinite(limited) && limited >= 0 ? Math.min(host, limited) : host
  } catch { return host }
}
