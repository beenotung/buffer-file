import { unpack } from 'msgpack'
import { FileBuffer } from '../src/file-buffer'
import { FileBufferSync } from '../src/file-buffer-sync'

export function* iterateSmartBufferSync(source: FileBufferSync) {
  for (;;) {
    const length = source.readUInt32BE()
    if (length === 0) {
      return
    }
    const bin = source.readBuffer(length)
    yield unpack(bin)
  }
}
export async function* iterateSmartBuffer(source: FileBuffer) {
  for (;;) {
    const length = await source.readUInt32BE()
    if (length === 0) {
      return
    }
    const bin = await source.readBuffer(length)
    yield unpack(bin)
  }
}
