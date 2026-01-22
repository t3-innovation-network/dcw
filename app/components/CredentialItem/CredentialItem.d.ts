import { CredentialRecordRaw } from '../../model'
import { Credential } from '../../types/credential'
import { VerificationResult } from '../../lib/verifiableObject'

export type CredentialItemProps = {
  onSelect: () => void
  credential: Credential
  checkable?: boolean
  selected?: boolean
  selectionVariant?: 'checkbox' | 'radio'
  chevron?: boolean
  bottomElement?: React.ReactNode
  hideLeft?: boolean
  rawCredentialRecord?: CredentialRecordRaw
  showStatusBadges?: boolean
  precomputedVerification?: VerificationResult
  precomputedPublic?: boolean
  onPressDisabled?: boolean
}
