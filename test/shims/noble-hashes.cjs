// CJS shim for @noble/hashes (v2 is ESM-only / "type": "module", which jest's
// CommonJS runtime cannot load). Mapped in via jest.config.ts moduleNameMapper.
// Implemented with Node's real `crypto` so tests exercise genuine hashing/KDF.
const nodeCrypto = require('crypto')

function makeHash(algName) {
  const fn = (data) =>
    new Uint8Array(nodeCrypto.createHash(algName).update(Buffer.from(data)).digest())
  fn.algName = algName
  return fn
}

const sha256 = makeHash('sha256')
const sha512 = makeHash('sha512')

// Mirrors @noble's pbkdf2(hash, password, salt, { c, dkLen }) signature.
function pbkdf2(hash, password, salt, opts) {
  const pass = typeof password === 'string' ? Buffer.from(password, 'utf8') : Buffer.from(password)
  const slt = typeof salt === 'string' ? Buffer.from(salt, 'utf8') : Buffer.from(salt)
  return new Uint8Array(
    nodeCrypto.pbkdf2Sync(pass, slt, opts.c, opts.dkLen ?? 32, hash.algName)
  )
}

function randomBytes(length = 32) {
  return new Uint8Array(nodeCrypto.randomBytes(length))
}

function bytesToHex(bytes) {
  return Buffer.from(bytes).toString('hex')
}

function utf8ToBytes(str) {
  return new Uint8Array(Buffer.from(str, 'utf8'))
}

module.exports = { sha256, sha512, pbkdf2, randomBytes, bytesToHex, utf8ToBytes }
