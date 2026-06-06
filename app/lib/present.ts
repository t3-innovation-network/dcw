import uuid from 'react-native-uuid'
import * as vc from '@interop/vc'
import { Ed25519VerificationKey } from '@interop/ed25519-verification-key'

import type { DidRecordRaw } from '../model/did'

import { securityLoader } from '@interop/security-document-loader'
import { presentationSuiteFor } from './presentationSuite'
import { shareData } from './shareData'
import {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build()

type SignPresentationParams = {
  didRecord: DidRecordRaw
  verifiableCredential?: IVerifiableCredential[] | IVerifiableCredential
  challenge?: string
  cryptosuite?: string
}

/**
 * Creates a Verifiable Presentation, signed with the provided DID record.
 * If one or more VCs are provided, they're included in the presentation.
 * (An "empty" VP, without any VCs, is used for DID Authentication.)
 *
 * A challenge (called a 'nonce' in some protocols) is optionally used when a
 * Relying Party (RP/requester) is requesting one or more VCs, to prevent
 * replay attacks.
 */
export async function createVerifiablePresentation({
  didRecord,
  verifiableCredential,
  challenge = uuid.v4() as string,
  cryptosuite
}: SignPresentationParams): Promise<IVerifiablePresentation> {
  const verificationKeyPair = await Ed25519VerificationKey.from(
    didRecord.verificationKey
  )
  // The suite dictates the VC data model version: eddsa-rdfc-2022 proofs
  // require VC 2.0, the default Ed25519Signature2020 proof uses VC 1.0.
  const { suite, version } = presentationSuiteFor({
    signer: verificationKeyPair.signer(),
    cryptosuite
  })

  const holder = didRecord.didDocument.id

  // Use verify: false to skip validation (including expiration checks)
  // The VC library 10.0.2+ properly handles this flag
  const presentation = vc.createPresentation({
    verifiableCredential,
    holder,
    verify: false,
    version
  })

  return await vc.signPresentation({
    presentation,
    suite,
    challenge,
    documentLoader
  })
}

export function createUnsignedPresentation(
  verifiableCredential: IVerifiableCredential[] | IVerifiableCredential
): IVerifiablePresentation {
  // Use verify: false to skip validation (including expiration checks)
  // The VC library 10.0.2+ properly handles this flag
  return vc.createPresentation({
    verifiableCredential,
    verify: false,
    version: 1.0
  })
}

export async function sharePresentation(
  verifiablePresentation: IVerifiablePresentation
): Promise<void> {
  const { verifiableCredential } = verifiablePresentation
  const plurality =
    verifiableCredential instanceof Array && verifiableCredential.length > 1
      ? 's'
      : ''

  const verifiablePresentationString = JSON.stringify(
    verifiablePresentation,
    null,
    2
  )

  await shareData(
    `SharedCredential${plurality}.txt`,
    verifiablePresentationString
  )
}
