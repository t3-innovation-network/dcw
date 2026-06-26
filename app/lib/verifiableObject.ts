import { LruCache } from '@interop/lru-memoize'
import {
  isVerifiableCredential,
  isVerifiablePresentation,
  ResultLog,
  verifyCredential
} from './validate'
import { CredentialRecordRaw } from '../model'
import {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'

/**
 * This type is used to identify a request response that could be a
 * Verifiable Credential or Verifiable Presentation.
 */
export type VerifiableObject = IVerifiableCredential | IVerifiablePresentation

export function extractCredentialsFrom(
  obj: IVerifiableCredential | IVerifiablePresentation
): IVerifiableCredential[] | null {
  if (isVerifiableCredential(obj)) {
    return [obj]
  }
  if (isVerifiablePresentation(obj) && 'verifiableCredential' in obj) {
    const verifiableCredential = obj.verifiableCredential!

    if (Array.isArray(verifiableCredential)) {
      return verifiableCredential
    }
    return [verifiableCredential]
  }

  return null
}

/* Cache verification results briefly to avoid duplicate UI verification work. */
const VERIFICATION_CACHE_TTL_MINUTES = 15
const lruCache = new LruCache({
  ttl: VERIFICATION_CACHE_TTL_MINUTES * 60 * 1000
})

/**
 * Clears all memoized verification results, forcing the next verification of
 * each credential to run fresh. Backs the developer "Clear verification cache"
 * action.
 */
export function clearVerificationCache(): void {
  lruCache.cache.clear()
}

export type VerificationResult = {
  timestamp: number | null
  log: ResultLog[]
  verified: boolean | null
  error?: Error
}

export type VerifyPayload = {
  loading: boolean
  error: string | null
  result: VerificationResult
}

export async function verificationResultFor({
  rawCredentialRecord,
  forceFresh = false
}: {
  rawCredentialRecord: CredentialRecordRaw
  forceFresh?: boolean
}): Promise<VerificationResult> {
  const cachedRecordId = String(rawCredentialRecord._id)

  if (!forceFresh) {
    const cachedResult = (await lruCache.memoize({
      key: cachedRecordId,
      fn: () => {
        return verifyCredential(rawCredentialRecord.credential)
      }
    })) as unknown as VerificationResult
    return cachedResult
  }

  let response, error
  try {
    response = await verifyCredential(rawCredentialRecord.credential)
  } catch (err) {
    error = err as Error
  }

  const result: VerificationResult = {
    verified: response?.verified ?? false,
    log: response?.results ? response.results[0].log : [],
    timestamp: Date.now(),
    error
  }

  return result
}
