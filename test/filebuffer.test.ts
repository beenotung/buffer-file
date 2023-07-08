/**
 * based on tests of smart-buffer: https://github.com/JoshGlazebrook/smart-buffer/blob/master/test/smartbuffer.test.ts
 * */
import { assert } from 'chai'
import fs from 'fs'
import 'mocha'
import { FileBuffer, FileBufferSync } from '../src'
import { startDebug } from '../src/debug'
import {
  ensureEnoughRead,
  ensureEnoughWrite,
  expandArguments,
} from '../src/utils'

// tslint:disable:no-invalid-this

const file = 'tmp.txt'

describe('Constructing a SmartBuffer', () => {
  it('should create sync reader from file', function () {
    const reader = FileBufferSync.fromFile(file)
    reader.close()
  })
  it('should create async reader from file', async function () {
    const reader = await FileBuffer.fromFile(file)
    reader.close()
  })
})

describe('Reading/Writing To/From SmartBuffer', () => {
  /**
   * Technically, if one of these works, they all should. But they're all here anyways.
   */
  describe('Numeric Values', () => {
    let reader: FileBufferSync
    before(() => {
      reader = FileBufferSync.fromFile(file)
      reader.writeUInt8(0x44)
      reader.writeUInt8(0xff)
      reader.writeInt16BE(0x00c8)
      reader.writeInt16LE(0x6699)
      reader.writeUInt16BE(0xffdd)
      reader.writeUInt16LE(0xffdd)
      reader.writeInt32BE(0x77889900)
      reader.writeInt32LE(0x77889900)
      reader.writeUInt32BE(0xffddccbb)
      reader.writeUInt32LE(0xffddccbb)
      reader.writeFloatBE(1.234)
      reader.writeFloatLE(1.234)
      reader.writeDoubleBE(1.23456789)
      reader.writeDoubleLE(1.23456789)
      reader.writeUInt8(0xc8, 0)
      reader.writeUInt16LE(0x00c8, 4)
    })

    it('should equal the correct values that were written above', () => {
      const log = startDebug()
      log({
        read: reader.readOffset,
        write: reader.writeOffset,
        len: reader.length,
        fs: fs.readFileSync('tmp.txt'),
      })
      assert.strictEqual(reader.readUInt8(), 0xc8)
      assert.strictEqual(reader.readUInt8(), 0xff)
      assert.strictEqual(reader.readInt16BE(), 0x00c8)
      assert.strictEqual(reader.readInt16LE(), 0x00c8)
      assert.strictEqual(reader.readUInt16BE(), 0xffdd)
      assert.strictEqual(reader.readUInt16LE(), 0xffdd)
      assert.strictEqual(reader.readInt32BE(), 0x77889900)
      assert.strictEqual(reader.readInt32LE(), 0x77889900)
      assert.strictEqual(reader.readUInt32BE(), 0xffddccbb)
      assert.strictEqual(reader.readUInt32LE(), 0xffddccbb)
      assert.closeTo(reader.readFloatBE(), 1.234, 0.001)
      assert.closeTo(reader.readFloatLE(), 1.234, 0.001)
      assert.closeTo(reader.readDoubleBE(), 1.23456789, 0.001)
      assert.closeTo(reader.readDoubleLE(), 1.23456789, 0.001)
      assert.equal(reader.readUInt8(0), 0xc8)
    })

    it('should throw an exception if attempting to read numeric values from a buffer with not enough data left', () => {
      assert.throws(() => {
        reader.readUInt32BE()
      })
    })

    it('should throw an exception if attempting to write numeric values to a negative offset.', () => {
      assert.throws(() => {
        reader.writeUInt16BE(20, -5)
      })
    })
  })

  describe('BigInt values', () => {
    describe('When BigInt is available and so are Buffer methods', () => {
      before(function () {
        if (
          typeof BigInt === 'undefined' ||
          typeof Buffer.prototype.writeBigInt64BE === 'undefined'
        ) {
          this.skip()
        }
      })

      it('Reading written-to buffer should read back the results of the insert', () => {
        const wBuffer = FileBufferSync.fromFile(file)
        wBuffer.writeBigInt64LE(BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2))
        wBuffer.writeBigInt64BE(BigInt(Number.MAX_SAFE_INTEGER) * BigInt(3))
        wBuffer.writeBigUInt64LE(BigInt(Number.MAX_SAFE_INTEGER) * BigInt(4))
        wBuffer.writeBigUInt64BE(BigInt(Number.MAX_SAFE_INTEGER) * BigInt(5))

        assert.equal(
          wBuffer.readBigInt64LE(),
          BigInt(Number.MAX_SAFE_INTEGER) * BigInt(2),
        )
        assert.equal(
          wBuffer.readBigInt64BE(),
          BigInt(Number.MAX_SAFE_INTEGER) * BigInt(3),
        )
        assert.equal(
          wBuffer.readBigUInt64LE(),
          BigInt(Number.MAX_SAFE_INTEGER) * BigInt(4),
        )
        assert.equal(
          wBuffer.readBigUInt64BE(),
          BigInt(Number.MAX_SAFE_INTEGER) * BigInt(5),
        )
      })
    })

    describe('When BigInt is available but buffer methods are not', () => {
      beforeEach(function () {
        if (
          typeof BigInt === 'undefined' ||
          typeof Buffer.prototype.readBigInt64BE === 'function'
        ) {
          this.skip()
        }
      })
      const buffer = FileBufferSync.fromFile(file)

      // Taking a Number to a BigInt as we do below is semantically invalid,
      // and implicit casting between Number and BigInt throws a TypeError in
      // JavaScript. However here, these methods immediately throw the platform
      // exception, and no cast really takes place. These casts are solely to
      // satisfy the type checker, as BigInt doesn't exist at runtime in these tests

      it('Writing throws an exception', () => {
        assert.throws(
          () => buffer.writeBigInt64LE(1 as any as bigint),
          'Platform does not support Buffer.prototype.writeBigInt64LE.',
        )
        assert.throws(
          () => buffer.writeBigInt64BE(2 as any as bigint),
          'Platform does not support Buffer.prototype.writeBigInt64BE.',
        )
        assert.throws(
          () => buffer.writeBigUInt64LE(1 as any as bigint),
          'Platform does not support Buffer.prototype.writeBigUInt64LE.',
        )
        assert.throws(
          () => buffer.writeBigUInt64BE(2 as any as bigint),
          'Platform does not support Buffer.prototype.writeBigUInt64BE.',
        )
      })

      it('Inserting throws an exception', () => {
        assert.throws(
          () => buffer.writeBigInt64LE(1 as any as bigint, 0),
          'Platform does not support Buffer.prototype.writeBigInt64LE.',
        )
        assert.throws(
          () => buffer.writeBigInt64BE(2 as any as bigint, 0),
          'Platform does not support Buffer.prototype.writeBigInt64BE.',
        )
        assert.throws(
          () => buffer.writeBigUInt64LE(1 as any as bigint, 0),
          'Platform does not support Buffer.prototype.writeBigUInt64LE.',
        )
        assert.throws(
          () => buffer.writeBigUInt64BE(2 as any as bigint, 0),
          'Platform does not support Buffer.prototype.writeBigUInt64BE.',
        )
      })

      it('Reading throws an exception', () => {
        assert.throws(
          () => buffer.readBigInt64LE(),
          'Platform does not support Buffer.prototype.readBigInt64LE.',
        )
        assert.throws(
          () => buffer.readBigInt64BE(),
          'Platform does not support Buffer.prototype.readBigInt64BE.',
        )
        assert.throws(
          () => buffer.readBigUInt64LE(),
          'Platform does not support Buffer.prototype.readBigUInt64LE.',
        )
        assert.throws(
          () => buffer.readBigUInt64BE(),
          'Platform does not support Buffer.prototype.readBigUInt64BE.',
        )
      })
    })

    describe('When BigInt is unavailable', () => {
      beforeEach(function () {
        if (typeof BigInt === 'function') {
          this.skip()
        }
      })
      const buffer = FileBufferSync.fromFile(file)

      // Taking a Number to a BigInt as we do below is semantically invalid,
      // and implicit casting between Number and BigInt throws a TypeError in
      // JavaScript. However here, these methods immediately throw the platform
      // exception, and no cast really takes place. These casts are solely to
      // satisfy the type checker, as BigInt doesn't exist at runtime in these tests

      it('Writing throws an exception', () => {
        assert.throws(
          () => buffer.writeBigInt64LE(1 as any as bigint),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.writeBigInt64BE(2 as any as bigint),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.writeBigUInt64LE(1 as any as bigint),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.writeBigUInt64BE(2 as any as bigint),
          'Platform does not support JS BigInt type.',
        )
      })

      it('Reading throws an exception', () => {
        assert.throws(
          () => buffer.readBigInt64LE(),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.readBigInt64BE(),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.readBigUInt64LE(),
          'Platform does not support JS BigInt type.',
        )
        assert.throws(
          () => buffer.readBigUInt64BE(),
          'Platform does not support JS BigInt type.',
        )
      })
    })
  })

  describe('Basic String Values', () => {
    let reader: FileBufferSync
    before(() => {
      reader = FileBufferSync.fromFile(file)
      reader.writeString('HELLO')
      reader.writeString('WORLD')
      reader.writeString('FIRST')
      reader.writeString('✎✏✎✏✎✏')
      reader.writeString('last')
      reader.writeString('first', 0)
      reader.writeString('hello', 'ascii')
      reader.writeString('world')
    })

    it('should equal the correct strings that were written prior', () => {
      assert.strictEqual(reader.readString(5), 'first')
      assert.strictEqual(reader.readString(5), 'hello')
      assert.strictEqual(reader.readString(5), 'world')
      assert.strictEqual(
        reader.readString(Buffer.from('✎✏✎✏✎✏').length),
        '✎✏✎✏✎✏',
      )
      assert.strictEqual(reader.readString(4, 'ascii'), 'last')
    })

    it('should throw an exception if passing in an invalid string length to read (infinite)', () => {
      assert.throws(() => {
        reader.readString(NaN)
      })
    })

    it('should throw an exception if passing in an invalid string length to read (negative)', () => {
      assert.throws(() => {
        reader.readString(-5)
      })
    })

    it('should throw an exception if passing in an invalid string offset to write (non number)', () => {
      assert.throws(() => {
        const invalidNumber: any = 'sdfdf'
        reader.writeString('hello', invalidNumber)
      })
    })
  })

  describe('Mixed Encoding Strings', () => {
    // const reader = SmartBuffer.fromOptions({
    //   encoding: 'ascii',
    // })
    const reader = FileBufferSync.fromFile(file)
    reader.writeStringNT('some ascii text')
    reader.writeStringNT('ѕσмє υтƒ8 тєχт', 'utf8')
    reader.writeStringNT('first', 0, 'ascii')

    it('should equal the correct strings that were written above', () => {
      assert.strictEqual(reader.readStringNT(), 'first')
      assert.strictEqual(reader.readStringNT(), 'some ascii text')
      assert.strictEqual(reader.readStringNT('utf8'), 'ѕσмє υтƒ8 тєχт')
    })

    it('should throw an error when an invalid encoding is provided', () => {
      assert.throws(() => {
        // tslint:disable-next-line
        const invalidBufferType: any = 'invalid'
        reader.writeString('hello', invalidBufferType)
      })
    })

    it('should throw an error when an invalid encoding is provided along with a valid offset', () => {
      assert.throws(() => {
        const invalidBufferType: any = 'invalid'
        reader.writeString('hellothere', 2, invalidBufferType)
      })
    })
  })

  describe('Null/non-null terminating strings', () => {
    const reader = FileBufferSync.fromFile(file)
    reader.writeString('hello\0test\0bleh')

    it('should equal hello', () => {
      assert.strictEqual(reader.readStringNT(), 'hello')
    })

    it('should equal: test', () => {
      assert.strictEqual(reader.readString(4), 'test')
    })

    it('should have a length of zero', () => {
      assert.strictEqual(reader.readStringNT().length, 0)
    })

    it('should return an empty string', () => {
      assert.strictEqual(reader.readString(0), '')
    })

    it('should equal: bleh', () => {
      assert.strictEqual(reader.readStringNT(), 'bleh')
    })
  })

  describe('Reading string without specifying length', () => {
    const str = 'hello123'
    const writer = FileBufferSync.fromFile(file)
    writer.writeStringNT(str)
    const log = startDebug()
    log('writer length:', writer.length)
    writer.close()
    log('file size:', fs.statSync(file).size)

    const reader = FileBufferSync.fromFile(file)

    assert.strictEqual(reader.readStringNT(), str)
  })

  describe('Write string as specific position', () => {
    const str = 'hello123'
    const writer = FileBufferSync.fromFile(file)
    writer.writeStringNT(str, 10)

    const reader = FileBufferSync.fromFile(file)

    reader.readOffset = 10
    it('Should read the correct string from the original position it was written to.', () => {
      assert.strictEqual(reader.readStringNT(), str)
    })
  })

  describe('Buffer Values', () => {
    describe('Writing buffer to position 0', () => {
      const frontBuff = Buffer.from([1, 2, 3, 4, 5, 6])
      let buff: FileBufferSync
      before(() => {
        buff = FileBufferSync.fromFile(file)
        buff.writeStringNT('hello')
        buff.writeBuffer(frontBuff, 0)
      })

      it('should write the buffer to the front of the smart buffer instance', () => {
        const readBuff = buff.readBuffer(frontBuff.length)
        assert.deepEqual(readBuff, frontBuff)
      })
    })

    describe('Writing null terminated buffer to position 0', () => {
      const frontBuff = Buffer.from([1, 2, 3, 4, 5, 6])
      let buff: FileBufferSync
      before(() => {
        buff = FileBufferSync.fromFile(file)
        buff.writeStringNT('hello')
        buff.writeBufferNT(frontBuff, 0)
      })

      it('should write the buffer to the front of the smart buffer instance', () => {
        const readBuff = buff.readBufferNT()
        assert.deepEqual(readBuff, frontBuff)
      })
    })

    describe('Explicit lengths', () => {
      const buff = Buffer.from([0x01, 0x02, 0x04, 0x08, 0x16, 0x32, 0x64])
      let reader: FileBufferSync
      before(() => {
        reader = FileBufferSync.fromFile(file)
        reader.writeBuffer(buff)
      })

      it('should equal the buffer that was written above.', () => {
        assert.deepEqual(reader.readBuffer(7), buff)
      })
    })

    describe('Implicit lengths', () => {
      const buff = Buffer.from([0x01, 0x02, 0x04, 0x08, 0x16, 0x32, 0x64])
      let reader: FileBufferSync
      before(() => {
        reader = FileBufferSync.fromFile(file)
        reader.writeBufferNT(buff)
      })

      it('should equal the buffer that was written above.', () => {
        assert.deepEqual(reader.readBufferNT(), buff)
      })
    })

    describe('Null Terminated Buffer Reading', () => {
      let read1: Buffer
      let read2: Buffer
      before(() => {
        const buff = FileBufferSync.fromFile(file)
        buff.writeBuffer(
          Buffer.from([0x01, 0x02, 0x03, 0x04, 0x00, 0x01, 0x02, 0x03]),
        )

        read1 = buff.readBufferNT()
        read2 = buff.readBufferNT()
      })

      it('Should return a length of 4 for the four bytes before the first null in the buffer.', () => {
        assert.equal(read1.length, 4)
      })

      it('Should return a length of 3 for the three bytes after the first null in the buffer after reading to end.', () => {
        assert.equal(read2.length, 3)
      })
    })

    describe('Null Terminated Buffer Writing', () => {
      const buff = FileBufferSync.fromFile(file)
      buff.writeBufferNT(new Buffer([0x01, 0x02, 0x03, 0x04]))

      const read1 = buff.readBufferNT()

      it('Should read the correct null terminated buffer data.', () => {
        assert.equal(read1.length, 4)
      })
    })

    describe('Reading buffer from invalid offset', () => {
      const buff = FileBufferSync.fromFile(file)
      buff.writeBuffer(Buffer.from([1, 2, 3, 4, 5, 6]))

      it('Should throw an exception if attempting to read a Buffer from an invalid offset', () => {
        assert.throws(() => {
          const invalidOffset: any = 'sfsdf'
          buff.readBuffer(invalidOffset)
        })
      })
    })

    describe('Writing values into specific positions', () => {
      let reader: FileBufferSync

      before(() => {
        reader = FileBufferSync.fromFile(file)

        reader.writeUInt16LE(0x0060)
        reader.writeStringNT('something')
        reader.writeUInt32LE(8485934)
        reader.writeUInt16LE(6699)
        reader.writeStringNT('else')
        reader.writeUInt16LE(reader.length - 2, 2)
      })

      it('should equal the size of the remaining data in the buffer', () => {
        reader.readUInt16LE()
        const size = reader.readUInt16LE()
        assert.strictEqual(reader.remaining, size - 2)
      })
    })

    describe('Adding more data to the buffer than the internal buffer currently allows.', () => {
      it('Should automatically adjust internal buffer size when needed', () => {
        const writer = FileBufferSync.fromFile(file)
        const largeBuff = Buffer.alloc(10000)

        writer.writeBuffer(largeBuff)

        assert.strictEqual(writer.length, largeBuff.length)
      })
    })
  })
})

