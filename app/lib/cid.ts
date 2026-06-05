import { canonicalize as jcsCanonicalize } from 'json-canonicalize'
import { createHash } from 'crypto'

function bufferToBase64Url(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function cidFrom({ doc }: { doc: object }): Promise<string> {
  const canonicalized = JSON.stringify(jcsCanonicalize(doc))
  const hash = createHash('sha256').update(canonicalized).digest()
  return bufferToBase64Url(hash)
}
