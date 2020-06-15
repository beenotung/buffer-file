export let type_sizes = {
  Int8: 1,
  Int16BE: 2,
  Int16LE: 2,
  Int32BE: 4,
  Int32LE: 4,
  BigInt64BE: 8,
  BigInt64LE: 8,
  UInt8: 1,
  UInt16BE: 2,
  UInt16LE: 2,
  UInt32BE: 4,
  UInt32LE: 4,
  BigUInt64BE: 8,
  BigUInt64LE: 8,
  FloatBE: 4,
  FloatLE: 4,
  DoubleBE: 8,
  DoubleLE: 8,
}

export function getTypeSize(type: keyof typeof type_sizes): number {
  if (type in type_sizes) {
    return type_sizes[type]
  }
  throw new Error('unknown type size')
}