describe('Skipping around data', () => {
  before(() => {
    const writer = FileBufferSync.fromFile(file)
    writer.writeStringNT('hello')
    writer.writeUInt16LE(6699)
    writer.writeStringNT('world!')
  })

  it('Should equal the UInt16 that was written above', () => {
    const reader = FileBufferSync.fromFile(file)
    reader.readOffset += 6
    assert.strictEqual(reader.readUInt16LE(), 6699)
    reader.readOffset = 0
    assert.strictEqual(reader.readStringNT(), 'hello')
    reader.readOffset -= 6
    assert.strictEqual(reader.readStringNT(), 'hello')
  })

  it('Should throw an error when attempting to skip more bytes than actually exist.', () => {
    const reader = FileBufferSync.fromFile(file)

    assert.throws(() => {
      reader.readOffset = 10000
    })
  })
})

describe('Setting write and read offsets', () => {
  let writer: FileBufferSync

  before(() => {
    writer = FileBufferSync.fromFile(file)
    writer.writeString('hellotheremynameisjosh')
  })

  it('should set the write offset to 10', () => {
    writer.writeOffset = 10
    assert.strictEqual(writer.writeOffset, 10)
  })

  it('should set the read offset to 10', () => {
    writer.readOffset = 10
    assert.strictEqual(writer.readOffset, 10)
  })

  it('should throw an error when given an offset that is out of bounds', () => {
    assert.throws(() => {
      writer.rewind(-1)
    })
  })

  it('should throw an error when given an offset that is out of bounds', () => {
    assert.throws(() => {
      writer.rewind(1000)
    })
  })
})

