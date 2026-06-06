import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex, utf8ToBytes } from '@noble/hashes/utils.js'
import { canonicalize as jcsCanonicalize } from 'json-canonicalize'
import { IVerifiableCredential } from '@interop/data-integrity-core'

export function canonicalCredentialJson(
  credential: IVerifiableCredential
): string {
  return JSON.stringify(jcsCanonicalize(credential))
}

export function credentialContentHash(
  credential: IVerifiableCredential
): string {
  const json = canonicalCredentialJson(credential)
  return bytesToHex(sha256(utf8ToBytes(json)))
}
