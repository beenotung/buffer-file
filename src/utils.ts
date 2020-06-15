import { FileBuffer } from './file-buffer'
import { FileBufferSync } from './file-buffer-sync'

export function ensureEnoughRead(read: number, byteSize: number) {
  if (read !== byteSize) {
    throw new Error('not enough bytes to be read')
  }
}

export function ensureEnoughWrite(write: number, byteSize: number) {
  if (write !== byteSize) {
    throw new Error('not written enough bytes')
  }
}

export function writeBufferNT(
  buffer: FileBufferSync | FileBuffer,
  value: Buffer,
  offset?: number,
): void {
  buffer.writeBuffer(value, offset)
  if (value.length === 0 || value[value.length - 1] !== 0x00) {
    buffer.writeUInt8(
      0x00,
      typeof offset === 'number' ? offset + value.length : undefined,
    )
  }
}

export function expandArguments(args: IArguments | any[], start: number) {
  let encoding: BufferEncoding | undefined
  let offset: number | undefined
  for (let i = start; i < args.length; i++) {
    const arg = args[i]
    switch (typeof arg) {
      case 'number':
        offset = arg
        break
      case 'string':
        encoding = arg as BufferEncoding
        break
    }
  }
  return { encoding, offset }
}
