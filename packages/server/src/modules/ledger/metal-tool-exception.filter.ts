import { ArgumentsHost, Catch, HttpException, HttpStatus, Logger } from '@nestjs/common'
import { GlobalExceptionFilter } from '../../common/filters/global-exception.filter'
import { BizCode } from '../../common/exceptions/biz.exception'

/** 金属工具约定 HTTP 200；统一响应壳仍由仓库现有过滤器生成。 */
@Catch()
export class MetalToolExceptionFilter extends GlobalExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    if (!(exception instanceof HttpException)) {
      new Logger(MetalToolExceptionFilter.name).error(exception instanceof Error ? exception.name : 'UnknownError')
      super.catch(new HttpException({ code: BizCode.BUSINESS_ERROR, message: '服务暂时不可用，请稍后重试' }, HttpStatus.OK), host)
      return
    }
    const response = exception.getResponse()
    const body = typeof response === 'object' && response !== null
      ? response as Record<string, unknown> : { message: response }
    const code = typeof body.code === 'number' ? body.code
      : exception.getStatus() === HttpStatus.BAD_REQUEST ? BizCode.INVALID_PARAMS : exception.getStatus()
    super.catch(new HttpException({ ...body, code }, HttpStatus.OK), host)
  }
}
