"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var trace_1 = require("../src/common/trace");
var global_exception_filter_1 = require("../src/common/filters/global-exception.filter");
var common_1 = require("@nestjs/common");
describe('safe trace and errors', function () {
    it('reuses a bounded valid caller id and generates once for invalid headers', function () {
        expect((0, trace_1.requestTraceId)({ headers: { 'x-trace-id': 'request_123' } })).toBe('request_123');
        for (var _i = 0, _a = ['x'.repeat(100), '<script>', ['a', 'b'], 'a\nb']; _i < _a.length; _i++) {
            var value = _a[_i];
            var req = { headers: { 'x-trace-id': value } };
            expect((0, trace_1.requestTraceId)(req)).toMatch(/^t-/);
            expect((0, trace_1.requestTraceId)(req)).toBe(req.traceId);
        }
    });
    it('never returns internal exception messages', function () {
        var log = jest.spyOn(common_1.Logger.prototype, 'error').mockImplementation(function () { return undefined; });
        var json = jest.fn(), status = jest.fn(function () { return ({ json: json }); });
        new global_exception_filter_1.GlobalExceptionFilter().catch(new Error('postgres://password@private'), {
            switchToHttp: function () { return ({
                getRequest: function () { return ({ headers: {}, url: '/api/v1/u/test' }); },
                getResponse: function () { return ({ status: status }); },
            }); },
        });
        expect(status).toHaveBeenCalledWith(500);
        expect(JSON.stringify(json.mock.calls)).not.toContain('password');
        expect(json.mock.calls[0][0].message).toBe(json.mock.calls[0][0].msg);
        expect(log).toHaveBeenCalledWith(expect.objectContaining({ stack: expect.stringContaining('at ') }));
        expect(JSON.stringify(log.mock.calls)).not.toContain('password');
        log.mockRestore();
    });
    it('converts validation message arrays into user-visible text', function () {
        var json = jest.fn(), status = jest.fn(function () { return ({ json: json }); });
        new global_exception_filter_1.GlobalExceptionFilter().catch(new common_1.BadRequestException(['姓名不能为空', '手机号格式错误']), {
            switchToHttp: function () { return ({
                getRequest: function () { return ({ headers: {} }); },
                getResponse: function () { return ({ status: status }); },
            }); },
        });
        expect(json.mock.calls[0][0].message).toBe('姓名不能为空；手机号格式错误');
    });
});
