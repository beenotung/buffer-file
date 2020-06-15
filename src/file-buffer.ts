import fs from 'fs'
import {
  ensureEnoughRead,
  ensureEnoughWrite,
  expandArguments,
  writeBufferNT,
} from './utils'

export class FileBuffer {
  writeOffset = 0
  readOffset = 0

  writePromise = Promise.resolve()

  constructor(public fd: fs.promises.FileHandle) {}

  get length(): number {
    return fs.fstatSync(this.fd.fd).size
  }

  sync() {
    return this.fd.sync()
  }

  datasync() {
    return this.fd.datasync()
  }

  close() {
    return this.fd.close()
  }

  rewind(offset: number) {
    this.writeOffset = this.readOffset = offset
    return this
  }

  reset() {
    return this.rewind(0)
  }

  clear() {
    this.writePromise = this.writePromise.then(() => this.fd.truncate(0))
    this.rewind(0)
    return this
  }

  async getLength(): Promise<number> {
    const stat = await this.fd.stat()
    return stat.size
  }

  /**
   * Gets the remaining data left to be read from the FileBuffer instance.
   */
  async getRemaining(): Promise<number> {
    const length = await this.getLength()
    return length - this.readOffset
  }

  toBuffer(): Buffer {
    return fs.readFileSync(this.fd.fd)
  }

  toString(encoding?: BufferEncoding): string {
    return this.toBuffer().toString(encoding)
  }

  async readBuffer(byteSize: number, offset?: number): Promise<Buffer> {
    const buffer = Buffer.alloc(byteSize)
    if (typeof offset === 'number') {
      const result = await this.fd.read(buffer, 0, byteSize, offset)
      ensureEnoughRead(result.bytesRead, byteSize)
      return buffer
    } else {
      offset = this.readOffset
      this.readOffset += byteSize
      const result = await this.fd.read(buffer, 0, byteSize, offset)
      ensureEnoughRead(result.bytesRead, byteSize)
      return buffer
    }
  }

  queueWrite(value: Buffer, offset: number) {
    const byteSize = value.length
    this.writePromise = this.writePromise.then(async () => {
      const result = await this.fd.write(value, 0, byteSize, offset)
      ensureEnoughWrite(result.bytesWritten, byteSize)
    })
  }

  writeBuffer(value: Buffer, offset?: number): this {
    const byteSize = value.length
    if (typeof offset === 'number') {
      this.queueWrite(value, offset)
      this.writeOffset = Math.max(this.writeOffset, offset + byteSize)
    } else {
      this.queueWrite(value, this.writeOffset)
      this.writeOffset += byteSize
    }
    return this
  }

  async readString(length: number, offset?: number): Promise<string>
  async readString(
    length: number,
    encoding?: BufferEncoding,
    offset?: number,
  ): Promise<string>
  async readString(
    length: number,
    arg2?: BufferEncoding | number,
    offset?: number,
  ): Promise<string> {
    const encoding = typeof arg2 === 'string' ? arg2 : undefined
    offset = typeof arg2 === 'number' ? arg2 : offset
    const buffer = await this.readBuffer(length, offset)
    return buffer.toString(encoding)
  }

  writeString(value: string, offset?: number): this
  writeString(value: string, encoding?: BufferEncoding, offset?: number): this
  writeString(
    value: string,
    arg2?: BufferEncoding | number,
    offset?: number,
  ): this {
    const encoding = typeof arg2 === 'string' ? arg2 : undefined
    offset = typeof arg2 === 'number' ? arg2 : offset
    const buffer = Buffer.from(value, encoding)
    return this.writeBuffer(buffer, offset)
  }

  async readBufferNT(offset?: number): Promise<Buffer> {
    const length = await this.getLength()
    const readBuffer = Buffer.alloc(1)
    const start = typeof offset === 'number' ? offset : this.readOffset
    let nullPos = length
    const resultBuffer: number[] = []
    for (let i = this.readOffset; i < length; i++) {
      const result = await this.fd.read(readBuffer, 0, 1, start + i)
      ensureEnoughRead(result.bytesRead, 1)
      const byte = readBuffer[0]
      if (byte === 0x00) {
        nullPos = start + 1
        break
      }
      resultBuffer.push(byte)
    }
    if (typeof offset !== 'number') {
      this.readOffset = nullPos + 1
    }
    return Buffer.from(resultBuffer)
  }

  writeBufferNT(value: Buffer, offset?: number): this {
    writeBufferNT(this, value, offset)
    return this
  }

  async readStringNT(offset?: number): Promise<string>
  async readStringNT(
    encoding?: BufferEncoding,
    offset?: number,
  ): Promise<string>
  async readStringNT(
    offset?: number,
    encoding?: BufferEncoding,
  ): Promise<string>
  async readStringNT(): Promise<string> {
    const args = expandArguments(arguments, 0)
    const buffer = await this.readBufferNT(args.offset)
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

  async readInt8(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(1, offset)
    return buffer.readInt8(0)
  }

  writeInt8(value: number, offset?: number): this {
    const buffer = Buffer.alloc(1)
    buffer.writeInt8(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readInt16BE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(2, offset)
    return buffer.readInt16BE(0)
  }

  writeInt16BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeInt16BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readInt16LE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(2, offset)
    return buffer.readInt16LE(0)
  }

  writeInt16LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeInt16LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readInt32BE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readInt32BE(0)
  }

  writeInt32BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeInt32BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readInt32LE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readInt32LE(0)
  }

  writeInt32LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeInt32LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readBigInt64BE(offset?: number): Promise<bigint> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readBigInt64BE(0)
  }

  writeBigInt64BE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigInt64BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readBigInt64LE(offset?: number): Promise<bigint> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readBigInt64LE(0)
  }

  writeBigInt64LE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigInt64LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readUInt8(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(1, offset)
    return buffer.readUInt8(0)
  }

  writeUInt8(value: number, offset?: number): this {
    const buffer = Buffer.alloc(1)
    buffer.writeUInt8(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readUInt16BE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(2, offset)
    return buffer.readUInt16BE(0)
  }

  writeUInt16BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readUInt16LE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(2, offset)
    return buffer.readUInt16LE(0)
  }

  writeUInt16LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(2)
    buffer.writeUInt16LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readUInt32BE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readUInt32BE(0)
  }

  writeUInt32BE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readUInt32LE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readUInt32LE(0)
  }

  writeUInt32LE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeUInt32LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readBigUInt64BE(offset?: number): Promise<bigint> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readBigUInt64BE(0)
  }

  writeBigUInt64BE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigUInt64BE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readBigUInt64LE(offset?: number): Promise<bigint> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readBigUInt64LE(0)
  }

  writeBigUInt64LE(value: bigint, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeBigUInt64LE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readFloatBE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readFloatBE(0)
  }

  writeFloatBE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatBE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readFloatLE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(4, offset)
    return buffer.readFloatLE(0)
  }

  writeFloatLE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(4)
    buffer.writeFloatLE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readDoubleBE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readDoubleBE(0)
  }

  writeDoubleBE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeDoubleBE(value, 0)
    return this.writeBuffer(buffer, offset)
  }

  async readDoubleLE(offset?: number): Promise<number> {
    const buffer = await this.readBuffer(8, offset)
    return buffer.readDoubleLE(0)
  }

  writeDoubleLE(value: number, offset?: number): this {
    const buffer = Buffer.alloc(8)
    buffer.writeDoubleLE(value, 0)
    return this.writeBuffer(buffer, offset)
  }
  static async fromFile(file: string, flags = 'w+') {
    const fd = await fs.promises.open(file, flags)
    return new FileBuffer(fd)
  }
}
