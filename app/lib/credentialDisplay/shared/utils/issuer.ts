import { imageSourceFrom } from './image'
import {
  IIssuerObject,
  IVerifiableCredential
} from '@interop/data-integrity-core'
import { getSubject } from './credentialSubject'
import { asNonEmptyString } from './presentation'

type IssuerInfo = {
  issuerName: string | null
  issuerUrl: string | null
  issuerId: string | null
  issuerImage: string | null
}

type VerifyCredentialResult = {
  log?: Array<{
    id: string
    matchingIssuers?: any[]
  }>
}

/** Person name from credentialSubject.person (SkillClaimCredential) for issuer display override */
export function personNameFromCredential(
  credential?: IVerifiableCredential
): string | null {
  if (!credential) return null
  const subject = getSubject(credential)
  return (
    asNonEmptyString(
      (subject as { person?: { name?: unknown } })?.person?.name
    ) ?? null
  )
}

export function issuerRenderInfoWithVerification(
  issuer: IIssuerObject,
  verifyResult?: VerifyCredentialResult,
  credential?: IVerifiableCredential
): IssuerInfo {
  const isSkillClaimCredential = credential?.type?.includes?.(
    'SkillClaimCredential'
  )
  const personName = isSkillClaimCredential
    ? personNameFromCredential(credential)
    : null

  const registeredIssuerLog = verifyResult?.log?.find(
    (log) => log.id === 'registered_issuer'
  )

  const matchingIssuer = registeredIssuerLog?.matchingIssuers?.[0]

  if (matchingIssuer?.issuer?.federation_entity && !personName) {
    const federationEntity = matchingIssuer.issuer.federation_entity
    return {
      issuerName: federationEntity.organization_name ?? '',
      issuerUrl: federationEntity.homepage_uri ?? '',
      issuerId: typeof issuer === 'string' ? null : (issuer?.id ?? ''),
      issuerImage:
        typeof issuer === 'object' ? imageSourceFrom(issuer.image) : null
    }
  }

  // Fallback to existing logic (or person name for SkillClaimCredential)
  const fallback = issuerRenderInfoFrom(issuer)
  return {
    issuerName: personName ?? fallback.issuerName ?? '',
    issuerUrl: fallback.issuerUrl ?? '',
    issuerId: fallback.issuerId ?? '',
    issuerImage:
      matchingIssuer?.issuer?.federation_entity?.logo_uri ??
      fallback.issuerImage ??
      ''
  }
}

export function issuerRenderInfoFrom(
  issuer: IIssuerObject | string,
  credential?: IVerifiableCredential
): IssuerInfo {
  const isSkillClaimCredential = credential?.type?.includes?.(
    'SkillClaimCredential'
  )
  const personName = isSkillClaimCredential
    ? personNameFromCredential(credential)
    : null

  const issuerName =
    personName ?? (typeof issuer === 'string' ? issuer : issuer?.name) ?? null
  const issuerUrl = (typeof issuer === 'string' ? null : issuer?.url) ?? null
  const issuerId = typeof issuer === 'string' ? null : issuer?.id
  const issuerImage =
    typeof issuer === 'string' ? null : imageSourceFrom(issuer.image)

  return {
    issuerName,
    issuerUrl,
    issuerId,
    issuerImage
  }
}
