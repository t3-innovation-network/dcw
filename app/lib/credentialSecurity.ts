import type { ResultLog } from './validate'

type VerificationResultLike =
  | {
      log?: ResultLog[]
    }
  | null
  | undefined

function issuerRecognizedByVerification(
  verificationResult?: VerificationResultLike
): boolean {
  if (!Array.isArray(verificationResult?.log)) {
    return false
  }

  return verificationResult.log.some((entry) => {
    if (entry.id !== 'registered_issuer') return false
    const matchingIssuers = (
      entry as ResultLog & { matchingIssuers?: unknown[] }
    ).matchingIssuers
    return entry.valid && Array.isArray(matchingIssuers)
      ? matchingIssuers.length > 0
      : entry.valid
  })
}

/**
 * Determines whether URLs should be disabled for a credential.
 *
 * Purely verification-driven (and synchronous): an issuer is trusted only when
 * the verification result's `registered_issuer` log entry confirms a registry
 * match. Anything else -- unknown, still loading, or an error -- disables URLs
 * (the safe default).
 */
export function shouldDisableUrls(
  verificationResult?: VerificationResultLike
): boolean {
  try {
    return !issuerRecognizedByVerification(verificationResult)
  } catch (error) {
    console.error('Error in shouldDisableUrls:', error)
    return true // Default to safe mode
  }
}
