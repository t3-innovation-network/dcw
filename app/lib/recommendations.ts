import { CredentialRecord } from '../model/credential'
import { getSubject } from './credentialDisplay/shared'

export async function getRecommendationsForVC(vcId: string) {
  const vcs = await CredentialRecord.getAllCredentialRecords()
  const recommendations = vcs.filter((vc) => {
    const credentialSubject = getSubject(vc.credential)
    return credentialSubject.id === vcId
  })
  return recommendations
}
