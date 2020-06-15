import fs from 'fs'
import {
  ensureEnoughRead,
  ensureEnoughWrite,
  expandArguments,
  writeBufferNT,
} from './utils'

export class FileBufferSync {
  writeOffset = 0
  readOffset = 0

  constructor(public fd: number) {}

  get length(): number {
    return fs.fstatSync(this.fd).size
  }

  /**
   * Gets the remaining data left to be read from the FileBuffer instance.
   */
  get remaining(): number {
    return this.length - this.readOffset
  }

  sync() {
    fs.fsyncSync(this.fd)
    return this
  }

  datasync() {
    fs.fdatasyncSync(this.fd)
    return this
  }

  close() {
    fs.closeSync(this.fd)
  }

  rewind(offset: number) {
    this.writeOffset = this.readOffset = offset
    return this
  }

  reset() {
    return this.rewind(0)
  }

  clear() {
    fs.ftruncateSync(this.fd, 0)
    return this.rewind(0)
  }

  toBuffer(): Buffer {
    return fs.readFileSync(this.fd)
  }

  toString(encoding?: BufferEncoding): string {
    return this.toBuffer().toString(encoding)
  }

  readBuffer(byteSize: number, offset?: number): Buffer {
    const buffer = Buffer.alloc(byteSize)
    if (typeof offset === 'number') {
      const read = fs.readSync(this.fd, buffer, 0, byteSize, offset)
      ensureEnoughRead(read, byteSize)
    } else {
      const read = fs.readSync(this.fd, buffer, 0, byteSize, this.readOffset)
      ensureEnoughRead(read, byteSize)
      this.readOffset += byteSize
    }
    return buffer
  }

  writeBuffer(value: Buffer, offset?: number) {
    const byteSize = value.length
    if (typeof offset === 'number') {
      const write = fs.writeSync(this.fd, value, 0, byteSize, offset)
      ensureEnoughWrite(write, byteSize)
      this.writeOffset = Math.max(this.writeOffset, offset + byteSize)
    } else {
      const write = fs.writeSync(this.fd, value, 0, byteSize, this.writeOffset)
      ensureEnoughWrite(write, byteSize)
      this.writeOffset += byteSize
    }
    return this
  }

  readString(length: number, offset?: number): string
  readString(length: number, encoding?: BufferEncoding, offset?: number): string
  readString(length: number, offset?: number, encoding?: BufferEncoding): string
  readString(length: number): string {
    const args = expandArguments(arguments, 1)
    return this.readBuffer(length, args.offset).toString(args.encoding)
  }

  writeString(value: string, offset?: number): this
  writeString(value: string, encoding?: BufferEncoding, offset?: number): this
  writeString(value: string, offset?: number, encoding?: BufferEncoding): this
  writeString(value: string): this {
    const args = expandArguments(arguments, 1)
    const buffer = Buffer.from(value, args.encoding)
    return this.writeBuffer(buffer, args.offset)
  }

  readBufferNT(offset?: number): Buffer {
    const length = this.length
    const readBuffer = Buffer.alloc(1)
    const start = typeof offset === 'number' ? offset : this.readOffset
    let nullPos = length
    const result: number[] = []
    for (let i = this.readOffset; i < length; i++) {
      const read = fs.readSync(this.fd, readBuffer, 0, 1, start + i)
      ensureEnoughRead(read, 1)
      const byte = readBuffer[0]
      if (byte === 0x00) {
        nullPos = start + 1
        break
      }
      result.push(byte)
    }
    if (typeof offset !== 'number') {
      this.readOffset = nullPos + 1
    }
    return Buffer.from(result)
  }

  writeBufferNT(value: Buffer, offset?: number): this {
    writeBufferNT(this, value, offset)
    return this
  }

  readStringNT(offset?: number): string
  readStringNT(encoding?: BufferEncoding, offset?: number): string
  readStringNT(offset?: number, encoding?: BufferEncoding): string
  readStringNT(): string {
    const args = expandArguments(arguments, 0)
    const buffer = this.readBufferNT(args.offset)
    return buffer.toString(args.encoding)
  }

