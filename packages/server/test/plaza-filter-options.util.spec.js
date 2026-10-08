"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var plaza_filter_options_util_1 = require("../src/modules/merchant/plaza-filter-options.util");
describe('plaza filter options', function () {
    it('excludes the current and internal-test merchants without duplicates', function () {
        var internal = (0, plaza_filter_options_util_1.internalTestMerchantIds)({ merchantIds: ['qa-1', 'qa-2', 'qa-1'] });
        expect((0, plaza_filter_options_util_1.excludedPlazaMerchantIds)('current', internal)).toEqual(['current', 'qa-1', 'qa-2']);
    });
    it('returns unique, stable option objects', function () {
        expect((0, plaza_filter_options_util_1.filterOptionValues)(['广东', '', '浙江', '广东'])).toEqual([
            { value: '广东', label: '广东' },
            { value: '浙江', label: '浙江' },
        ]);
    });
});
