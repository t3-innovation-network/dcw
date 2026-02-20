import { CredentialDisplayConfig, ResolvedCredentialItemProps } from './index.d'
import { openBadgeCredentialDisplayConfig } from './openBadgeCredential'
import { performanceReviewCredentialDisplayConfig } from './performanceReviewCredential'
import { recommendationCredentialDisplayConfig } from './recommendationCredential'

import { studentIdDisplayConfig } from './studentId'
import { universityDegreeCredentialDisplayConfig } from './universityDegreeCredential'
import { verifiableCredentialDisplayConfig } from './verifiableCredential'
import { IVerifiableCredential } from '@digitalcredentials/ssi'

export * from './index.d'

const credentialDisplayConfigs: CredentialDisplayConfig[] = [
  studentIdDisplayConfig,
  universityDegreeCredentialDisplayConfig,
  openBadgeCredentialDisplayConfig,
  recommendationCredentialDisplayConfig,
  performanceReviewCredentialDisplayConfig,
  verifiableCredentialDisplayConfig
]

export function credentialDisplayConfigFor(
  credential: IVerifiableCredential
): CredentialDisplayConfig {
  let config = credentialDisplayConfigs.find(({ credentialType }) =>
    credential.type.includes(credentialType)
  )
  if (credential.type.includes('AchievementCredential'))
    config = openBadgeCredentialDisplayConfig
  if (credential.type.includes('RecommendationCredential'))
    config = recommendationCredentialDisplayConfig
  if (
    (Array.isArray(credential.type) ? credential.type : [credential.type]).some(
      (t) => t === 'PerformanceReviewCredential'
    )
  )
    config = performanceReviewCredentialDisplayConfig
  if (!config) throw new Error('Unrecognized credential type')

  const { credentialType, cardComponent, itemPropsResolver } = config

  return {
    credentialType,
    cardComponent,
    itemPropsResolver
  }
}

export function credentialItemPropsFor(
  credential: IVerifiableCredential
): ResolvedCredentialItemProps {
  const { itemPropsResolver } = credentialDisplayConfigFor(credential)
  return itemPropsResolver(credential)
}