describe('Automatic internal buffer resizing', () => {
  it('Should not throw an error when adding data that is larger than current buffer size', () => {
    fs.writeFileSync(file, '')
    const writer = FileBufferSync.fromFile(file)
    const str = 'String larger than one byte'
    writer.writeString(str)

    assert.strictEqual(writer.length, str.length)
  })

  it('Should not throw an error when adding data that is larger than current buffer size', () => {
    fs.writeFileSync(file, '')
    const writer = FileBufferSync.fromFile(file)
    const buff = new Buffer(105)

    writer.writeBuffer(buff)

    assert.strictEqual(writer.length, buff.length)
  })
})

describe('Clearing the buffer', () => {
  const writer = FileBufferSync.fromFile(file)
  writer.writeString('somedata')

  it('Should contain some data.', () => {
    assert.notStrictEqual(writer.length, 0)
  })

  it('Should contain zero data after being cleared.', () => {
    writer.clear()
    assert.strictEqual(writer.length, 0)
  })
})

describe('Displaying the buffer as a string', () => {
  const buff = Buffer.from([1, 2, 3, 4])
  const str = buff.toString('binary')
  const str64 = buff.toString('base64')
  let sbuff: FileBufferSync

  beforeEach(() => {
    fs.writeFileSync(file, buff)
    sbuff = FileBufferSync.fromFile(file)
  })

  it('Should return a valid string representing the internal buffer', () => {
    assert.strictEqual(str, sbuff.toString('binary'))
  })

  it('Should return a valid base64 string representing the internal buffer', () => {
    assert.strictEqual(str64, sbuff.toString('base64'))
  })

  it('Should throw an error if an invalid encoding is provided', () => {
    assert.throws(() => {
      const invalidencoding: any = 'invalid'
      const strError = sbuff.toString(invalidencoding)
      console.log(strError)
    })
  })
})

