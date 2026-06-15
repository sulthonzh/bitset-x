/**
 * bitset-x — Zero-dep bitset (bit array) backed by Uint32Array
 */

const BITS_PER_WORD = 32;
const WORD_MASK = 31;       // i & WORD_MASK = bit position within word
const WORD_SHIFT = 5;       // i >>> WORD_SHIFT = word index

function wordIndex(i) {
  return i >>> WORD_SHIFT;
}

function wordsNeeded(numBits) {
  return numBits > 0 ? Math.ceil(numBits / BITS_PER_WORD) : 1;
}

export class Bitset {
  constructor(numBits = 0) {
    if (!Number.isInteger(numBits) || numBits < 0) {
      throw new RangeError(`numBits must be a non-negative integer, got ${numBits}`);
    }
    this._size = numBits;
    const nw = wordsNeeded(numBits);
    this._words = new Uint32Array(nw);
  }

  /** Number of bits this bitset can hold. */
  get size() {
    return this._size;
  }

  /** Highest set bit + 1 (logical length). 0 if empty. */
  get length() {
    for (let w = this._words.length - 1; w >= 0; w--) {
      if (this._words[w] !== 0) {
        return (w + 1) * BITS_PER_WORD - Math.clz32(this._words[w]);
      }
    }
    return 0;
  }

  /** Count of set bits (popcount). */
  cardinality() {
    let count = 0;
    for (let w = 0; w < this._words.length; w++) {
      count += popcount32(this._words[w]);
    }
    return count;
  }

  /** Alias for cardinality(). */
  popcount() {
    return this.cardinality();
  }

  /** True if no bits are set. */
  isEmpty() {
    for (let w = 0; w < this._words.length; w++) {
      if (this._words[w] !== 0) return false;
    }
    return true;
  }

  // ─── Single-bit ops ───

  /** Set bit at index. Chainable. */
  set(i) {
    this._checkIndex(i);
    this._words[wordIndex(i)] |= (1 << (i & WORD_MASK));
    return this;
  }

  /** Clear bit at index. Chainable. */
  clear(i) {
    this._checkIndex(i);
    this._words[wordIndex(i)] &= ~(1 << (i & WORD_MASK));
    return this;
  }

  /** Toggle bit at index. Chainable. */
  toggle(i) {
    this._checkIndex(i);
    this._words[wordIndex(i)] ^= (1 << (i & WORD_MASK));
    return this;
  }

  /** Get bit at index (0 or 1). */
  get(i) {
    this._checkIndex(i);
    return (this._words[wordIndex(i)] >>> (i & WORD_MASK)) & 1;
  }

  /** Set all bits to 1. Chainable. */
  setAll() {
    this._words.fill(0xFFFFFFFF);
    // Zero out trailing bits beyond size
    const trailing = this._size & WORD_MASK;
    if (trailing > 0 && this._words.length > 0) {
      this._words[this._words.length - 1] &= (1 << trailing) - 1;
    }
    return this;
  }

  /** Clear all bits. Chainable. */
  clearAll() {
    this._words.fill(0);
    return this;
  }

  // ─── Range ops ───

  /** Set all bits in [from, to]. Chainable. */
  setRange(from, to) {
    this._checkRange(from, to);
    for (let i = from; i <= to; i++) this.set(i);
    return this;
  }

  /** Clear all bits in [from, to]. Chainable. */
  clearRange(from, to) {
    this._checkRange(from, to);
    for (let i = from; i <= to; i++) this.clear(i);
    return this;
  }

  /** Toggle all bits in [from, to]. Chainable. */
  toggleRange(from, to) {
    this._checkRange(from, to);
    for (let i = from; i <= to; i++) this.toggle(i);
    return this;
  }

  /** Count set bits in [from, to]. */
  countRange(from, to) {
    this._checkRange(from, to);
    let count = 0;
    for (let i = from; i <= to; i++) {
      if (this.get(i)) count++;
    }
    return count;
  }

  // ─── Bitwise ops ───

  /** Logical AND with another Bitset. Returns new Bitset. */
  and(other) {
    const n = Math.max(this._size, other._size);
    const result = new Bitset(n);
    const minWords = Math.min(this._words.length, other._words.length);
    for (let w = 0; w < minWords; w++) {
      result._words[w] = this._words[w] & other._words[w];
    }
    return result;
  }

  /** Logical OR with another Bitset. Returns new Bitset. */
  or(other) {
    const n = Math.max(this._size, other._size);
    const result = new Bitset(n);
    for (let w = 0; w < result._words.length; w++) {
      const a = w < this._words.length ? this._words[w] : 0;
      const b = w < other._words.length ? other._words[w] : 0;
      result._words[w] = a | b;
    }
    return result;
  }

