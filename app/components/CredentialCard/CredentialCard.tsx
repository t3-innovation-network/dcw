import React from 'react'
import { credentialDisplayConfigFor } from '../../lib/credentialDisplay'
import { CredentialRecordRaw } from '../../model'

export type CredentialCardProps = {
  rawCredentialRecord: CredentialRecordRaw
  onPressIssuer?: (issuerId: string, verifyCredentialNew?: any) => void
}

export default function CredentialCard(
  props: CredentialCardProps
): React.ReactElement {
  const { credential } = props.rawCredentialRecord
  const DisplayComponent = credentialDisplayConfigFor(credential).cardComponent

  return <DisplayComponent {...props} />
}
