import { pack } from 'msgpackr'
import { Stream } from 'stream'
import { FileBuffer } from '../src/file-buffer'
import { FileBufferSync } from '../src/file-buffer-sync'

export function writeData(buffer: FileBuffer | FileBufferSync, data: any) {
  const bin = pack(data)
  buffer.writeUInt32BE(bin.length)
  buffer.writeBuffer(bin)
}

export function writeEnd(buffer: FileBuffer | FileBufferSync) {
  buffer.writeUInt32BE(0)
}

export function sink(source: Stream, dest: FileBuffer) {
  return new Promise<void>((resolve, reject) => {
    source.on('data', data => {
      writeData(dest, data)
    })
    source.on('error', err => {
      reject(err)
    })
    source.on('close', () => {
      dest.writeUInt32BE(0)
      dest.close()
      resolve()
    })
  })
}
