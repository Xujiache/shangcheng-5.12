"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
Object.defineProperty(exports, "__esModule", { value: true });
jest.mock('nanoid', function () { return ({ customAlphabet: function () { return function () { return 'TEST00000001'; }; } }); });
jest.mock('sharp', function () { return ({ __esModule: true, default: jest.fn() }); }, { virtual: true });
var merchant_service_1 = require("../src/modules/merchant/merchant.service");
describe('merchant member-plan localization', function () {
    var plan = {
        id: 'plan-1',
        name: '基础月会员',
        nameEn: 'Core Monthly Membership',
        rights: ['店铺装修', '客服'],
        rightsEn: ['Store design', 'Customer support'],
    };
    it('recognizes English language negotiation case-insensitively', function () {
        expect((0, merchant_service_1.isEnglishLocale)('en-US')).toBe(true);
        expect((0, merchant_service_1.isEnglishLocale)('EN-gb')).toBe(true);
        expect((0, merchant_service_1.isEnglishLocale)('zh-CN')).toBe(false);
    });
    it('returns localized display fields without mutating the source', function () {
        var result = (0, merchant_service_1.localizeMemberPlan)(plan, 'en-US');
        expect(result).toMatchObject({
            name: 'Core Monthly Membership',
            rights: ['Store design', 'Customer support'],
        });
        expect(plan.name).toBe('基础月会员');
        expect(plan.rights).toEqual(['店铺装修', '客服']);
    });
    it('keeps Chinese for Chinese and falls back safely when English is incomplete', function () {
        expect((0, merchant_service_1.localizeMemberPlan)(plan, 'zh-CN')).toBe(plan);
        expect((0, merchant_service_1.localizeMemberPlan)(__assign(__assign({}, plan), { nameEn: '', rightsEn: [] }), 'en-US')).toMatchObject({
            name: '基础月会员',
            rights: ['店铺装修', '客服'],
        });
    });
});
