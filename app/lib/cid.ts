import { canonicalize as jcsCanonicalize } from 'json-canonicalize'
import { sha256 } from '@noble/hashes/sha2.js'
import { base64urlnopad } from '@scure/base'

// RN's Buffer polyfill lacks 'base64url' encoding, so use @scure/base's
// base64urlnopad coder instead of rolling our own. See AGENTS.md.
export async function cidFrom({ doc }: { doc: object }): Promise<string> {
  const canonicalized = jcsCanonicalize(doc)
  const hash = sha256(new TextEncoder().encode(canonicalized))
  return base64urlnopad.encode(hash)
}
