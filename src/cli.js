#!/usr/bin/env node
import { Bitset } from './index.js';

const [cmd, ...args] = process.argv.slice(2);

function usage() {
  console.log(`bitset-x CLI

Usage:
  bitset set <bits...>        Set bits, show result
  bitset get <bits...>        Get bit values
  bitset info <bits...>       Show bitset info (size, cardinality, length)
  bitset and <a-bits> <b-bits>   AND two bitsets
  bitset or <a-bits> <b-bits>    OR two bitsets
  bitset xor <a-bits> <b-bits>   XOR two bitsets
  bitset demo                  Interactive demo

Bits are specified as space-separated indices: "bitset set 0 3 5 7"
For and/or/xor, provide two groups separated by '--':
  bitset or 0 1 2 -- 2 3 4`);
}

function parseBits(strs) {
  return strs.map(Number).filter(n => Number.isInteger(n) && n >= 0);
}

function splitGroups(args) {
  const dashIdx = args.indexOf('--');
  if (dashIdx === -1) {
    const bits = parseBits(args);
    return [bits, []];
  }
  return [parseBits(args.slice(0, dashIdx)), parseBits(args.slice(dashIdx + 1))];
}

function makeBitset(bits, size) {
  const maxIdx = bits.length > 0 ? Math.max(...bits) : 0;
  const n = Math.max(size || 0, maxIdx + 1, 1);
  const bs = new Bitset(n);
  for (const b of bits) bs.set(b);
  return bs;
}

switch (cmd) {
  case 'set': {
    const bits = parseBits(args);
    const bs = makeBitset(bits);
    console.log(`Size: ${bs.size}`);
    console.log(`Set bits: ${bs.toArray()}`);
    console.log(`Binary: ${bs.toBinaryString()}`);
    console.log(`Hex: 0x${bs.toHexString()}`);
    break;
  }
  case 'get': {
    if (args.length < 1) { console.error('Need at least one bit index'); process.exit(1); }
    const bits = parseBits(args);
    const maxIdx = Math.max(...bits);
    const bs = makeBitset([], maxIdx + 1);
    console.log(bits.map(b => `bit[${b}] = ${bs.get(b)}`).join('\n'));
    break;
  }
  case 'info': {
    const bits = parseBits(args);
    const bs = makeBitset(bits);
    console.log(`Size: ${bs.size}`);
    console.log(`Cardinality: ${bs.cardinality()}`);
    console.log(`Length (highest+1): ${bs.length}`);
    console.log(`IsEmpty: ${bs.isEmpty()}`);
    console.log(`Set bits: [${bs.toArray().join(', ')}]`);
    console.log(`Binary: ${bs.toBinaryString()}`);
    console.log(`Hex: 0x${bs.toHexString()}`);
    break;
  }
  case 'and':
  case 'or':
  case 'xor': {
    const [a, b] = splitGroups(args);
    const bsA = makeBitset(a);
    const bsB = makeBitset(b);
    const result = cmd === 'and' ? bsA.and(bsB) : cmd === 'or' ? bsA.or(bsB) : bsA.xor(bsB);
    console.log(`A: [${bsA.toArray().join(', ')}]`);
    console.log(`B: [${bsB.toArray().join(', ')}]`);
    console.log(`${cmd.toUpperCase()}: [${result.toArray().join(', ')}]`);
    break;
  }
  case 'demo': {
    const bs = new Bitset(32);
    bs.set(0).set(3).set(5).set(7).set(15);
    console.log('Demo: 32-bit bitset with bits 0,3,5,7,15 set');
    console.log(`Binary:  ${bs.toBinaryString()}`);
    console.log(`Hex:     0x${bs.toHexString()}`);
    console.log(`Cardinality: ${bs.cardinality()}`);
    console.log(`Length: ${bs.length}`);
    console.log(`First set bit: ${bs.nextSetBit(0)}`);
    console.log(`Next set bit after 3: ${bs.nextSetBit(4)}`);
    console.log(`Prev set bit from 20: ${bs.prevSetBit(20)}`);
    console.log(`\nIterating set bits: ${bs.toArray().join(', ')}`);

    console.log('\n--- Bitwise demo ---');
    const a = new Bitset(16); a.set(1).set(3).set(5).set(7);
    const b = new Bitset(16); b.set(3).set(4).set(5).set(6);
    console.log(`A = [${a.toArray().join(',')}]  B = [${b.toArray().join(',')}]`);
    console.log(`A AND B = [${a.and(b).toArray().join(',')}]`);
    console.log(`A OR B  = [${a.or(b).toArray().join(',')}]`);
    console.log(`A XOR B = [${a.xor(b).toArray().join(',')}]`);
    console.log(`A AND NOT B = [${a.andNot(b).toArray().join(',')}]`);
    console.log(`NOT A = [${a.not().toArray().join(',')}]`);
    break;
  }
  default:
    usage();
    break;
}
