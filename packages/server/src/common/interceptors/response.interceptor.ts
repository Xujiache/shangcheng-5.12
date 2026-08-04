import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { Observable, map } from 'rxjs'
import { nanoid } from 'nanoid'
import { Request } from 'express'
import { SKIP_RESPONSE_WRAP } from '../decorators/skip-response.decorator'

export interface ApiResult<T> {
  code: number
  data: T | null
  message: string
  msg: string
  traceId: string
  timestamp: number
}

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResult<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResult<T> | T> {
    // 命中 @SkipResponseWrap()（方法或类级别）→ 原样返回，
    // 用于微信支付回调等需要第三方约定顶层格式的接口
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_RESPONSE_WRAP, [
      context.getHandler(),
      context.getClass(),
    ])
    if (skip) {
      return next.handle()
    }

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
