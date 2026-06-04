import { createHash } from 'crypto'
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
  return createHash('sha256').update(json).digest('hex')
}
