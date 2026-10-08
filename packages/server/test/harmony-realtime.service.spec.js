"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var harmony_realtime_service_1 = require("../src/modules/harmony-merchant/harmony-realtime.service");
describe('HarmonyRealtimeService', function () {
    it('uses one stable event id for a merchant broadcast and a new id for the next event', function () {
        var service = new harmony_realtime_service_1.HarmonyRealtimeService({}, {}, {});
        var firstFrames = [];
        var secondFrames = [];
        var firstSocket = { readyState: 1, send: function (value) { return firstFrames.push(value); } };
        var secondSocket = { readyState: 1, send: function (value) { return secondFrames.push(value); } };
        var state = {
            userId: 'user-1',
            merchantId: 'merchant-1',
            sessions: new Set(),
            requestIds: new Set(),
            authenticatedAt: Date.now(),
        };
        service.clients.set(firstSocket, state);
        service.clients.set(secondSocket, state);
        service.emitMerchant('merchant-1', 'order.new', { id: 'order-1' });
        var first = JSON.parse(firstFrames[0]);
        var mirrored = JSON.parse(secondFrames[0]);
        expect(first.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(mirrored.requestId).toBe(first.requestId);
        service.emitMerchant('merchant-1', 'order.update', { id: 'order-1', status: 'paid' });
        var next = JSON.parse(firstFrames[1]);
        expect(next.requestId).not.toBe(first.requestId);
    });
});
