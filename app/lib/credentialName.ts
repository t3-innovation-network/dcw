import { IVerifiableCredential } from '@interop/data-integrity-core'
import { getSubject } from './credentialDisplay/shared/utils/credentialSubject'
import { asNonEmptyString } from './credentialDisplay/shared/utils/presentation'
import {
  isEmploymentCredential,
  isVolunteerCredential
} from './credentialTypes'

/**
 * Extracts the credential name from a verifiable credential
 * @param credential The verifiable credential object
 * @returns The credential name or 'Unknown Credential' if not found
 */
export function getCredentialName(credential: IVerifiableCredential): string {
  const isRecommendationCredential = credential?.type?.includes?.(
    'https://schema.org/RecommendationCredential'
  )
  const isPerformanceReviewCredential = credential?.type?.includes?.(
    'PerformanceReviewCredential'
  )
  const isSkillClaimCredential = credential?.type?.includes?.(
    'SkillClaimCredential'
  )

  const credentialSubject = getSubject(credential)

  if (isRecommendationCredential) {
    return credentialSubject.name
      ? `Recommendation From ${credentialSubject.name}`
      : 'Recommendation Credential'
  }

  if (isPerformanceReviewCredential) {
    const employeeName = asNonEmptyString(credentialSubject?.employeeName)
    return employeeName
      ? `Performance Review: ${employeeName}`
      : 'Performance Review Credential'
  }

  if (isSkillClaimCredential) {
    const skills = (credentialSubject as { skill?: Array<{ name?: unknown }> })
      ?.skill
    const firstSkill = Array.isArray(skills) ? skills[0] : skills
    const skillName = asNonEmptyString(firstSkill?.name)
    return skillName ?? 'Unknown Skill'
  }

  if (isEmploymentCredential(credential)) {
    const fullName = asNonEmptyString(credentialSubject?.fullName)
    const company = asNonEmptyString(credentialSubject?.company)
    if (fullName && company) return `Employment: ${fullName} @ ${company}`
    if (fullName) return `Employment: ${fullName}`
    return 'Employment Credential'
  }

  if (isVolunteerCredential(credential)) {
    const fullName = asNonEmptyString(credentialSubject?.fullName)
    const volunteerOrg = asNonEmptyString(credentialSubject?.volunteerOrg)
    if (fullName && volunteerOrg)
      return `Volunteer: ${fullName} @ ${volunteerOrg}`
    if (fullName) return `Volunteer: ${fullName}`
    return 'Volunteer Credential'
  }

  let achievement =
    credentialSubject.hasCredential ?? credentialSubject.achievement

  if (Array.isArray(achievement)) {
    achievement = achievement[0]
  }

  return achievement?.name || credential.skill?.name || 'Unknown Credential'
}
