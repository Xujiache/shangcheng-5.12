"use strict";
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __setFunctionName = (this && this.__setFunctionName) || function (f, name, prefix) {
    if (typeof name === "symbol") name = name.description ? "[".concat(name.description, "]") : "";
    return Object.defineProperty(f, "name", { configurable: true, value: prefix ? "".concat(prefix, " ", name) : name });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MerchantController = void 0;
var common_1 = require("@nestjs/common");
var swagger_1 = require("@nestjs/swagger");
var roles_decorator_1 = require("../../common/decorators/roles.decorator");
var roles_guard_1 = require("../../common/guards/roles.guard");
var MerchantController = function () {
    var _classDecorators = [(0, swagger_1.ApiTags)('商家端'), (0, common_1.UseGuards)(roles_guard_1.RolesGuard), (0, roles_decorator_1.Roles)('merchant', 'factory', 'store', 'super-admin'), (0, common_1.Controller)('m')];
    var _classDescriptor;
    var _classExtraInitializers = [];
    var _classThis;
    var _instanceExtraInitializers = [];
    var _dashboard_decorators;
    var _stats_decorators;
    var _statsOverview_decorators;
    var _listProducts_decorators;
    var _productDetail_decorators;
    var _createProduct_decorators;
    var _updateProduct_decorators;
    var _batchOnline_decorators;
    var _batchOffline_decorators;
    var _batchDelete_decorators;
    var _batchStatus_decorators;
    var _deleteByIds_decorators;
    var _categories_decorators;
    var _createCategory_decorators;
    var _batchSaveCategories_decorators;
    var _updateCategory_decorators;
    var _deleteCategory_decorators;
    var _sortCategories_decorators;
    var _listOrders_decorators;
    var _merchantOrderShares_decorators;
    var _orderDetail_decorators;
    var _ship_decorators;
    var _batchShip_decorators;
    var _parseAddress_decorators;
    var _createOrderShare_decorators;
    var _currentOrderShare_decorators;
    var _revokeOrderShare_decorators;
    var _refunds_decorators;
    var _refundDetail_decorators;
    var _agree_decorators;
    var _reject_decorators;
    var _aftersales_decorators;
    var _reviewAftersale_decorators;
    var _customers_decorators;
    var _setTier_decorators;
    var _authorize_decorators;
    var _setBlacklist_decorators;
    var _commissionRules_decorators;
    var _saveCommissionRules_decorators;
    var _commissionRuleAlias_decorators;
    var _saveCommissionRuleAlias_decorators;
    var _myCommissions_decorators;
    var _promoteSummary_decorators;
    var _commissionHistory_decorators;
    var _marketingAlias_decorators;
    var _marketingActivities_decorators;
    var _staffAlias_decorators;
    var _withdraws_decorators;
    var _createWithdraw_decorators;
    var _reviewWithdraw_decorators;
    var _rejectWithdraw_decorators;
    var _balance_decorators;
    var _stores_decorators;
    var _createStore_decorators;
    var _store_decorators;
    var _updateStore_decorators;
    var _removeStore_decorators;
    var _getAuth_decorators;
    var _saveAuth_decorators;
    var _staffs_decorators;
    var _createStaff_decorators;
    var _updateStaff_decorators;
    var _removeStaff_decorators;
    var _getDecorate_decorators;
    var _saveDecorate_decorators;
    var _putDecorate_decorators;
    var _marketingOverview_decorators;
    var _marketingCoupons_decorators;
    var _createCoupon_decorators;
    var _updateCouponApi_decorators;
    var _deleteCoupon_decorators;
    var _toggleCoupon_decorators;
    var _chatSessions_decorators;
    var _chatSession_decorators;
    var _chatMessages_decorators;
    var _chatSend_decorators;
    var _chatRead_decorators;
    var _chatQuickReplies_decorators;
    var _chatMessagesAlias_decorators;
    var _chatSendAlias_decorators;
    var _plazaProducts_decorators;
    var _plazaCards_decorators;
    var _plazaFactories_decorators;
    var _plazaFilterOptions_decorators;
    var _plazaFactory_decorators;
    var _plazaFactoryAlias_decorators;
    var _followFactory_decorators;
    var _rateFactory_decorators;
    var _getPlazaVisibility_decorators;
    var _setPlazaVisibility_decorators;
    var _applyAgency_decorators;
    var _myAgencyApplications_decorators;
    var _updateAgencyApp_decorators;
    var _cancelAgencyApp_decorators;
    var _myProfile_decorators;
    var _updateProfile_decorators;
    var _getPriceRule_decorators;
    var _putPriceRule_decorators;
    var _featureFlags_decorators;
    var _memberPlans_decorators;
    var _myMembership_decorators;
    var _quota_decorators;
    var _payments_decorators;
    var _notices_decorators;
    var _subscribe_decorators;
    var _membershipPayStatus_decorators;
    var _cancelSub_decorators;
    var _setAutoRenew_decorators;
    var _useQuota_decorators;
    var _releaseQuota_decorators;
    var MerchantController = _classThis = /** @class */ (function () {
        function MerchantController_1(svc, orderShare, analytics) {
            this.svc = (__runInitializers(this, _instanceExtraInitializers), svc);
            this.orderShare = orderShare;
            this.analytics = analytics;
        }
        // ============ Dashboard ============
        MerchantController_1.prototype.dashboard = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.dashboard(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.stats = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.stats(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.statsOverview = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.analytics.overview(mid, q)];
                    }
                });
            });
        };
        // ============ 商品 ============
        MerchantController_1.prototype.listProducts = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listProducts(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.productDetail = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.productDetail(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.createProduct = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createProduct(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateProduct = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateProduct(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchOnline = function (u, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchStatus(mid, ids, 'active')];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchOffline = function (u, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchStatus(mid, ids, 'offline')];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchDelete = function (u, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchDelete(mid, ids)];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchStatus = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchStatus(mid, dto.ids, dto.status)];
                    }
                });
            });
        };
        MerchantController_1.prototype.deleteByIds = function (u, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchDelete(mid, ids)];
                    }
                });
            });
        };
        // ============ 分类 ============
        // 商家自定义分类（默认）和平台公共分类两套数据共用同一个接口，
        // 前端通过 ?type=platform 切换；不传 / 其他值视为 merchant
        MerchantController_1.prototype.categories = function (u, type) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listCategories(mid, type === 'platform' ? 'platform' : 'merchant')];
                    }
                });
            });
        };
        MerchantController_1.prototype.createCategory = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createCategory(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchSaveCategories = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid, list, _i, list_1, c;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            list = dto.list || dto.categories || [];
                            _i = 0, list_1 = list;
                            _a.label = 2;
                        case 2:
                            if (!(_i < list_1.length)) return [3 /*break*/, 7];
                            c = list_1[_i];
                            if (!c.id) return [3 /*break*/, 4];
                            return [4 /*yield*/, this.svc.updateCategory(mid, c.id, c)];
                        case 3:
                            _a.sent();
                            return [3 /*break*/, 6];
                        case 4: return [4 /*yield*/, this.svc.createCategory(mid, c)];
                        case 5:
                            _a.sent();
                            _a.label = 6;
                        case 6:
                            _i++;
                            return [3 /*break*/, 2];
                        case 7: return [2 /*return*/, { ok: true }];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateCategory = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateCategory(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.deleteCategory = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.deleteCategory(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.sortCategories = function (u, ids) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.sortCategories(mid, ids)];
                    }
                });
            });
        };
        // ============ 订单 ============
        MerchantController_1.prototype.listOrders = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listOrders(mid, q)];
                    }
                });
            });
        };
        /**
         * 商家分享历史列表（merchant-app「我的分享」页 + admin-pc 兜底用）
         *
         * 路由顺序极其关键：必须放在 `orders/:id` 之前，否则 NestJS 会先匹配
         * `/m/orders/shares` 为 `orderDetail(id='shares')`，新接口永远拿不到流量。
         */
        MerchantController_1.prototype.merchantOrderShares = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.orderShare.listByMerchant(mid, q || {})];
                    }
                });
            });
        };
        MerchantController_1.prototype.orderDetail = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.orderDetail(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.ship = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.ship(mid, id, dto.company, dto.trackingNumber)];
                    }
                });
            });
        };
        MerchantController_1.prototype.batchShip = function (u, items) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.batchShip(mid, items)];
                    }
                });
            });
        };
        MerchantController_1.prototype.parseAddress = function (text) {
            return this.svc.parseAddress(text);
        };
        // ============ 订单分享(商家→客户) ============
        /**
         * 创建/重建订单分享链接
         * Body: { visibleFields:['basics','customer','pricing','items','extra'], expiresInDays:30, intro?:string }
         * 返回: { shareCode, shareUrl, expiresAt, visibleFields, intro }
         */
        MerchantController_1.prototype.createOrderShare = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.orderShare.createShare({
                                    orderId: id,
                                    merchantId: mid,
                                    callerSub: u.sub,
                                    visibleFields: dto.visibleFields || [],
                                    expiresInDays: dto.expiresInDays,
                                    intro: dto.intro,
                                })];
                    }
                });
            });
        };
        /** 商家查询该订单当前生效的分享(回显编辑表单用) */
        MerchantController_1.prototype.currentOrderShare = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.orderShare.getCurrentByOrder(id, mid)];
                    }
                });
            });
        };
        /** 商家提前撤销分享(链接立即失效) */
        MerchantController_1.prototype.revokeOrderShare = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.orderShare.revokeByOrder(id, mid)];
                    }
                });
            });
        };
        // ============ 售后 ============
        MerchantController_1.prototype.refunds = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listRefunds(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.refundDetail = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.refundDetail(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.agree = function (u, id, refundAmount) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.agreeRefund(mid, id, refundAmount)];
                    }
                });
            });
        };
        MerchantController_1.prototype.reject = function (u, id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.rejectRefund(mid, id, reason)];
                    }
                });
            });
        };
        // 别名 aftersales
        MerchantController_1.prototype.aftersales = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listRefunds(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.reviewAftersale = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            if (dto.action === 'agree')
                                return [2 /*return*/, this.svc.agreeRefund(mid, id, dto.refundAmount)];
                            return [2 /*return*/, this.svc.rejectRefund(mid, id, dto.reason || '')];
                    }
                });
            });
        };
        // ============ 客户 ============
        MerchantController_1.prototype.customers = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listCustomers(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.setTier = function (u, id, priceTier) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.setCustomerPriceTier(mid, id, priceTier)];
                    }
                });
            });
        };
        MerchantController_1.prototype.authorize = function (u, id, on) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.authorizeCustomer(mid, id, on)];
                    }
                });
            });
        };
        /**
         * 黑名单（仅在当前商家维度生效）
         *
         * 说明：黑名单是「商家 × 客户」局部状态，不动 User.status —— 否则该客户在其他商家也被禁用，
         * 影响面过大。状态存到 SystemConfig key=`merchant:<mid>:blacklist:<userId>`。
         */
        MerchantController_1.prototype.setBlacklist = function (u, id, on) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.setCustomerBlacklist(mid, id, !!on)];
                    }
                });
            });
        };
        // ============ 佣金 ============
        MerchantController_1.prototype.commissionRules = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.commissionRules(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.saveCommissionRules = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.saveCommissionRules(mid, dto)];
                    }
                });
            });
        };
        // admin-pc 别名
        MerchantController_1.prototype.commissionRuleAlias = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.commissionRules(u)];
                });
            });
        };
        MerchantController_1.prototype.saveCommissionRuleAlias = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.saveCommissionRules(u, dto)];
                });
            });
        };
        MerchantController_1.prototype.myCommissions = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.commissionRules(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.promoteSummary = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.promoteSummary(mid)];
                    }
                });
            });
        };
        /** 商家维度佣金历史明细（关联订单 + 推广人），分页 */
        MerchantController_1.prototype.commissionHistory = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.commissionHistory(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.marketingAlias = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.marketingOverview(mid)];
                    }
                });
            });
        };
        /** 商家维度营销活动统一列表（Coupon + FlashSale + GroupBuy 合一），分页；可选 ?kind=coupon|flashSale|groupBuy ?status=active 等 */
        MerchantController_1.prototype.marketingActivities = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.marketingActivities(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.staffAlias = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listStaffs(mid, q)];
                    }
                });
            });
        };
        // ============ 提现 ============
        MerchantController_1.prototype.withdraws = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listWithdraws(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.createWithdraw = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createWithdraw(u.sub, mid, dto)];
                    }
                });
            });
        };
        /**
         * @deprecated 商家自审产品语义错误。正确入口已迁到 /p/withdraws/:id/approve（平台审核）。
         *   保留兼容老 admin-pc / merchant-app 调用,后续版本下线。
         */
        MerchantController_1.prototype.reviewWithdraw = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.reviewWithdraw(mid, id, dto.actualAmount, dto.remark, dto.remarkTags)];
                    }
                });
            });
        };
        /** @deprecated 同上,已由 /p/withdraws/:id/reject 接管 */
        MerchantController_1.prototype.rejectWithdraw = function (u, id, reason) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.rejectWithdraw(mid, id, reason)];
                    }
                });
            });
        };
        MerchantController_1.prototype.balance = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.balance(mid)];
                    }
                });
            });
        };
        // ============ 门店 ============
        MerchantController_1.prototype.stores = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listStores(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.createStore = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createStore(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.store = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getStore(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateStore = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateStore(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.removeStore = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.removeStore(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.getAuth = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getStoreAuth(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.saveAuth = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.saveStoreAuth(mid, id, dto)];
                    }
                });
            });
        };
        // ============ 员工 ============
        MerchantController_1.prototype.staffs = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.listStaffs(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.createStaff = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createStaff(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateStaff = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateStaff(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.removeStaff = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.removeStaff(mid, id)];
                    }
                });
            });
        };
        // ============ 装修 ============
        MerchantController_1.prototype.getDecorate = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getDecorate(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.saveDecorate = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.saveDecorate(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.putDecorate = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.saveDecorate(mid, dto)];
                    }
                });
            });
        };
        // ============ 营销 ============
        MerchantController_1.prototype.marketingOverview = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.marketingOverview(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.marketingCoupons = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.marketingCoupons(mid, q)];
                    }
                });
            });
        };
        // 优惠券 CRUD（admin-pc 营销中心 + merchant-app marketing 共用）
        MerchantController_1.prototype.createCoupon = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.createCoupon(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateCouponApi = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateCoupon(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.deleteCoupon = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.deleteCoupon(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.toggleCoupon = function (u, id, active) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.toggleCoupon(mid, id, !!active)];
                    }
                });
            });
        };
        // ============ 客服聊天 ============
        MerchantController_1.prototype.chatSessions = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatSessions(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatSession = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatSession(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatMessages = function (u, id, query) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatMessages(mid, id, query)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatSend = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatSend(mid, id, dto.type || 'text', dto.content)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatRead = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatRead(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatQuickReplies = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.quickReplies(mid)];
                    }
                });
            });
        };
        // PC 别名
        MerchantController_1.prototype.chatMessagesAlias = function (u, sessionId) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatMessages(mid, sessionId)];
                    }
                });
            });
        };
        MerchantController_1.prototype.chatSendAlias = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.chatSend(mid, dto.sessionId, dto.type || 'text', dto.content)];
                    }
                });
            });
        };
        // ============ 选品广场 ============
        MerchantController_1.prototype.plazaProducts = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u).catch(function () { return ''; })];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.plazaProducts(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.plazaCards = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.plazaProducts(u, q)];
                });
            });
        };
        MerchantController_1.prototype.plazaFactories = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u).catch(function () { return ''; })];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.plazaFactories(mid, {
                                    region: q === null || q === void 0 ? void 0 : q.region,
                                    category: q === null || q === void 0 ? void 0 : q.category,
                                    minRating: (q === null || q === void 0 ? void 0 : q.minRating) ? Number(q.minRating) : undefined,
                                    keyword: q === null || q === void 0 ? void 0 : q.keyword,
                                })];
                    }
                });
            });
        };
        MerchantController_1.prototype.plazaFilterOptions = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u).catch(function () { return ''; })];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.plazaFilterOptions(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.plazaFactory = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u).catch(function () { return ''; })];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.plazaFactory(mid, id)];
                    }
                });
            });
        };
        MerchantController_1.prototype.plazaFactoryAlias = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                return __generator(this, function (_a) {
                    return [2 /*return*/, this.plazaFactory(u, id)];
                });
            });
        };
        MerchantController_1.prototype.followFactory = function (u, id, on) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.followFactory(mid, id, on)];
                    }
                });
            });
        };
        MerchantController_1.prototype.rateFactory = function (u, id, score) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.rateMerchant(id, mid, Number(score))];
                    }
                });
            });
        };
        MerchantController_1.prototype.getPlazaVisibility = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getPlazaVisibility(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.setPlazaVisibility = function (u, scope) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.setPlazaVisibility(mid, scope)];
                    }
                });
            });
        };
        MerchantController_1.prototype.applyAgency = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.applyAgency(mid, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.myAgencyApplications = function (u, q) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.myAgencyApplications(mid, q)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateAgencyApp = function (u, id, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateAgencyApplication(mid, id, dto)];
                    }
                });
            });
        };
        MerchantController_1.prototype.cancelAgencyApp = function (u, id) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.cancelAgencyApplication(mid, id)];
                    }
                });
            });
        };
        // ============ 商户资料（merchant-app 个人信息编辑） ============
        MerchantController_1.prototype.myProfile = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getProfile(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.updateProfile = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.updateProfile(mid, dto)];
                    }
                });
            });
        };
        // ============ 店铺级价格显示规则（持久化到 SystemConfig，key: shop:<merchantId>:priceRule） ============
        MerchantController_1.prototype.getPriceRule = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getShopPriceRule(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.putPriceRule = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.setShopPriceRule(mid, dto)];
                    }
                });
            });
        };
        // ============ 功能开关 ============
        MerchantController_1.prototype.featureFlags = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.resolveFeatureFlags(mid)];
                    }
                });
            });
        };
        // ============ 会员 ============
        MerchantController_1.prototype.memberPlans = function (language) {
            return this.svc.memberPlans(language);
        };
        MerchantController_1.prototype.myMembership = function (u, language) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.myMembership(mid, language)];
                    }
                });
            });
        };
        MerchantController_1.prototype.quota = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.quota(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.payments = function (u, language) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.myPayments(mid, language)];
                    }
                });
            });
        };
        MerchantController_1.prototype.notices = function (u, language) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.membershipNotices(mid, language)];
                    }
                });
            });
        };
        MerchantController_1.prototype.subscribe = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.subscribe(mid, u.sub, dto)];
                    }
                });
            });
        };
        /** 前端轮询支付状态（拉起 wxpay 成功后调用，直到 status='paid' 才显示成功） */
        MerchantController_1.prototype.membershipPayStatus = function (u, no) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.getMembershipPaymentStatus(mid, no)];
                    }
                });
            });
        };
        MerchantController_1.prototype.cancelSub = function (u) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.cancelSub(mid)];
                    }
                });
            });
        };
        MerchantController_1.prototype.setAutoRenew = function (u, autoRenew) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.setAutoRenew(mid, autoRenew)];
                    }
                });
            });
        };
        MerchantController_1.prototype.useQuota = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.useQuota(mid, dto.key, dto.count || 1)];
                    }
                });
            });
        };
        MerchantController_1.prototype.releaseQuota = function (u, dto) {
            return __awaiter(this, void 0, void 0, function () {
                var mid;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0: return [4 /*yield*/, this.svc.ensureMerchantId(u)];
                        case 1:
                            mid = _a.sent();
                            return [2 /*return*/, this.svc.releaseQuota(mid, dto.key, dto.count || 1)];
                    }
                });
            });
        };
        return MerchantController_1;
    }());
    __setFunctionName(_classThis, "MerchantController");
    (function () {
        var _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
        _dashboard_decorators = [(0, common_1.Get)('dashboard')];
        _stats_decorators = [(0, common_1.Get)('stats')];
        _statsOverview_decorators = [(0, common_1.Get)('stats/overview')];
        _listProducts_decorators = [(0, common_1.Get)('products')];
        _productDetail_decorators = [(0, common_1.Get)('products/:id')];
        _createProduct_decorators = [(0, common_1.Post)('products')];
        _updateProduct_decorators = [(0, common_1.Put)('products/:id')];
        _batchOnline_decorators = [(0, common_1.Post)('products/batch-online')];
        _batchOffline_decorators = [(0, common_1.Post)('products/batch-offline')];
        _batchDelete_decorators = [(0, common_1.Post)('products/batch-delete')];
        _batchStatus_decorators = [(0, common_1.Post)('products/batch-status')];
        _deleteByIds_decorators = [(0, common_1.Delete)('products')];
        _categories_decorators = [(0, common_1.Get)('categories')];
        _createCategory_decorators = [(0, common_1.Post)('categories')];
        _batchSaveCategories_decorators = [(0, common_1.Put)('categories')];
        _updateCategory_decorators = [(0, common_1.Put)('categories/:id')];
        _deleteCategory_decorators = [(0, common_1.Delete)('categories/:id')];
        _sortCategories_decorators = [(0, common_1.Post)('categories/sort')];
        _listOrders_decorators = [(0, common_1.Get)('orders')];
        _merchantOrderShares_decorators = [(0, common_1.Get)('orders/shares')];
        _orderDetail_decorators = [(0, common_1.Get)('orders/:id')];
        _ship_decorators = [(0, common_1.Post)('orders/:id/ship')];
        _batchShip_decorators = [(0, common_1.Post)('orders/batch-ship')];
        _parseAddress_decorators = [(0, common_1.Post)('orders/parse-address')];
        _createOrderShare_decorators = [(0, common_1.Post)('orders/:id/share')];
        _currentOrderShare_decorators = [(0, common_1.Get)('orders/:id/share/current')];
        _revokeOrderShare_decorators = [(0, common_1.Post)('orders/:id/share/revoke')];
        _refunds_decorators = [(0, common_1.Get)('refunds')];
        _refundDetail_decorators = [(0, common_1.Get)('refunds/:id')];
        _agree_decorators = [(0, common_1.Post)('refunds/:id/agree')];
        _reject_decorators = [(0, common_1.Post)('refunds/:id/reject')];
        _aftersales_decorators = [(0, common_1.Get)('aftersales')];
        _reviewAftersale_decorators = [(0, common_1.Post)('aftersales/:id/review')];
        _customers_decorators = [(0, common_1.Get)('customers')];
        _setTier_decorators = [(0, common_1.Post)('customers/:id/price-tier')];
        _authorize_decorators = [(0, common_1.Post)('customers/:id/authorize')];
        _setBlacklist_decorators = [(0, common_1.Patch)('customers/:id/blacklist')];
        _commissionRules_decorators = [(0, common_1.Get)('commission/rules')];
        _saveCommissionRules_decorators = [(0, common_1.Post)('commission/rules')];
        _commissionRuleAlias_decorators = [(0, common_1.Get)('commission-rule')];
        _saveCommissionRuleAlias_decorators = [(0, common_1.Put)('commission-rule')];
        _myCommissions_decorators = [(0, common_1.Get)('commissions')];
        _promoteSummary_decorators = [(0, common_1.Get)('promote-summary')];
        _commissionHistory_decorators = [(0, common_1.Get)('commission/history')];
        _marketingAlias_decorators = [(0, common_1.Get)('marketing')];
        _marketingActivities_decorators = [(0, common_1.Get)('marketing/activities')];
        _staffAlias_decorators = [(0, common_1.Get)('staff')];
        _withdraws_decorators = [(0, common_1.Get)('withdraws')];
        _createWithdraw_decorators = [(0, common_1.Post)('withdraws')];
        _reviewWithdraw_decorators = [(0, common_1.Post)('withdraws/:id/review')];
        _rejectWithdraw_decorators = [(0, common_1.Post)('withdraws/:id/reject')];
        _balance_decorators = [(0, common_1.Get)('balance')];
        _stores_decorators = [(0, common_1.Get)('stores')];
        _createStore_decorators = [(0, common_1.Post)('stores')];
        _store_decorators = [(0, common_1.Get)('stores/:id')];
        _updateStore_decorators = [(0, common_1.Put)('stores/:id')];
        _removeStore_decorators = [(0, common_1.Delete)('stores/:id')];
        _getAuth_decorators = [(0, common_1.Get)('stores/:id/auth')];
        _saveAuth_decorators = [(0, common_1.Post)('stores/:id/auth')];
        _staffs_decorators = [(0, common_1.Get)('staffs')];
        _createStaff_decorators = [(0, common_1.Post)('staffs')];
        _updateStaff_decorators = [(0, common_1.Put)('staffs/:id')];
        _removeStaff_decorators = [(0, common_1.Delete)('staffs/:id')];
        _getDecorate_decorators = [(0, common_1.Get)('shop/decorate')];
        _saveDecorate_decorators = [(0, common_1.Post)('shop/decorate')];
        _putDecorate_decorators = [(0, common_1.Put)('shop/decorate')];
        _marketingOverview_decorators = [(0, common_1.Get)('marketing/overview')];
        _marketingCoupons_decorators = [(0, common_1.Get)('marketing/coupons')];
        _createCoupon_decorators = [(0, common_1.Post)('marketing/coupons')];
        _updateCouponApi_decorators = [(0, common_1.Put)('marketing/coupons/:id')];
        _deleteCoupon_decorators = [(0, common_1.Delete)('marketing/coupons/:id')];
        _toggleCoupon_decorators = [(0, common_1.Post)('marketing/coupons/:id/toggle')];
        _chatSessions_decorators = [(0, common_1.Get)('chat/sessions')];
        _chatSession_decorators = [(0, common_1.Get)('chat/sessions/:id')];
        _chatMessages_decorators = [(0, common_1.Get)('chat/sessions/:id/messages')];
        _chatSend_decorators = [(0, common_1.Post)('chat/sessions/:id/messages')];
        _chatRead_decorators = [(0, common_1.Post)('chat/sessions/:id/read')];
        _chatQuickReplies_decorators = [(0, common_1.Get)('chat/quick-replies')];
        _chatMessagesAlias_decorators = [(0, common_1.Get)('chat/messages')];
        _chatSendAlias_decorators = [(0, common_1.Post)('chat/messages')];
        _plazaProducts_decorators = [(0, common_1.Get)('plaza/products')];
        _plazaCards_decorators = [(0, common_1.Get)('plaza/cards')];
        _plazaFactories_decorators = [(0, common_1.Get)('plaza/factories')];
        _plazaFilterOptions_decorators = [(0, common_1.Get)('plaza/filter-options')];
        _plazaFactory_decorators = [(0, common_1.Get)('plaza/factories/:id')];
        _plazaFactoryAlias_decorators = [(0, common_1.Get)('plaza/factory/:id')];
        _followFactory_decorators = [(0, common_1.Post)('plaza/factories/:id/follow')];
        _rateFactory_decorators = [(0, common_1.Post)('plaza/factories/:id/rate')];
        _getPlazaVisibility_decorators = [(0, common_1.Get)('plaza/visibility')];
        _setPlazaVisibility_decorators = [(0, common_1.Put)('plaza/visibility')];
        _applyAgency_decorators = [(0, common_1.Post)('plaza/agency')];
        _myAgencyApplications_decorators = [(0, common_1.Get)('plaza/applications')];
        _updateAgencyApp_decorators = [(0, common_1.Patch)('plaza/applications/:id')];
        _cancelAgencyApp_decorators = [(0, common_1.Delete)('plaza/applications/:id')];
        _myProfile_decorators = [(0, common_1.Get)('profile')];
        _updateProfile_decorators = [(0, common_1.Patch)('profile')];
        _getPriceRule_decorators = [(0, common_1.Get)('shop/price-rule')];
        _putPriceRule_decorators = [(0, common_1.Put)('shop/price-rule')];
        _featureFlags_decorators = [(0, common_1.Get)('feature-flags')];
        _memberPlans_decorators = [(0, common_1.Get)('membership/plans')];
        _myMembership_decorators = [(0, common_1.Get)('membership')];
        _quota_decorators = [(0, common_1.Get)('membership/quota')];
        _payments_decorators = [(0, common_1.Get)('membership/payments')];
        _notices_decorators = [(0, common_1.Get)('membership/notices')];
        _subscribe_decorators = [(0, common_1.Post)('membership/subscribe')];
        _membershipPayStatus_decorators = [(0, common_1.Get)('membership/payments/:no/status')];
        _cancelSub_decorators = [(0, common_1.Post)('membership/cancel')];
        _setAutoRenew_decorators = [(0, common_1.Post)('membership/auto-renew')];
        _useQuota_decorators = [(0, common_1.Post)('membership/quota/use')];
        _releaseQuota_decorators = [(0, common_1.Post)('membership/quota/release')];
        __esDecorate(_classThis, null, _dashboard_decorators, { kind: "method", name: "dashboard", static: false, private: false, access: { has: function (obj) { return "dashboard" in obj; }, get: function (obj) { return obj.dashboard; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _stats_decorators, { kind: "method", name: "stats", static: false, private: false, access: { has: function (obj) { return "stats" in obj; }, get: function (obj) { return obj.stats; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _statsOverview_decorators, { kind: "method", name: "statsOverview", static: false, private: false, access: { has: function (obj) { return "statsOverview" in obj; }, get: function (obj) { return obj.statsOverview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listProducts_decorators, { kind: "method", name: "listProducts", static: false, private: false, access: { has: function (obj) { return "listProducts" in obj; }, get: function (obj) { return obj.listProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _productDetail_decorators, { kind: "method", name: "productDetail", static: false, private: false, access: { has: function (obj) { return "productDetail" in obj; }, get: function (obj) { return obj.productDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createProduct_decorators, { kind: "method", name: "createProduct", static: false, private: false, access: { has: function (obj) { return "createProduct" in obj; }, get: function (obj) { return obj.createProduct; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProduct_decorators, { kind: "method", name: "updateProduct", static: false, private: false, access: { has: function (obj) { return "updateProduct" in obj; }, get: function (obj) { return obj.updateProduct; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchOnline_decorators, { kind: "method", name: "batchOnline", static: false, private: false, access: { has: function (obj) { return "batchOnline" in obj; }, get: function (obj) { return obj.batchOnline; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchOffline_decorators, { kind: "method", name: "batchOffline", static: false, private: false, access: { has: function (obj) { return "batchOffline" in obj; }, get: function (obj) { return obj.batchOffline; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchDelete_decorators, { kind: "method", name: "batchDelete", static: false, private: false, access: { has: function (obj) { return "batchDelete" in obj; }, get: function (obj) { return obj.batchDelete; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchStatus_decorators, { kind: "method", name: "batchStatus", static: false, private: false, access: { has: function (obj) { return "batchStatus" in obj; }, get: function (obj) { return obj.batchStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteByIds_decorators, { kind: "method", name: "deleteByIds", static: false, private: false, access: { has: function (obj) { return "deleteByIds" in obj; }, get: function (obj) { return obj.deleteByIds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _categories_decorators, { kind: "method", name: "categories", static: false, private: false, access: { has: function (obj) { return "categories" in obj; }, get: function (obj) { return obj.categories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCategory_decorators, { kind: "method", name: "createCategory", static: false, private: false, access: { has: function (obj) { return "createCategory" in obj; }, get: function (obj) { return obj.createCategory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchSaveCategories_decorators, { kind: "method", name: "batchSaveCategories", static: false, private: false, access: { has: function (obj) { return "batchSaveCategories" in obj; }, get: function (obj) { return obj.batchSaveCategories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateCategory_decorators, { kind: "method", name: "updateCategory", static: false, private: false, access: { has: function (obj) { return "updateCategory" in obj; }, get: function (obj) { return obj.updateCategory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteCategory_decorators, { kind: "method", name: "deleteCategory", static: false, private: false, access: { has: function (obj) { return "deleteCategory" in obj; }, get: function (obj) { return obj.deleteCategory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _sortCategories_decorators, { kind: "method", name: "sortCategories", static: false, private: false, access: { has: function (obj) { return "sortCategories" in obj; }, get: function (obj) { return obj.sortCategories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _listOrders_decorators, { kind: "method", name: "listOrders", static: false, private: false, access: { has: function (obj) { return "listOrders" in obj; }, get: function (obj) { return obj.listOrders; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _merchantOrderShares_decorators, { kind: "method", name: "merchantOrderShares", static: false, private: false, access: { has: function (obj) { return "merchantOrderShares" in obj; }, get: function (obj) { return obj.merchantOrderShares; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _orderDetail_decorators, { kind: "method", name: "orderDetail", static: false, private: false, access: { has: function (obj) { return "orderDetail" in obj; }, get: function (obj) { return obj.orderDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _ship_decorators, { kind: "method", name: "ship", static: false, private: false, access: { has: function (obj) { return "ship" in obj; }, get: function (obj) { return obj.ship; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _batchShip_decorators, { kind: "method", name: "batchShip", static: false, private: false, access: { has: function (obj) { return "batchShip" in obj; }, get: function (obj) { return obj.batchShip; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _parseAddress_decorators, { kind: "method", name: "parseAddress", static: false, private: false, access: { has: function (obj) { return "parseAddress" in obj; }, get: function (obj) { return obj.parseAddress; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createOrderShare_decorators, { kind: "method", name: "createOrderShare", static: false, private: false, access: { has: function (obj) { return "createOrderShare" in obj; }, get: function (obj) { return obj.createOrderShare; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _currentOrderShare_decorators, { kind: "method", name: "currentOrderShare", static: false, private: false, access: { has: function (obj) { return "currentOrderShare" in obj; }, get: function (obj) { return obj.currentOrderShare; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _revokeOrderShare_decorators, { kind: "method", name: "revokeOrderShare", static: false, private: false, access: { has: function (obj) { return "revokeOrderShare" in obj; }, get: function (obj) { return obj.revokeOrderShare; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refunds_decorators, { kind: "method", name: "refunds", static: false, private: false, access: { has: function (obj) { return "refunds" in obj; }, get: function (obj) { return obj.refunds; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _refundDetail_decorators, { kind: "method", name: "refundDetail", static: false, private: false, access: { has: function (obj) { return "refundDetail" in obj; }, get: function (obj) { return obj.refundDetail; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _agree_decorators, { kind: "method", name: "agree", static: false, private: false, access: { has: function (obj) { return "agree" in obj; }, get: function (obj) { return obj.agree; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reject_decorators, { kind: "method", name: "reject", static: false, private: false, access: { has: function (obj) { return "reject" in obj; }, get: function (obj) { return obj.reject; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _aftersales_decorators, { kind: "method", name: "aftersales", static: false, private: false, access: { has: function (obj) { return "aftersales" in obj; }, get: function (obj) { return obj.aftersales; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reviewAftersale_decorators, { kind: "method", name: "reviewAftersale", static: false, private: false, access: { has: function (obj) { return "reviewAftersale" in obj; }, get: function (obj) { return obj.reviewAftersale; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _customers_decorators, { kind: "method", name: "customers", static: false, private: false, access: { has: function (obj) { return "customers" in obj; }, get: function (obj) { return obj.customers; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setTier_decorators, { kind: "method", name: "setTier", static: false, private: false, access: { has: function (obj) { return "setTier" in obj; }, get: function (obj) { return obj.setTier; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _authorize_decorators, { kind: "method", name: "authorize", static: false, private: false, access: { has: function (obj) { return "authorize" in obj; }, get: function (obj) { return obj.authorize; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setBlacklist_decorators, { kind: "method", name: "setBlacklist", static: false, private: false, access: { has: function (obj) { return "setBlacklist" in obj; }, get: function (obj) { return obj.setBlacklist; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _commissionRules_decorators, { kind: "method", name: "commissionRules", static: false, private: false, access: { has: function (obj) { return "commissionRules" in obj; }, get: function (obj) { return obj.commissionRules; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveCommissionRules_decorators, { kind: "method", name: "saveCommissionRules", static: false, private: false, access: { has: function (obj) { return "saveCommissionRules" in obj; }, get: function (obj) { return obj.saveCommissionRules; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _commissionRuleAlias_decorators, { kind: "method", name: "commissionRuleAlias", static: false, private: false, access: { has: function (obj) { return "commissionRuleAlias" in obj; }, get: function (obj) { return obj.commissionRuleAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveCommissionRuleAlias_decorators, { kind: "method", name: "saveCommissionRuleAlias", static: false, private: false, access: { has: function (obj) { return "saveCommissionRuleAlias" in obj; }, get: function (obj) { return obj.saveCommissionRuleAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myCommissions_decorators, { kind: "method", name: "myCommissions", static: false, private: false, access: { has: function (obj) { return "myCommissions" in obj; }, get: function (obj) { return obj.myCommissions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _promoteSummary_decorators, { kind: "method", name: "promoteSummary", static: false, private: false, access: { has: function (obj) { return "promoteSummary" in obj; }, get: function (obj) { return obj.promoteSummary; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _commissionHistory_decorators, { kind: "method", name: "commissionHistory", static: false, private: false, access: { has: function (obj) { return "commissionHistory" in obj; }, get: function (obj) { return obj.commissionHistory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _marketingAlias_decorators, { kind: "method", name: "marketingAlias", static: false, private: false, access: { has: function (obj) { return "marketingAlias" in obj; }, get: function (obj) { return obj.marketingAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _marketingActivities_decorators, { kind: "method", name: "marketingActivities", static: false, private: false, access: { has: function (obj) { return "marketingActivities" in obj; }, get: function (obj) { return obj.marketingActivities; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _staffAlias_decorators, { kind: "method", name: "staffAlias", static: false, private: false, access: { has: function (obj) { return "staffAlias" in obj; }, get: function (obj) { return obj.staffAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _withdraws_decorators, { kind: "method", name: "withdraws", static: false, private: false, access: { has: function (obj) { return "withdraws" in obj; }, get: function (obj) { return obj.withdraws; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createWithdraw_decorators, { kind: "method", name: "createWithdraw", static: false, private: false, access: { has: function (obj) { return "createWithdraw" in obj; }, get: function (obj) { return obj.createWithdraw; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _reviewWithdraw_decorators, { kind: "method", name: "reviewWithdraw", static: false, private: false, access: { has: function (obj) { return "reviewWithdraw" in obj; }, get: function (obj) { return obj.reviewWithdraw; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rejectWithdraw_decorators, { kind: "method", name: "rejectWithdraw", static: false, private: false, access: { has: function (obj) { return "rejectWithdraw" in obj; }, get: function (obj) { return obj.rejectWithdraw; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _balance_decorators, { kind: "method", name: "balance", static: false, private: false, access: { has: function (obj) { return "balance" in obj; }, get: function (obj) { return obj.balance; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _stores_decorators, { kind: "method", name: "stores", static: false, private: false, access: { has: function (obj) { return "stores" in obj; }, get: function (obj) { return obj.stores; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createStore_decorators, { kind: "method", name: "createStore", static: false, private: false, access: { has: function (obj) { return "createStore" in obj; }, get: function (obj) { return obj.createStore; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _store_decorators, { kind: "method", name: "store", static: false, private: false, access: { has: function (obj) { return "store" in obj; }, get: function (obj) { return obj.store; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStore_decorators, { kind: "method", name: "updateStore", static: false, private: false, access: { has: function (obj) { return "updateStore" in obj; }, get: function (obj) { return obj.updateStore; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeStore_decorators, { kind: "method", name: "removeStore", static: false, private: false, access: { has: function (obj) { return "removeStore" in obj; }, get: function (obj) { return obj.removeStore; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getAuth_decorators, { kind: "method", name: "getAuth", static: false, private: false, access: { has: function (obj) { return "getAuth" in obj; }, get: function (obj) { return obj.getAuth; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveAuth_decorators, { kind: "method", name: "saveAuth", static: false, private: false, access: { has: function (obj) { return "saveAuth" in obj; }, get: function (obj) { return obj.saveAuth; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _staffs_decorators, { kind: "method", name: "staffs", static: false, private: false, access: { has: function (obj) { return "staffs" in obj; }, get: function (obj) { return obj.staffs; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createStaff_decorators, { kind: "method", name: "createStaff", static: false, private: false, access: { has: function (obj) { return "createStaff" in obj; }, get: function (obj) { return obj.createStaff; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateStaff_decorators, { kind: "method", name: "updateStaff", static: false, private: false, access: { has: function (obj) { return "updateStaff" in obj; }, get: function (obj) { return obj.updateStaff; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _removeStaff_decorators, { kind: "method", name: "removeStaff", static: false, private: false, access: { has: function (obj) { return "removeStaff" in obj; }, get: function (obj) { return obj.removeStaff; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getDecorate_decorators, { kind: "method", name: "getDecorate", static: false, private: false, access: { has: function (obj) { return "getDecorate" in obj; }, get: function (obj) { return obj.getDecorate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _saveDecorate_decorators, { kind: "method", name: "saveDecorate", static: false, private: false, access: { has: function (obj) { return "saveDecorate" in obj; }, get: function (obj) { return obj.saveDecorate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _putDecorate_decorators, { kind: "method", name: "putDecorate", static: false, private: false, access: { has: function (obj) { return "putDecorate" in obj; }, get: function (obj) { return obj.putDecorate; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _marketingOverview_decorators, { kind: "method", name: "marketingOverview", static: false, private: false, access: { has: function (obj) { return "marketingOverview" in obj; }, get: function (obj) { return obj.marketingOverview; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _marketingCoupons_decorators, { kind: "method", name: "marketingCoupons", static: false, private: false, access: { has: function (obj) { return "marketingCoupons" in obj; }, get: function (obj) { return obj.marketingCoupons; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _createCoupon_decorators, { kind: "method", name: "createCoupon", static: false, private: false, access: { has: function (obj) { return "createCoupon" in obj; }, get: function (obj) { return obj.createCoupon; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateCouponApi_decorators, { kind: "method", name: "updateCouponApi", static: false, private: false, access: { has: function (obj) { return "updateCouponApi" in obj; }, get: function (obj) { return obj.updateCouponApi; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _deleteCoupon_decorators, { kind: "method", name: "deleteCoupon", static: false, private: false, access: { has: function (obj) { return "deleteCoupon" in obj; }, get: function (obj) { return obj.deleteCoupon; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _toggleCoupon_decorators, { kind: "method", name: "toggleCoupon", static: false, private: false, access: { has: function (obj) { return "toggleCoupon" in obj; }, get: function (obj) { return obj.toggleCoupon; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSessions_decorators, { kind: "method", name: "chatSessions", static: false, private: false, access: { has: function (obj) { return "chatSessions" in obj; }, get: function (obj) { return obj.chatSessions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSession_decorators, { kind: "method", name: "chatSession", static: false, private: false, access: { has: function (obj) { return "chatSession" in obj; }, get: function (obj) { return obj.chatSession; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatMessages_decorators, { kind: "method", name: "chatMessages", static: false, private: false, access: { has: function (obj) { return "chatMessages" in obj; }, get: function (obj) { return obj.chatMessages; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSend_decorators, { kind: "method", name: "chatSend", static: false, private: false, access: { has: function (obj) { return "chatSend" in obj; }, get: function (obj) { return obj.chatSend; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatRead_decorators, { kind: "method", name: "chatRead", static: false, private: false, access: { has: function (obj) { return "chatRead" in obj; }, get: function (obj) { return obj.chatRead; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatQuickReplies_decorators, { kind: "method", name: "chatQuickReplies", static: false, private: false, access: { has: function (obj) { return "chatQuickReplies" in obj; }, get: function (obj) { return obj.chatQuickReplies; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatMessagesAlias_decorators, { kind: "method", name: "chatMessagesAlias", static: false, private: false, access: { has: function (obj) { return "chatMessagesAlias" in obj; }, get: function (obj) { return obj.chatMessagesAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _chatSendAlias_decorators, { kind: "method", name: "chatSendAlias", static: false, private: false, access: { has: function (obj) { return "chatSendAlias" in obj; }, get: function (obj) { return obj.chatSendAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaProducts_decorators, { kind: "method", name: "plazaProducts", static: false, private: false, access: { has: function (obj) { return "plazaProducts" in obj; }, get: function (obj) { return obj.plazaProducts; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaCards_decorators, { kind: "method", name: "plazaCards", static: false, private: false, access: { has: function (obj) { return "plazaCards" in obj; }, get: function (obj) { return obj.plazaCards; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaFactories_decorators, { kind: "method", name: "plazaFactories", static: false, private: false, access: { has: function (obj) { return "plazaFactories" in obj; }, get: function (obj) { return obj.plazaFactories; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaFilterOptions_decorators, { kind: "method", name: "plazaFilterOptions", static: false, private: false, access: { has: function (obj) { return "plazaFilterOptions" in obj; }, get: function (obj) { return obj.plazaFilterOptions; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaFactory_decorators, { kind: "method", name: "plazaFactory", static: false, private: false, access: { has: function (obj) { return "plazaFactory" in obj; }, get: function (obj) { return obj.plazaFactory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _plazaFactoryAlias_decorators, { kind: "method", name: "plazaFactoryAlias", static: false, private: false, access: { has: function (obj) { return "plazaFactoryAlias" in obj; }, get: function (obj) { return obj.plazaFactoryAlias; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _followFactory_decorators, { kind: "method", name: "followFactory", static: false, private: false, access: { has: function (obj) { return "followFactory" in obj; }, get: function (obj) { return obj.followFactory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _rateFactory_decorators, { kind: "method", name: "rateFactory", static: false, private: false, access: { has: function (obj) { return "rateFactory" in obj; }, get: function (obj) { return obj.rateFactory; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPlazaVisibility_decorators, { kind: "method", name: "getPlazaVisibility", static: false, private: false, access: { has: function (obj) { return "getPlazaVisibility" in obj; }, get: function (obj) { return obj.getPlazaVisibility; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setPlazaVisibility_decorators, { kind: "method", name: "setPlazaVisibility", static: false, private: false, access: { has: function (obj) { return "setPlazaVisibility" in obj; }, get: function (obj) { return obj.setPlazaVisibility; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _applyAgency_decorators, { kind: "method", name: "applyAgency", static: false, private: false, access: { has: function (obj) { return "applyAgency" in obj; }, get: function (obj) { return obj.applyAgency; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myAgencyApplications_decorators, { kind: "method", name: "myAgencyApplications", static: false, private: false, access: { has: function (obj) { return "myAgencyApplications" in obj; }, get: function (obj) { return obj.myAgencyApplications; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateAgencyApp_decorators, { kind: "method", name: "updateAgencyApp", static: false, private: false, access: { has: function (obj) { return "updateAgencyApp" in obj; }, get: function (obj) { return obj.updateAgencyApp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelAgencyApp_decorators, { kind: "method", name: "cancelAgencyApp", static: false, private: false, access: { has: function (obj) { return "cancelAgencyApp" in obj; }, get: function (obj) { return obj.cancelAgencyApp; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myProfile_decorators, { kind: "method", name: "myProfile", static: false, private: false, access: { has: function (obj) { return "myProfile" in obj; }, get: function (obj) { return obj.myProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _updateProfile_decorators, { kind: "method", name: "updateProfile", static: false, private: false, access: { has: function (obj) { return "updateProfile" in obj; }, get: function (obj) { return obj.updateProfile; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _getPriceRule_decorators, { kind: "method", name: "getPriceRule", static: false, private: false, access: { has: function (obj) { return "getPriceRule" in obj; }, get: function (obj) { return obj.getPriceRule; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _putPriceRule_decorators, { kind: "method", name: "putPriceRule", static: false, private: false, access: { has: function (obj) { return "putPriceRule" in obj; }, get: function (obj) { return obj.putPriceRule; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _featureFlags_decorators, { kind: "method", name: "featureFlags", static: false, private: false, access: { has: function (obj) { return "featureFlags" in obj; }, get: function (obj) { return obj.featureFlags; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _memberPlans_decorators, { kind: "method", name: "memberPlans", static: false, private: false, access: { has: function (obj) { return "memberPlans" in obj; }, get: function (obj) { return obj.memberPlans; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _myMembership_decorators, { kind: "method", name: "myMembership", static: false, private: false, access: { has: function (obj) { return "myMembership" in obj; }, get: function (obj) { return obj.myMembership; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _quota_decorators, { kind: "method", name: "quota", static: false, private: false, access: { has: function (obj) { return "quota" in obj; }, get: function (obj) { return obj.quota; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _payments_decorators, { kind: "method", name: "payments", static: false, private: false, access: { has: function (obj) { return "payments" in obj; }, get: function (obj) { return obj.payments; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _notices_decorators, { kind: "method", name: "notices", static: false, private: false, access: { has: function (obj) { return "notices" in obj; }, get: function (obj) { return obj.notices; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _subscribe_decorators, { kind: "method", name: "subscribe", static: false, private: false, access: { has: function (obj) { return "subscribe" in obj; }, get: function (obj) { return obj.subscribe; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _membershipPayStatus_decorators, { kind: "method", name: "membershipPayStatus", static: false, private: false, access: { has: function (obj) { return "membershipPayStatus" in obj; }, get: function (obj) { return obj.membershipPayStatus; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _cancelSub_decorators, { kind: "method", name: "cancelSub", static: false, private: false, access: { has: function (obj) { return "cancelSub" in obj; }, get: function (obj) { return obj.cancelSub; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _setAutoRenew_decorators, { kind: "method", name: "setAutoRenew", static: false, private: false, access: { has: function (obj) { return "setAutoRenew" in obj; }, get: function (obj) { return obj.setAutoRenew; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _useQuota_decorators, { kind: "method", name: "useQuota", static: false, private: false, access: { has: function (obj) { return "useQuota" in obj; }, get: function (obj) { return obj.useQuota; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(_classThis, null, _releaseQuota_decorators, { kind: "method", name: "releaseQuota", static: false, private: false, access: { has: function (obj) { return "releaseQuota" in obj; }, get: function (obj) { return obj.releaseQuota; } }, metadata: _metadata }, null, _instanceExtraInitializers);
        __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
        MerchantController = _classThis = _classDescriptor.value;
        if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        __runInitializers(_classThis, _classExtraInitializers);
    })();
    return MerchantController = _classThis;
}();
exports.MerchantController = MerchantController;
