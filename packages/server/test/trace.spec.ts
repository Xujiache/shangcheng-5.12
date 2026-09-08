import { requestTraceId } from '../src/common/trace'
import { GlobalExceptionFilter } from '../src/common/filters/global-exception.filter'
import { BadRequestException, Logger } from '@nestjs/common'

describe('safe trace and errors', () => {
  it('reuses a bounded valid caller id and generates once for invalid headers', () => {
    expect(requestTraceId({ headers: { 'x-trace-id': 'request_123' } } as any)).toBe('request_123')
    for (const value of ['x'.repeat(100), '<script>', ['a', 'b'], 'a\nb']) {
      const req = { headers: { 'x-trace-id': value } } as any
      expect(requestTraceId(req)).toMatch(/^t-/)
      expect(requestTraceId(req)).toBe(req.traceId)
    }
  })
  it('never returns internal exception messages', () => {
    const log = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined)
    const json = jest.fn(),
      status = jest.fn(() => ({ json }))
    new GlobalExceptionFilter().catch(new Error('postgres://password@private'), {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {}, url: '/api/v1/u/test' }),
        getResponse: () => ({ status }),
      }),
    } as any)
    expect(status).toHaveBeenCalledWith(500)
    expect(JSON.stringify(json.mock.calls)).not.toContain('password')
    expect(json.mock.calls[0][0].message).toBe(json.mock.calls[0][0].msg)
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ stack: expect.stringContaining('at ') }),
    )
    expect(JSON.stringify(log.mock.calls)).not.toContain('password')
    log.mockRestore()
  })
  it('converts validation message arrays into user-visible text', () => {
    const json = jest.fn(),
      status = jest.fn(() => ({ json }))
    new GlobalExceptionFilter().catch(new BadRequestException(['姓名不能为空', '手机号格式错误']), {
      switchToHttp: () => ({
        getRequest: () => ({ headers: {} }),
        getResponse: () => ({ status }),
      }),
    } as any)
    expect(json.mock.calls[0][0].message).toBe('姓名不能为空；手机号格式错误')
  })
})
