import { randomUUID } from 'node:crypto'
import type { Request } from 'express'

type TracedRequest = Request & { traceId?: string }

export function requestTraceId(req: TracedRequest): string {
  if (req.traceId) return req.traceId
  const supplied = req.headers['x-trace-id']
  req.traceId =
    typeof supplied === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(supplied)
      ? supplied
      : `t-${randomUUID()}`
  return req.traceId
}
