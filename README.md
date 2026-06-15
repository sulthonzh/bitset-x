# bitset-x

Zero-dependency bitset (bit array) for JavaScript. Backed by `Uint32Array` for compact storage and fast bitwise operations.

## Why?

Need to track millions of flags in a compact format? Bitsets use 1 bit per flag (32x smaller than boolean arrays). Perfect for bloom filters, set operations on integer domains, feature flags, bitmap indexes, and anywhere you need efficient bit-level manipulation.

## Install

```bash
npm install bitset-x
```

## Quick Start

```javascript
import { Bitset } from 'bitset-x';

const bs = new Bitset(64);   // 64-bit bitset
bs.set(0).set(5).set(10).set(63);

bs.get(5);     // 1
bs.get(6);     // 0
bs.cardinality(); // 4 (number of set bits)
bs.length;        // 64 (highest set bit + 1)

// Iterate set bits
for (const i of bs) {
  console.log(i); // 0, 5, 10, 63
}

// Bitwise ops
const a = new Bitset(16).set(1).set(3).set(5);
const b = new Bitset(16).set(3).set(4).set(5).set(6);
a.and(b).toArray();   // [3, 5]
a.or(b).toArray();    // [1, 3, 4, 5, 6]
a.xor(b).toArray();   // [1, 4, 6]
a.andNot(b).toArray(); // [1]
```

## API

### Constructor
- `new Bitset(numBits = 0)` — Create a bitset with `numBits` capacity

### Properties
- `size` — Total bit capacity
- `length` — Highest set bit + 1 (logical length)

### Single-bit Operations
- `set(i)` — Set bit at index. Chainable.
- `clear(i)` — Clear bit at index. Chainable.
- `toggle(i)` — Flip bit at index. Chainable.
- `get(i)` — Returns 0 or 1

### Bulk Operations
- `setAll()` — Set all bits. Chainable.
- `clearAll()` — Clear all bits. Chainable.

### Range Operations
- `setRange(from, to)` — Set bits in `[from, to]`. Chainable.
- `clearRange(from, to)` — Clear bits in `[from, to]`. Chainable.
- `toggleRange(from, to)` — Toggle bits in `[from, to]`. Chainable.
- `countRange(from, to)` — Count set bits in `[from, to]`.

### Bitwise Operations (return new Bitset)
- `and(other)` — Logical AND
- `or(other)` — Logical OR
- `xor(other)` — Logical XOR
- `not()` — Bitwise NOT (flip all bits)
- `andNot(other)` — Difference (this AND NOT other)

### In-place Bitwise (modify this, chainable)
- `andInPlace(other)`
- `orInPlace(other)`
- `xorInPlace(other)`

### Comparison
- `intersects(other)` — True if any shared set bit
- `isSubsetOf(other)` — True if all set bits are in other
- `isSupersetOf(other)` — True if contains all of other's set bits
- `equals(other)` — True if identical bit patterns

### Bit Scanning
- `nextSetBit(fromIndex = 0)` — First set bit ≥ fromIndex, or -1
- `prevSetBit(fromIndex?)` — Last set bit ≤ fromIndex, or -1
- `nextClearBit(fromIndex = 0)` — First clear bit ≥ fromIndex, or -1

### Counting & Stats
- `cardinality()` / `popcount()` — Number of set bits
- `isEmpty()` — True if no bits set

### Iteration
- `[Symbol.iterator]` — Yields indices of set bits
- `forEach(fn)` — Call fn for each set bit index
- `toArray()` — Array of set bit indices

### Serialization
- `toJSON()` → `{ size, words }`
- `Bitset.fromJSON(obj)` — Deserialize
- `toBinaryString()` — MSB-first binary string
- `toHexString()` — Hex of underlying words

### Factory Methods
- `Bitset.from(indices, size?)` — Create from iterable of indices
- `Bitset.fromBinaryString(str, size?)` — Create from binary string (MSB first)

### Utilities
- `popcount32(n)` — Population count of a 32-bit integer
- `ctz32(n)` — Count trailing zeros of a 32-bit integer
- `clone()` — Deep copy
- `resize(newSize)` — Resize, preserving bits. Chainable.

## CLI

```bash
# Set some bits and inspect
npx bitset set 0 3 5 7 15

# Bitwise operations
npx bitset and 0 1 2 3 -- 2 3 4 5
npx bitset or 0 1 2 -- 2 3 4
npx bitset xor 1 3 5 -- 3 5 7

# See the demo
npx bitset demo
```

## Performance

- Memory: 1 bit per flag (vs 8 bytes per boolean in JS arrays)
- Set/get/toggle: O(1)
- Bitwise ops: O(n/32) word-level parallelism
- popcount: hardware-accelerated via bit tricks
- Iteration: O(popcount), not O(size) — skips zero words

## License

MIT
