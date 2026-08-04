import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { nanoid } from 'nanoid'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const req = ctx.getRequest<Request>()
    const res = ctx.getResponse<Response>()

    const traceId = (req.headers['x-trace-id'] as string) || `t-${nanoid(10)}`
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
        message = (r.message as string) || message
        code = (r.code as number) || status
      }
    } else if (exception instanceof Error) {
      message = exception.message
      this.logger.error(exception.stack)
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
