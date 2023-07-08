import { expect } from 'chai'
import { FileBuffer } from '../src/file-buffer'
import { FileBufferSync } from '../src/file-buffer-sync'
import { iterateSmartBuffer, iterateSmartBufferSync } from './decode'
import { writeData, writeEnd } from './encode'

const file = 'tmp.log'

describe('sync test', () => {
  let buffer: FileBufferSync
  before(() => {
    buffer = FileBufferSync.fromFile(file)
  })
  it('should write data', () => {
    writeData(buffer, { user_id: 1, name: 'Alice' })
    writeData(buffer, { user_id: 2, name: 'Bob' })
    writeEnd(buffer)
    buffer.sync()
  })
  it('should read data', () => {
    buffer.reset()
    let items = []
    for (const data of iterateSmartBufferSync(buffer)) {
      items.push(data)
    }
    expect(items).deep.equals([
      { user_id: 1, name: 'Alice' },
      { user_id: 2, name: 'Bob' },
    ])
  })
  after(() => {
    buffer.close()
  })
})

describe('async test', () => {
  let buffer: FileBuffer
  before(async () => {
    buffer = await FileBuffer.fromFile(file)
  })
  it('should write data', async () => {
    writeData(buffer, { user_id: 1, name: 'Alice' })
    writeData(buffer, { user_id: 2, name: 'Bob' })
    writeEnd(buffer)
    await buffer.writePromise
    await buffer.sync()
  })
  it('should read data', async () => {
    buffer.reset()
    let items = []
    for await (const data of iterateSmartBuffer(buffer)) {
      items.push(data)
    }
    expect(items).deep.equals([
      { user_id: 1, name: 'Alice' },
      { user_id: 2, name: 'Bob' },
    ])
  })
  after(() => {
    buffer.close()
  })
})
