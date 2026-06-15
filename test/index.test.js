import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Bitset, popcount32, ctz32 } from '../src/index.js';

describe('Constructor', () => {
  it('creates with default size', () => {
    const bs = new Bitset();
    assert.equal(bs.size, 0);
    assert.equal(bs.cardinality(), 0);
  });
  it('creates with given size', () => {
    const bs = new Bitset(64);
    assert.equal(bs.size, 64);
    assert.equal(bs.cardinality(), 0);
    assert.equal(bs.isEmpty(), true);
  });
  it('throws on negative', () => {
    assert.throws(() => new Bitset(-1), RangeError);
  });
  it('throws on non-integer', () => {
    assert.throws(() => new Bitset(1.5), RangeError);
  });
});

describe('Single-bit operations', () => {
  it('set/get/clear/toggle', () => {
    const bs = new Bitset(32);
    bs.set(5);
    assert.equal(bs.get(5), 1);
    assert.equal(bs.get(6), 0);
    bs.clear(5);
    assert.equal(bs.get(5), 0);
    bs.toggle(5);
    assert.equal(bs.get(5), 1);
    bs.toggle(5);
    assert.equal(bs.get(5), 0);
  });
  it('chaining', () => {
    const bs = new Bitset(16);
    bs.set(0).set(1).set(2);
    assert.deepEqual(bs.toArray(), [0, 1, 2]);
    bs.clear(0).clear(1);
    assert.deepEqual(bs.toArray(), [2]);
    bs.toggle(2).toggle(3);
    assert.deepEqual(bs.toArray(), [3]);
  });
  it('throws on out of range', () => {
    const bs = new Bitset(16);
    assert.throws(() => bs.get(-1), RangeError);
    assert.throws(() => bs.get(16), RangeError);
    assert.throws(() => bs.set(100), RangeError);
  });
});

describe('Bulk operations', () => {
  it('setAll and clearAll', () => {
    const bs = new Bitset(10);
    bs.setAll();
    assert.equal(bs.cardinality(), 10);
    assert.deepEqual(bs.toArray(), [0,1,2,3,4,5,6,7,8,9]);
    bs.clearAll();
    assert.equal(bs.cardinality(), 0);
  });
  it('setAll masks trailing bits', () => {
    const bs = new Bitset(35); // 35 bits = 2 words (32 + 3)
    bs.setAll();
    assert.equal(bs.cardinality(), 35);
    // bit 35+ should not exist
  });
});

describe('Range operations', () => {
  it('setRange', () => {
    const bs = new Bitset(32);
    bs.setRange(5, 10);
    assert.deepEqual(bs.toArray(), [5,6,7,8,9,10]);
  });
  it('clearRange', () => {
    const bs = new Bitset(32);
    bs.setRange(0, 10);
    bs.clearRange(3, 7);
    assert.deepEqual(bs.toArray(), [0,1,2,8,9,10]);
  });
  it('toggleRange', () => {
    const bs = new Bitset(16);
    bs.setRange(0, 4);
    bs.toggleRange(2, 6);
    assert.deepEqual(bs.toArray(), [0,1,3,4,5,6]);
  });
  it('countRange', () => {
    const bs = new Bitset(32);
    bs.set(2).set(5).set(8).set(15);
    assert.equal(bs.countRange(3, 15), 3); // 5, 8, 15
  });
  it('throws on bad range', () => {
    const bs = new Bitset(16);
    assert.throws(() => bs.setRange(-1, 5), RangeError);
    assert.throws(() => bs.setRange(5, 3), RangeError);
    assert.throws(() => bs.setRange(0, 16), RangeError);
  });
});

describe('Bitwise operations', () => {
  it('and', () => {
    const a = new Bitset(16).set(1).set(3).set(5);
    const b = new Bitset(16).set(3).set(4).set(5).set(6);
    assert.deepEqual(a.and(b).toArray(), [3, 5]);
  });
  it('or', () => {
    const a = new Bitset(16).set(1).set(3);
    const b = new Bitset(16).set(3).set(7);
    assert.deepEqual(a.or(b).toArray(), [1, 3, 7]);
  });
  it('xor', () => {
    const a = new Bitset(16).set(1).set(3).set(5);
    const b = new Bitset(16).set(3).set(5).set(7);
    assert.deepEqual(a.xor(b).toArray(), [1, 7]);
  });
  it('not', () => {
    const a = new Bitset(8).set(1).set(4);
    assert.deepEqual(a.not().toArray(), [0,2,3,5,6,7]);
  });
  it('andNot (difference)', () => {
    const a = new Bitset(16).set(1).set(3).set(5);
    const b = new Bitset(16).set(3).set(5);
    assert.deepEqual(a.andNot(b).toArray(), [1]);
  });
  it('different sizes', () => {
    const a = new Bitset(32).set(1).set(30);
    const b = new Bitset(64).set(1).set(50);
    const r = a.or(b);
    assert.deepEqual(r.toArray(), [1, 30, 50]);
  });
});