describe('Closing the buffer', () => {
  const value = 'hello123'

  before(() => {
    const writer = FileBufferSync.fromFile(file)
    writer.writeString(value)

    writer.close()
  })

  it('Should have a length of data size when buffer is closed', () => {
    assert.strictEqual(fs.statSync(file).size, value.length)
  })
})

describe('utils', () => {
  describe('ensureEnoughRead', () => {
    it('should not throw error when enough read', function () {
      ensureEnoughRead(10, 10)
    })
    it('should throw error when not enough read', function () {
      assert.throws(() => ensureEnoughRead(0, 10))
      assert.throws(() => ensureEnoughRead(8, 10))
    })
  })

  describe('ensureEnoughWrite', () => {
    it('should not throw error when enough write', function () {
      ensureEnoughWrite(10, 10)
    })
    it('should throw error when not enough write', function () {
      assert.throws(() => ensureEnoughWrite(0, 10))
      assert.throws(() => ensureEnoughWrite(8, 10))
    })
  })

  describe('expandArguments', () => {
    it('should return empty object when no offset nor encoding', function () {
      assert.deepEqual(expandArguments([], 0), {
        encoding: undefined,
        offset: undefined,
      })
    })
    it('should parse offset', function () {
      assert.deepEqual(expandArguments([10], 0), {
        encoding: undefined,
        offset: 10,
      })
    })
    it('should parse encoding', function () {
      assert.deepEqual(expandArguments(['ascii'], 0), {
        encoding: 'ascii',
        offset: undefined,
      })
    })
    it('should parse both offset and encoding', function () {
      assert.deepEqual(expandArguments([10, 'ascii'], 0), {
        encoding: 'ascii',
        offset: 10,
      })
      assert.deepEqual(expandArguments(['ascii', 10], 0), {
        encoding: 'ascii',
        offset: 10,
      })
    })
  })
})
