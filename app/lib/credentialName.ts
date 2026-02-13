import { IVerifiableCredential } from '@digitalcredentials/ssi'
import { getSubject } from './credentialDisplay/shared/utils/credentialSubject'

/**
 * Extracts the credential name from a verifiable credential
 * @param credential The verifiable credential object
 * @returns The credential name or 'Unknown Credential' if not found
 */
export function getCredentialName(credential: IVerifiableCredential): string {
  const isRecommendationCredential = credential?.type?.includes?.(
    'https://schema.org/RecommendationCredential'
  )
  const credentialSubject = getSubject(credential)

  if (isRecommendationCredential) {
    return credentialSubject.name
      ? `Recommendation From ${credentialSubject.name}`
      : 'Recommendation Credential'
  }

  let achievement =
    credentialSubject.hasCredential ?? credentialSubject.achievement

  if (Array.isArray(achievement)) {
    achievement = achievement[0]
  }

  return achievement?.name ?? 'Unknown Credential'
}