describe('In-place bitwise', () => {
  it('andInPlace', () => {
    const a = new Bitset(16).set(1).set(3).set(5);
    a.andInPlace(new Bitset(16).set(3).set(5).set(7));
    assert.deepEqual(a.toArray(), [3, 5]);
  });
  it('orInPlace', () => {
    const a = new Bitset(16).set(1).set(3);
    a.orInPlace(new Bitset(8).set(5));
    assert.deepEqual(a.toArray(), [1, 3, 5]);
  });
  it('xorInPlace', () => {
    const a = new Bitset(16).set(1).set(3);
    a.xorInPlace(new Bitset(16).set(3).set(5));
    assert.deepEqual(a.toArray(), [1, 5]);
  });
  it('orInPlace grows capacity', () => {
    const a = new Bitset(16).set(1);
    a.orInPlace(new Bitset(64).set(50));
    assert.deepEqual(a.toArray(), [1, 50]);
    assert.equal(a.size, 64);
  });
});

describe('Comparison', () => {
  it('intersects', () => {
    const a = new Bitset(16).set(2).set(5);
    const b = new Bitset(16).set(5).set(9);
    assert.equal(a.intersects(b), true);
    const c = new Bitset(16).set(0).set(1);
    assert.equal(a.intersects(c), false);
  });
  it('isSubsetOf', () => {
    const a = new Bitset(16).set(2).set(5);
    const b = new Bitset(16).set(2).set(5).set(9);
    assert.equal(a.isSubsetOf(b), true);
    assert.equal(b.isSubsetOf(a), false);
  });
  it('isSupersetOf', () => {
    const a = new Bitset(16).set(2).set(5).set(9);
    const b = new Bitset(16).set(2).set(5);
    assert.equal(a.isSupersetOf(b), true);
  });
  it('equals', () => {
    const a = new Bitset(16).set(1).set(3);
    const b = new Bitset(16).set(1).set(3);
    assert.equal(a.equals(b), true);
    const c = new Bitset(32).set(1).set(3);
    assert.equal(a.equals(c), true); // same bit pattern
    const d = new Bitset(16).set(1).set(4);
    assert.equal(a.equals(d), false);
  });
});

describe('Bit scanning', () => {
  it('nextSetBit', () => {
    const bs = new Bitset(32).set(3).set(7).set(15);
    assert.equal(bs.nextSetBit(0), 3);
    assert.equal(bs.nextSetBit(4), 7);
    assert.equal(bs.nextSetBit(8), 15);
    assert.equal(bs.nextSetBit(16), -1);
  });
  it('prevSetBit', () => {
    const bs = new Bitset(32).set(3).set(7).set(15);
    assert.equal(bs.prevSetBit(31), 15);
    assert.equal(bs.prevSetBit(15), 15);
    assert.equal(bs.prevSetBit(14), 7);
    assert.equal(bs.prevSetBit(3), 3);
    assert.equal(bs.prevSetBit(2), -1);
  });
  it('nextClearBit', () => {
    const bs = new Bitset(8).set(0).set(1).set(3);
    assert.equal(bs.nextClearBit(0), 2);
    assert.equal(bs.nextClearBit(4), 4);
    assert.equal(bs.nextClearBit(8), -1);
  });
});

describe('Iteration', () => {
  it('for...of', () => {
    const bs = new Bitset(32).set(0).set(15).set(31);
    const bits = [];
    for (const i of bs) bits.push(i);
    assert.deepEqual(bits, [0, 15, 31]);
  });
  it('forEach', () => {
    const bs = new Bitset(16).set(1).set(3).set(5);
    const bits = [];
    bs.forEach(i => bits.push(i * 10));
    assert.deepEqual(bits, [10, 30, 50]);
  });
  it('toArray', () => {
    const bs = new Bitset(10);
    assert.deepEqual(bs.toArray(), []);
    bs.set(0).set(9);
    assert.deepEqual(bs.toArray(), [0, 9]);
  });
  it('iterates empty bitset', () => {
    const bs = new Bitset(16);
    assert.deepEqual([...bs], []);
  });
});

