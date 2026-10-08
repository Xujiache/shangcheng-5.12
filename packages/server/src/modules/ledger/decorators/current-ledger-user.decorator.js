"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CurrentLedgerUser = void 0;
var common_1 = require("@nestjs/common");
exports.CurrentLedgerUser = (0, common_1.createParamDecorator)(function (_, ctx) {
    return ctx.switchToHttp().getRequest().ledgerUser;
});