  /** Logical XOR with another Bitset. Returns new Bitset. */
  xor(other) {
    const n = Math.max(this._size, other._size);
    const result = new Bitset(n);
    for (let w = 0; w < result._words.length; w++) {
      const a = w < this._words.length ? this._words[w] : 0;
      const b = w < other._words.length ? other._words[w] : 0;
      result._words[w] = a ^ b;
    }
    return result;
  }

  /** Logical NOT (flip all bits). Returns new Bitset. */
  not() {
    const result = new Bitset(this._size);
    for (let w = 0; w < this._words.length; w++) {
      result._words[w] = ~this._words[w];
    }
    // Mask trailing bits
    const trailing = this._size & WORD_MASK;
    if (trailing > 0 && result._words.length > 0) {
      result._words[result._words.length - 1] &= (1 << trailing) - 1;
    }
    return result;
  }

  /** Difference (this AND NOT other). Returns new Bitset. */
  andNot(other) {
    const n = this._size;
    const result = new Bitset(n);
    for (let w = 0; w < this._words.length; w++) {
      const b = w < other._words.length ? other._words[w] : 0;
      result._words[w] = this._words[w] & ~b;
    }
    return result;
  }

  /** In-place AND. Chainable. */
  andInPlace(other) {
    const minWords = Math.min(this._words.length, other._words.length);
    for (let w = 0; w < minWords; w++) {
      this._words[w] &= other._words[w];
    }
    for (let w = minWords; w < this._words.length; w++) {
      this._words[w] = 0;
    }
    return this;
  }

  /** In-place OR. Chainable. */
  orInPlace(other) {
    this._ensureCapacity(other._size);
    for (let w = 0; w < other._words.length; w++) {
      this._words[w] |= other._words[w];
    }
    return this;
  }

  /** In-place XOR. Chainable. */
  xorInPlace(other) {
    this._ensureCapacity(other._size);
    for (let w = 0; w < other._words.length; w++) {
      this._words[w] ^= other._words[w];
    }
    return this;
  }

  // ─── Comparison ───

  /** True if this and other share any set bit. */
  intersects(other) {
    const minWords = Math.min(this._words.length, other._words.length);
    for (let w = 0; w < minWords; w++) {
      if (this._words[w] & other._words[w]) return true;
    }
    return false;
  }

  /** True if all set bits of this are also set in other. */
  isSubsetOf(other) {
    const minWords = Math.min(this._words.length, other._words.length);
    for (let w = 0; w < minWords; w++) {
      if ((this._words[w] & other._words[w]) !== this._words[w]) return false;
    }
    for (let w = minWords; w < this._words.length; w++) {
      if (this._words[w] !== 0) return false;
    }
    return true;
  }

  /** True if this contains all set bits of other. */
  isSupersetOf(other) {
    return other.isSubsetOf(this);
  }

  /** True if same bits set (size can differ for trailing zeros). */
  equals(other) {
    const maxWords = Math.max(this._words.length, other._words.length);
    for (let w = 0; w < maxWords; w++) {
      const a = w < this._words.length ? this._words[w] : 0;
      const b = w < other._words.length ? other._words[w] : 0;
      if (a !== b) return false;
    }
    return true;
  }

  // ─── Bit scanning ───

  /** Index of first set bit >= fromIndex, or -1. */
  nextSetBit(fromIndex = 0) {
    if (fromIndex < 0) fromIndex = 0;
    let w = wordIndex(fromIndex);
    if (w >= this._words.length) return -1;
    // Mask off bits below fromIndex in the first word
    let word = this._words[w] & (~0 << (fromIndex & WORD_MASK));
    while (true) {
      if (word !== 0) {
        return w * BITS_PER_WORD + Math.clz32(word === 0 ? 1 : word) ^ 31 !== 0
          ? w * BITS_PER_WORD + ctz32(word)
          : w * BITS_PER_WORD;
      }
      w++;
      if (w >= this._words.length) return -1;
      word = this._words[w];
    }
  }

  /** Index of last set bit <= fromIndex, or -1. */
  prevSetBit(fromIndex) {
    if (fromIndex === undefined) fromIndex = this._size - 1;
    if (fromIndex < 0) return -1;
    if (fromIndex >= this._size) fromIndex = this._size - 1;
    let w = wordIndex(fromIndex);
    // Mask off bits above fromIndex
    const bitPos = fromIndex & WORD_MASK;
    const mask = bitPos === 31 ? 0xFFFFFFFF : (1 << (bitPos + 1)) - 1;
    let word = this._words[w] & mask;
    while (true) {
      if (word !== 0) {
        return w * BITS_PER_WORD + (31 - Math.clz32(word));
      }
      if (w === 0) return -1;
      w--;
      word = this._words[w];
    }
  }

