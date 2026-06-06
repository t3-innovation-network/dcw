// Used in @digitalcredentials/vc-status-list
import { Buffer } from 'buffer'

import * as ExpoCrypto from 'expo-crypto'

// eslint-disable-next-line no-undef
global.Buffer = Buffer

// Provide a real WebCrypto `subtle.digest` (backed by expo-crypto) for libraries
// that call `globalThis.crypto.subtle.digest` in React Native -- notably
// rdf-canonize's `MessageDigest-webcrypto.js` (reached via jsonld
// canonicalization during eddsa-rdfc-2022 proof signing/verification). Do not
// clobber `global.crypto`: `react-native-get-random-values` (imported right
// after this shim in index.js) installs `getRandomValues` onto the same object.
// eslint-disable-next-line no-undef
global.crypto = global.crypto || {}

const subtle = {
  digest: async (algorithm, data) => {
    const actualAlgorithm =
      typeof algorithm === 'string' ? algorithm : algorithm.name

    // Ensure data is a Uint8Array
    let inputData
    if (typeof data === 'string') {
      inputData = new TextEncoder().encode(data) // Convert string to Uint8Array
    } else if (ArrayBuffer.isView(data)) {
      inputData = new Uint8Array(data.buffer) // Convert TypedArray
    } else if (data instanceof ArrayBuffer) {
      inputData = new Uint8Array(data) // Convert ArrayBuffer
    } else {
      throw new Error(
        'Unsupported data format passed to crypto.subtle.digest()'
      )
    }

    return ExpoCrypto.digest(actualAlgorithm.toUpperCase(), inputData)
  }
}

global.crypto.subtle = global.crypto.subtle || subtle

if (typeof btoa === 'undefined') {
  globalThis.btoa = (str) => Buffer.from(str, 'binary').toString('base64')
}