describe('Serialization', () => {
  it('toJSON/fromJSON round-trip', () => {
    const bs = new Bitset(64).set(0).set(31).set(32).set(63);
    const json = bs.toJSON();
    const restored = Bitset.fromJSON(json);
    assert.deepEqual(restored.toArray(), bs.toArray());
    assert.equal(restored.size, bs.size);
  });
  it('clone', () => {
    const bs = new Bitset(32).set(1).set(5).set(10);
    const clone = bs.clone();
    assert.deepEqual(clone.toArray(), bs.toArray());
    clone.clear(1);
    assert.notDeepEqual(clone.toArray(), bs.toArray());
  });
  it('toBinaryString', () => {
    const bs = new Bitset(8).set(0).set(2).set(7);
    assert.equal(bs.toBinaryString(), '10000101');
  });
  it('fromBinaryString', () => {
    const bs = Bitset.fromBinaryString('10000101');
    assert.deepEqual(bs.toArray(), [0, 2, 7]);
  });
  it('toHexString', () => {
    const bs = new Bitset(32).set(0);
    // Word 0 has bit 0 set = 0x00000001
    assert.equal(bs.toHexString(), '00000001');
  });
});

describe('Factory methods', () => {
  it('from indices', () => {
    const bs = Bitset.from([0, 5, 10, 15]);
    assert.deepEqual(bs.toArray(), [0, 5, 10, 15]);
    assert.equal(bs.size, 16);
  });
  it('from indices with explicit size', () => {
    const bs = Bitset.from([0, 1], 32);
    assert.equal(bs.size, 32);
    assert.deepEqual(bs.toArray(), [0, 1]);
  });
});

describe('Resize', () => {
  it('grow', () => {
    const bs = new Bitset(16).set(5);
    bs.resize(64);
    assert.equal(bs.size, 64);
    assert.equal(bs.get(5), 1);
    assert.equal(bs.cardinality(), 1);
  });
  it('shrink', () => {
    const bs = new Bitset(32).set(5).set(20);
    bs.resize(10);
    assert.equal(bs.size, 10);
    assert.equal(bs.get(5), 1);
    assert.equal(bs.cardinality(), 1); // bit 20 is gone
  });
  it('resize to same size', () => {
    const bs = new Bitset(32).set(5);
    bs.resize(32);
    assert.equal(bs.get(5), 1);
    assert.equal(bs.size, 32);
  });
});

describe('Helpers', () => {
  it('popcount32', () => {
    assert.equal(popcount32(0), 0);
    assert.equal(popcount32(0xFF), 8);
    assert.equal(popcount32(0xFFFFFFFF), 32);
    assert.equal(popcount32(0x55555555), 16);
  });
  it('ctz32', () => {
    assert.equal(ctz32(0), 32);
    assert.equal(ctz32(1), 0);
    assert.equal(ctz32(2), 1);
    assert.equal(ctz32(0x100), 8);
    assert.equal(ctz32(0x80000000), 31);
  });
});

describe('Properties', () => {
  it('length property', () => {
    const bs = new Bitset(32);
    assert.equal(bs.length, 0);
    bs.set(5);
    assert.equal(bs.length, 6);
    bs.set(20);
    assert.equal(bs.length, 21);
  });
  it('isEmpty', () => {
    const bs = new Bitset(16);
    assert.equal(bs.isEmpty(), true);
    bs.set(3);
    assert.equal(bs.isEmpty(), false);
  });
  it('cardinality on large bitset', () => {
    const bs = new Bitset(1000);
    for (let i = 0; i < 1000; i += 2) bs.set(i);
    assert.equal(bs.cardinality(), 500);
  });
});

describe('Cross-word edge cases', () => {
  it('set bits across word boundaries', () => {
    const bs = new Bitset(64).set(30).set(31).set(32).set(33);
    assert.deepEqual(bs.toArray(), [30, 31, 32, 33]);
    assert.equal(bs.cardinality(), 4);
  });
  it('nextSetBit across boundaries', () => {
    const bs = new Bitset(64).set(31).set(33);
    assert.equal(bs.nextSetBit(0), 31);
    assert.equal(bs.nextSetBit(32), 33);
  });
});
