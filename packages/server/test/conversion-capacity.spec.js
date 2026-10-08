"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var conversion_capacity_1 = require("../src/workers/conversion.capacity");
describe('conversion worker memory capacity', function () {
    var GiB = Math.pow(1024, 3);
    test('uses the smaller Linux container available memory', function () {
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'linux', function () { return 4 * GiB; })).toBe(4 * GiB);
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(4 * GiB, 'linux', function () { return 12 * GiB; })).toBe(4 * GiB);
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'linux', function () { return 0; })).toBe(0);
    });
    test('keeps macOS host reading and tolerates missing or invalid Linux readings', function () {
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'darwin', function () { return 4 * GiB; })).toBe(12 * GiB);
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'linux', null)).toBe(12 * GiB);
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'linux', function () { return Number.NaN; })).toBe(12 * GiB);
        expect((0, conversion_capacity_1.freeWorkerMemoryBytes)(12 * GiB, 'linux', function () { throw new Error('unavailable'); })).toBe(12 * GiB);
    });
});
