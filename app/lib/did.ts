import { driver } from '@interop/did-method-key'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'
import {
  IDidDocument,
  ISigner,
  IVerificationKeyPair2020
} from '@interop/data-integrity-core'

import { CredentialRecordRaw } from '../types/credential'

export type AddDidRecordParams = {
  didDocument: IDidDocument
  verificationKey: IVerificationKeyPair2020
}

/**
 * Generates a new DID Document from a new key pair (used when creating a
 * new profile).
 */
export async function mintDid({
  seed
}: {
  seed: Uint8Array
}): Promise<AddDidRecordParams> {
  const didKeyDriver = driver()
  didKeyDriver.use({ keyPairClass: Ed25519VerificationKey })

  const { didDocument, methodFor } = await didKeyDriver.generate({ seed })

  const verificationKeyPair = methodFor({
    purpose: 'assertionMethod'
  }) as Ed25519VerificationKey

  return {
    didDocument,
    verificationKey: verificationKeyPair.toVerificationKey2020({
      publicKey: true,
      privateKey: true
    }) as IVerificationKeyPair2020
  }
}

export interface IProfileSigners {
  authentication: ISigner
  assertion: ISigner
  zcapDelegation: ISigner
  zcapInvocation: ISigner
}

export interface ISelectedProfile {
  did: string
  name: string
  signers: IProfileSigners
  loadCredentials: () => Promise<CredentialRecordRaw[]>
}
