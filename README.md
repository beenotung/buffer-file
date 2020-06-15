# file-buffer

A file-based Buffer wrapper that adds automatic read & write offset tracking, string operations, and more.

[![npm Package Version](https://img.shields.io/npm/v/file-buffer.svg?maxAge=2592000)](https://www.npmjs.com/package/file-buffer)

**Key Features**:
* Proxies all of the Buffer write and read functions
* Keeps track of read and write offsets automatically
* Grows the underneath File as needed
* Useful string operations. (Null terminating strings)
* Allows for reading/writing values at specific points in the File (random access)
* Built in TypeScript (with Type Definitions)
* Full test coverage

**Requirements**:
* sync mode works since Node v0.1.21+
* async mode works since Node v10.0+

## Tests
- [x] sequential read/write objects with msgpack
- [ ] full test suit based on smart-buffer
