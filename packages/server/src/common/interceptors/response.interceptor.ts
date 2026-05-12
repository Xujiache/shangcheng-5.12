import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Observable, map } from 'rxjs'
import { nanoid } from 'nanoid'
import { Request } from 'express'

export interface ApiResult<T> {
  code: number
  data: T | null
  message: string
  msg: string
  traceId: string
  timestamp: number
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResult<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResult<T>> {
    const req = context.switchToHttp().getRequest<Request>()
    const traceId = (req.headers['x-trace-id'] as string) || `t-${nanoid(10)}`

    return next.handle().pipe(
      map((data) => ({
        code: 0,
        data: data ?? null,
        message: 'ok',
        msg: 'ok',
        traceId,
        timestamp: Date.now(),
      })),
    )
  }
}
