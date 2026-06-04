import {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'

export function credentialsFromPresentation(
  vp: IVerifiablePresentation
): IVerifiableCredential[] {
  const { verifiableCredential } = vp
  return ([] as IVerifiableCredential[]).concat(verifiableCredential!)
}
