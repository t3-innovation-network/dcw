import { CredentialDisplayConfig, ResolvedCredentialItemProps } from './index.d'
import { openBadgeCredentialDisplayConfig } from './openBadgeCredential'
import { employmentCredentialDisplayConfig } from './employmentCredential'
import { performanceReviewCredentialDisplayConfig } from './performanceReviewCredential'
import { recommendationCredentialDisplayConfig } from './recommendationCredential'

import { studentIdDisplayConfig } from './studentId'
import { universityDegreeCredentialDisplayConfig } from './universityDegreeCredential'
import { verifiableCredentialDisplayConfig } from './verifiableCredential'
import { IVerifiableCredential } from '@digitalcredentials/ssi'
import { isEmploymentCredential } from '../credentialTypes'

export * from './index.d'

const credentialDisplayConfigs: CredentialDisplayConfig[] = [
  studentIdDisplayConfig,
  universityDegreeCredentialDisplayConfig,
  openBadgeCredentialDisplayConfig,
  employmentCredentialDisplayConfig,
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

  if (credential.type.includes('PerformanceReviewCredential'))
    config = performanceReviewCredentialDisplayConfig

  if (isEmploymentCredential(credential))
    config = employmentCredentialDisplayConfig

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
