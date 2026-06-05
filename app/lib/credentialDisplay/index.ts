import { ComponentType } from 'react'
import type { CredentialCardProps } from '../../components/CredentialCard/CredentialCard'
import { openBadgeCredentialDisplayConfig } from './openBadgeCredential'
import { employmentCredentialDisplayConfig } from './employmentCredential'
import { performanceReviewCredentialDisplayConfig } from './performanceReviewCredential'
import { recommendationCredentialDisplayConfig } from './recommendationCredential'
import { volunteerCredentialDisplayConfig } from './volunteerCredential'

import { studentIdDisplayConfig } from './studentId'
import { universityDegreeCredentialDisplayConfig } from './universityDegreeCredential'
import { verifiableCredentialDisplayConfig } from './verifiableCredential'
import { IVerifiableCredential } from '@interop/data-integrity-core'
import {
  isEmploymentCredential,
  isVolunteerCredential
} from '../credentialTypes'

export type { CredentialCardProps }

export type ResolvedCredentialItemProps = {
  title: string | null
  subtitle: string | null
  image: string | null
}

export type CredentialDisplayConfig = {
  credentialType: string
  cardComponent: ComponentType<CredentialCardProps>
  itemPropsResolver: (
    credential: IVerifiableCredential
  ) => ResolvedCredentialItemProps
}

const credentialDisplayConfigs: CredentialDisplayConfig[] = [
  studentIdDisplayConfig,
  universityDegreeCredentialDisplayConfig,
  openBadgeCredentialDisplayConfig,
  employmentCredentialDisplayConfig,
  volunteerCredentialDisplayConfig,
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

  if (isVolunteerCredential(credential))
    config = volunteerCredentialDisplayConfig

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
