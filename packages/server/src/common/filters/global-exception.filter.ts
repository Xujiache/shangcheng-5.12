import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { requestTraceId } from '../trace'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    const traceId = requestTraceId(req)
    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let code = 1000
    let message = '内部错误'

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const response = exception.getResponse()
      if (typeof response === 'string') {
        message = response
      } else if (typeof response === 'object' && response !== null) {
        const r = response as Record<string, unknown>
        message = Array.isArray(r.message)
          ? r.message.filter((value): value is string => typeof value === 'string').join('；') ||
            message
          : typeof r.message === 'string'
            ? r.message
            : message
        code = (r.code as number) || status
      }
    } else if (exception instanceof Error) {
      message = '服务暂时不可用，请稍后重试'
      // Keep call sites for diagnosis, not the message (which can contain credentials).
      const stack = exception.stack
        ?.split('\n')
        .slice(1)
        .filter(
          (line) =>
            /^\s+at /.test(line) && !/https?:\/\/|postgres(?:ql)?:\/\/|redis:\/\//i.test(line),
        )
        .slice(0, 12)
        .join('\n')
      this.logger.error({ traceId, error: exception.name, stack })
    }

    // 微信支付 v3 回调：要求顶层 { code: 'SUCCESS'|'FAIL', message }
    // 即使异常分支也不能被业务统一壳包装，否则微信会按梯度重试
    if (req?.url && req.url.includes('/payments/wechat/notify')) {
      res.status(200).json({ code: 'FAIL', message })
      return
    }

    res.status(status).json({
      code,
      data: null,
      message,
      msg: message,
      traceId,
      timestamp: Date.now(),
    })
  }
}
