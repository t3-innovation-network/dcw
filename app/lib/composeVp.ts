import { ISelectedProfile } from './did'
import {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'
import * as vc from '@interop/vc'
import { securityLoader } from '@interop/security-document-loader'
import { presentationSuiteFor } from './presentationSuite'

const documentLoader = securityLoader({ fetchRemoteContexts: true }).build()

/**
 * Creates a Verifiable Presentation, to send back to the
 * requester (an Exchanger instance).
 * The VP is signed if DID Auth was requested, and unsigned otherwise.
 */
export async function composeVp({
  selectedProfile,
  selectedVcs = [],
  challenge,
  domain,
  didAuthRequested,
  cryptosuite
}: {
  selectedProfile: ISelectedProfile
  selectedVcs?: IVerifiableCredential[]
  challenge?: string
  domain?: string
  didAuthRequested: boolean
  cryptosuite?: string
}): Promise<IVerifiablePresentation> {
  if (!didAuthRequested && selectedVcs!.length === 0) {
    throw new Error('A VP requires either credentials or a DID Auth request.')
  }
  if (didAuthRequested && !(challenge && domain)) {
    throw new Error('Both "challenge" and "domain" are required for DID Auth.')
  }

  if (!didAuthRequested) {
    // Return an unsigned VP
    // Use verify: false to skip validation (including expiration checks)
    // The VC library 10.0.2+ properly handles this flag
    return await vc.createPresentation({
      verifiableCredential: selectedVcs,
      verify: false,
      version: 1.0
    })
  }

  // Sign with the cryptosuite the verifier requested (via VCALM
  // `acceptedCryptosuites`), falling back to the wallet default. The suite
  // dictates the VC data model version: eddsa-rdfc-2022 proofs require VC 2.0,
  // the default Ed25519Signature2020 proof uses VC 1.0.
  const { suite, version } = presentationSuiteFor({
    signer: selectedProfile.signers.authentication,
    cryptosuite
  })

  // Return a signed VP
  // Use verify: false to skip validation (including expiration checks)
  // The VC library 10.0.2+ properly handles this flag
  const presentation = await vc.createPresentation({
    holder: selectedProfile.did,
    verifiableCredential: selectedVcs!.length > 0 ? selectedVcs : undefined,
    verify: false,
    version
  })

  return await vc.signPresentation({
    presentation,
    challenge,
    domain,
    documentLoader,
    suite
  })
}