  writeStringNT(value: string, offset?: number): this
  writeStringNT(value: string, encoding?: BufferEncoding, offset?: number): this
  writeStringNT(value: string, offset?: number, encoding?: BufferEncoding): this
  writeStringNT(value: string): this {
    const args = expandArguments(arguments, 1)
    const buffer = Buffer.from(value, args.encoding)
    return this.writeBufferNT(buffer, args.offset)
  }

  readInt8(offset?: number): number {
    return this.readBuffer(1, offset).readInt8(0)
  }

  writeInt8(value: number, offset?: number): this {
    const buffer = Buffer.alloc(1)
    buffer.writeInt8(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readInt16BE(offset?: number): number {
    return this.readBuffer(2, offset).readInt16BE(0)
  }

  writeInt16BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeInt16BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readInt16LE(offset?: number): number {
    return this.readBuffer(2, offset).readInt16LE(0)
  }

  writeInt16LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeInt16LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readInt32BE(offset?: number): number {
    return this.readBuffer(4, offset).readInt32BE(0)
  }

  writeInt32BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeInt32BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readInt32LE(offset?: number): number {
    return this.readBuffer(4, offset).readInt32LE(0)
  }

  writeInt32LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeInt32LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readBigInt64BE(offset?: number): bigint {
    return this.readBuffer(8, offset).readBigInt64BE(0)
  }

  writeBigInt64BE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigInt64BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readBigInt64LE(offset?: number): bigint {
    return this.readBuffer(8, offset).readBigInt64LE(0)
  }

  writeBigInt64LE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigInt64LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readUInt8(offset?: number): number {
    return this.readBuffer(1, offset).readUInt8(0)
  }

  writeUInt8(value: number, offset?: number): this {
    const buffer = Buffer.alloc(1)
    buffer.writeUInt8(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readUInt16BE(offset?: number): number {
    return this.readBuffer(2, offset).readUInt16BE(0)
  }

  writeUInt16BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readUInt16LE(offset?: number): number {
    return this.readBuffer(2, offset).readUInt16LE(0)
  }

  writeUInt16LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readUInt32BE(offset?: number): number {
    return this.readBuffer(4, offset).readUInt32BE(0)
  }

  writeUInt32BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readUInt32LE(offset?: number): number {
    return this.readBuffer(4, offset).readUInt32LE(0)
  }

  writeUInt32LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readBigUInt64BE(offset?: number): bigint {
    return this.readBuffer(8, offset).readBigUInt64BE(0)
  }

  writeBigUInt64BE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigUInt64BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readBigUInt64LE(offset?: number): bigint {
    return this.readBuffer(8, offset).readBigUInt64LE(0)
  }

  writeBigUInt64LE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigUInt64LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readFloatBE(offset?: number): number {
    return this.readBuffer(4, offset).readFloatBE(0)
  }

  writeFloatBE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatBE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readFloatLE(offset?: number): number {
    return this.readBuffer(4, offset).readFloatLE(0)
  }

  writeFloatLE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatLE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readDoubleBE(offset?: number): number {
    return this.readBuffer(8, offset).readDoubleBE(0)
  }

  writeDoubleBE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeDoubleBE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  readDoubleLE(offset?: number): number {
    return this.readBuffer(8, offset).readDoubleLE(0)
  }

  writeDoubleLE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeDoubleLE(value, 0)
    return this.writeBuffer(buffer, offset)
  }
  static fromFile(file: string | number) {
    if (typeof file === 'number') {
      return new FileBufferSync(file)
    }
    if (fs.existsSync(file)) {
      const fd = fs.openSync(file, 'r+')
      return new FileBufferSync(fd)
    } else {
      const fd = fs.openSync(file, 'w+')
      return new FileBufferSync(fd)
    }
  }
}