  /** Index of first clear bit >= fromIndex, or -1. */
  nextClearBit(fromIndex = 0) {
    if (fromIndex < 0) fromIndex = 0;
    for (let i = fromIndex; i < this._size; i++) {
      if (!this.get(i)) return i;
    }
    return -1;
  }

  // ─── Iteration ───

  /** Iterate over indices of set bits. */
  *[Symbol.iterator]() {
    for (let w = 0; w < this._words.length; w++) {
      let word = this._words[w];
      while (word !== 0) {
        const bit = ctz32(word);
        const idx = w * BITS_PER_WORD + bit;
        if (idx < this._size) yield idx;
        word &= word - 1; // clear lowest set bit
      }
    }
  }

  /** Call fn(index) for each set bit. */
  forEach(fn) {
    for (const i of this) fn(i);
  }

  /** Return array of set bit indices. */
  toArray() {
    return [...this];
  }

  // ─── Clone & serialize ───

  clone() {
    const bs = new Bitset(this._size);
    bs._words = new Uint32Array(this._words);
    return bs;
  }

  toJSON() {
    return {
      size: this._size,
      words: [...this._words],
    };
  }

  static fromJSON(obj) {
    const bs = new Bitset(obj.size);
    bs._words = new Uint32Array(obj.words);
    return bs;
  }

  /** Create a Bitset from an iterable of indices. */
  static from(indices, size) {
    const arr = [...indices];
    const maxIdx = arr.length > 0 ? Math.max(...arr) : 0;
    const n = size !== undefined ? size : maxIdx + 1;
    const bs = new Bitset(n);
    for (const i of arr) bs.set(i);
    return bs;
  }

  /** Create from a binary string like "10110001". */
  static fromBinaryString(str, size) {
    const n = size !== undefined ? size : str.length;
    const bs = new Bitset(n);
    for (let i = 0; i < str.length && i < n; i++) {
      if (str[str.length - 1 - i] === '1') bs.set(i);
    }
    return bs;
  }

  /** Convert to binary string (MSB first). */
  toBinaryString() {
    if (this._size === 0) return '';
    let result = '';
    for (let i = this._size - 1; i >= 0; i--) {
      result += this.get(i) ? '1' : '0';
    }
    return result;
  }

  /** Hex representation of the underlying words. */
  toHexString() {
    let result = '';
    for (let w = this._words.length - 1; w >= 0; w--) {
      result += this._words[w].toString(16).padStart(8, '0');
    }
    return result || '0';
  }

  // ─── Resize ───

  /** Resize to new numBits, preserving existing bits. Chainable. */
  resize(newSize) {
    if (!Number.isInteger(newSize) || newSize < 0) {
      throw new RangeError(`newSize must be non-negative integer, got ${newSize}`);
    }
    const nw = wordsNeeded(newSize);
    if (nw !== this._words.length) {
      const newWords = new Uint32Array(nw);
      newWords.set(this._words.subarray(0, Math.min(nw, this._words.length)));
      this._words = newWords;
    }
    this._size = newSize;
    // Clear bits beyond new size
    const trailing = newSize & WORD_MASK;
    if (trailing > 0 && this._words.length > 0) {
      this._words[this._words.length - 1] &= (1 << trailing) - 1;
    }
    return this;
  }

  // ─── Internal helpers ───

  _checkIndex(i) {
    if (!Number.isInteger(i) || i < 0 || i >= this._size) {
      throw new RangeError(`Bit index out of range: ${i} (size: ${this._size})`);
    }
  }

  _checkRange(from, to) {
    if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > to || to >= this._size) {
      throw new RangeError(`Invalid range [${from}, ${to}] (size: ${this._size})`);
    }
  }

  _ensureCapacity(numBits) {
    if (numBits > this._size) this.resize(numBits);
  }
}

// ─── Helpers ───

/** Population count for a 32-bit integer. */
function popcount32(n) {
  n = n - ((n >>> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >>> 2) & 0x33333333);
  n = (n + (n >>> 4)) & 0x0F0F0F0F;
  return Math.imul(n, 0x01010101) >>> 24;
}

/** Count trailing zeros for a 32-bit integer. Returns 32 for 0. */
function ctz32(n) {
  if (n === 0) return 32;
  return Math.clz32(n & -n) ^ 31;
}

export { popcount32, ctz32 };
export default Bitset;
