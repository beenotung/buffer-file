import { FileBuffer } from '../src/file-buffer'
import { FileBufferSync } from '../src/file-buffer-sync'
import { iterateSmartBuffer, iterateSmartBufferSync } from './decode'
import { writeData, writeEnd } from './encode'

const file = 'tmp.log'

export function testSync() {
  console.log('==== sync ====')
  const buffer = FileBufferSync.fromFile(file)
  console.log('== input ==')
  writeData(buffer, { user_id: 1, name: 'Alice' })
  writeData(buffer, { user_id: 2, name: 'Bob' })
  writeEnd(buffer)
  buffer.sync()
  buffer.reset()
  console.log('== output ==')
  for (const data of iterateSmartBufferSync(buffer)) {
    console.log({ data })
  }
  buffer.close()
}

export async function testASync() {
  console.log('==== async ====')
  const buffer = await FileBuffer.fromFile(file)
  console.log('== input ==')
  writeData(buffer, { user_id: 1, name: 'Alice' })
  writeData(buffer, { user_id: 2, name: 'Bob' })
  writeEnd(buffer)
  await buffer.writePromise
  await buffer.sync()
  buffer.reset()
  console.log('== output ==')
  for await (const data of iterateSmartBuffer(buffer)) {
    console.log({ data })
  }
  buffer.close()
}

export async function test() {
  testSync()
  await testASync()
}

test()
