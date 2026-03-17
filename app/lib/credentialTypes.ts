import {
  ICredentialSubject,
  IVerifiableCredential
} from '@digitalcredentials/ssi'

export const isResumeCredential = (
  credentialSubject: ICredentialSubject
): boolean => {
  const t = credentialSubject?.type
  const types = Array.isArray(t) ? t : t ? [t] : []
  return types.some(
    (x: string) =>
      x === 'Resume' ||
      (typeof x === 'string' && x.toLowerCase().includes('resume'))
  )
}

export const isEmploymentCredential = (
  credential: IVerifiableCredential
): boolean => {
  return credential?.type?.includes?.('EmploymentCredential')
}
