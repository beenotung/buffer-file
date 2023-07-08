import { type_sizes } from "./size"

function gen() {
  return `
import fs from 'fs'
import { ensureEnoughRead, ensureEnoughWrite, expandArguments, writeBufferNT } from './utils'

export class FileBufferSync {
  writeOffset = 0
  readOffset = 0

  constructor(public fd: number) {
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
    if (offset < 0) {
      throw new RangeError(\`Invalid offset: \${offset}, expect at least 0\`)
    }
    if (offset > this.length) {
      throw new RangeError(
        \`Invalid offset: \${offset}, expect not larger than \${this.length}\`,
      )
    }
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

  get length(): number {
    return fs.fstatSync(this.fd).size
  }

  /**
   * Gets the remaining data left to be read from the FileBuffer instance.
   */
  get remaining(): number {
    return this.length - this.readOffset
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
      if (offset < 0) {
        throw RangeError('offset must be positive')
      }
      const write = fs.writeSync(this.fd, value, 0, byteSize, offset)
      ensureEnoughWrite(write, byteSize)
      this.writeOffset = offset + byteSize
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
    let nullPos = length - 1
    const result: number[] = []
    for (let readPos = start; readPos < length; readPos++) {
      const read = fs.readSync(this.fd, readBuffer, 0, 1, readPos)
      ensureEnoughRead(read, 1)
      const byte = readBuffer[0]
      if (byte === 0x00) {
        nullPos = readPos
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

  ${Object.entries(type_sizes).map(([type, size]) => {
    const value = type.startsWith('Big') ? 'bigint' : 'number'
    return `
  read${type}(offset?: number): ${value} {
    return this.readBuffer(${size}, offset).read${type}(0)
  }

  write${type}(value: ${value}, offset?: number): this {
    const buffer = Buffer.alloc(${size})
    buffer.write${type}(value, 0)
    return this.writeBuffer(buffer, offset)
  }
  `
  }).join('').trim()}

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
`.trim()
}

gen()
