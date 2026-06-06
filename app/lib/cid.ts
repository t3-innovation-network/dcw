import { canonicalize as jcsCanonicalize } from 'json-canonicalize'
import { sha256 } from '@noble/hashes/sha2.js'

export async function cidFrom({ doc }: { doc: object }): Promise<string> {
  const canonicalized = jcsCanonicalize(doc)
  const hash = sha256(new TextEncoder().encode(canonicalized))
  return Buffer.from(hash).toString('base64url')
}
