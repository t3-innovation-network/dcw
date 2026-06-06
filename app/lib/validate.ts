/**
 * Credential verification against the DCC Known Registries.
 *
 * Adapter over `@interop/verifier-core`: a single `verifyCredential` call runs
 * the fork's default suite pipeline plus two custom suites (`expirationSuite`,
 * `issuerDetailsSuite`), then translates the unified
 * `CredentialVerificationResult` back into dcw's legacy `VerifyResponse` (the
 * flat `log[]` shape) so the view layer (`VerificationStatusCard`,
 * `IssuerInfoScreen`, `issuer.ts`, the status badges) stays unchanged.
 *
 * Rich issuer recognition is sourced from the shared, cached `registryManager`
 * (via `issuerDetailsSuite`), so the fork's default boolean `registry` suite is
 * disabled here by passing `registries: []` -- we only consume the custom
 * suite's payload, and a second lookup would be redundant.
 *
 * Notable special case: if the revocation check fails because the referenced
 * status list could not be fetched (`STATUS_LIST_NOT_FOUND`), that row is
 * dropped and the credential is not treated as revoked (the status list simply
 * isn't published).
 */
import { CredentialError, PresentationError } from '../types/credential'
import {
  verifyCredential as coreVerify,
  verifyPresentation as coreVerifyPresentation,
  ProblemTypes
} from '@interop/verifier-core'
import type {
  CredentialVerificationResult,
  CheckResult
} from '@interop/verifier-core'
import type {
  IVerifiableCredential,
  IVerifiablePresentation
} from '@interop/data-integrity-core'
import type { VerifiableObject } from './verifiableObject'
import { expirationSuite } from './verifierSuites/expirationSuite'
import { issuerDetailsSuite } from './verifierSuites/issuerDetailsSuite'

export type ResultLog = {
  id: string
  valid: boolean
  error?: any
  matchingIssuers?: any[]
}

export type Result = {
  verified: boolean
  credential?: IVerifiableCredential
  error?: any
  log: ResultLog[]
}

export type VerifyResponse = {
  verified: boolean
  credential?: IVerifiableCredential
  log?: ResultLog[]
  results: Result[]
  hasStatusError?: boolean
}

/**
 * Dot-separated check ids emitted by the verifier-core pipeline (and the two
 * custom suites) that the adapter maps onto legacy log entries.
 */
const CHECK_ID = {
  signature: 'proof.signature',
  status: 'status.bitstring',
  expiration: 'validity.expiration',
  issuerDetails: 'trust.issuer-details',
  parsing: 'parsing.envelope'
} as const

export async function verifyPresentation(
  presentation: IVerifiablePresentation
): Promise<VerifyResponse> {
  try {
    const result = await coreVerifyPresentation({
      presentation,
      // We consume only the top-level `verified` boolean downstream; the
      // boolean registry suite is irrelevant here.
      registries: []
    })
    if (!result.verified) {
      console.warn('VP not verified:', JSON.stringify(result, null, 2))
    }
    return { verified: result.verified, results: [] }
  } catch (err) {
    console.warn(err)

    throw new Error(PresentationError.CouldNotBeVerified)
  }
}

export async function verifyCredential(
  credential: IVerifiableCredential
): Promise<VerifyResponse> {
  try {
    const core = (await coreVerify({
      credential: credential as never,
      // Disable the fork's default boolean registry suite; rich issuer
      // recognition comes from `issuerDetailsSuite` (cached registryManager).
      registries: [],
      additionalSuites: [expirationSuite, issuerDetailsSuite],
      // verbose so results[] carries EVERY check (incl. successes and the
      // issuer-details payload), not just failures folded into summary[].
      verbose: true
    })) as CredentialVerificationResult

    // A structural / parse failure means the credential is malformed -- surface
    // it as a fatal error, matching the previous library's behavior.
    const parseFailure = core.results.find(
      (result) =>
        result.check === CHECK_ID.parsing && result.outcome.status === 'failure'
    )
    if (parseFailure) {
      return createFatalErrorResult(
        credential,
        problemDetail(parseFailure) ?? CredentialError.CouldNotBeVerified
      )
    }

    const response = mapCoreResultToLegacyPayload(
      core,
      ProblemTypes.STATUS_LIST_NOT_FOUND
    )
    if (!response.verified) {
      console.warn('VC not verified:', JSON.stringify(response, null, 2))
    }
    return response
  } catch (err) {
    console.warn(
      'verifyCredential',
      err,
      JSON.stringify(err, removeStackReplacer, 2)
    )

    throw new Error(CredentialError.CouldNotBeVerified)
  }
}

/**
 * Translates a verifier-core `CredentialVerificationResult` into the legacy
 * `VerifyResponse` the dcw view layer consumes (a flat `log[]`, mirrored on
 * `results[0].log`).
 */
function mapCoreResultToLegacyPayload(
  core: CredentialVerificationResult,
  statusListNotFoundType: string
): VerifyResponse {
  const byCheck = (checkId: string): CheckResult | undefined =>
    core.results.find((result) => result.check === checkId)

  const log: ResultLog[] = []

  // valid_signature -- from proof.signature.
  const signature = byCheck(CHECK_ID.signature)
  if (signature) {
    log.push(legacyEntryFromCheck('valid_signature', signature))
  }

  // revocation_status -- from status.bitstring. Omitted when skipped (the
  // credential has no credentialStatus, so the view layer reports no status).
  const status = byCheck(CHECK_ID.status)
  if (status && status.outcome.status !== 'skipped') {
    const entry = legacyEntryFromCheck('revocation_status', status)
    if (
      status.outcome.status === 'failure' &&
      status.outcome.problems[0]?.type === statusListNotFoundType
    ) {
      // Tag so the drop-this-row special case below fires: an unpublished
      // status list is not a revocation.
      entry.error = { ...entry.error, name: 'status_list_not_found' }
    }
    log.push(entry)
  }

  // expiration -- from validity.expiration. Omitted when skipped so the view
  // layer's fallback (the "no expiration date set" row) renders instead.
  const expiration = byCheck(CHECK_ID.expiration)
  if (expiration && expiration.outcome.status !== 'skipped') {
    log.push(legacyEntryFromCheck('expiration', expiration))
  }

  // registered_issuer -- from the trust.issuer-details payload (rich entries).
  const matchingIssuers = matchingIssuersFrom(byCheck(CHECK_ID.issuerDetails))
  log.push({
    id: 'registered_issuer',
    valid: matchingIssuers.length > 0,
    matchingIssuers,
    ...(matchingIssuers.length === 0
      ? { error: { message: CredentialError.DidNotInRegistry } }
      : {})
  })

  // Drop a status_list_not_found revocation row: an unpublished status list
  // means the credential is simply unchecked, not revoked.
  const revocationIndex = log.findIndex(
    (entry) =>
      entry.id === 'revocation_status' &&
      entry.error?.name === 'status_list_not_found'
  )
  if (revocationIndex !== -1) {
    log.splice(revocationIndex, 1)
  }

  const hasStatusError = log.some(
    (entry) => entry.id === 'revocation_status' && !!entry.error
  )

  const verified = log.every((entry) => entry.valid)

  return {
    verified,
    credential: core.verifiableCredential as IVerifiableCredential,
    log,
    // results[0].log shares the same array so verificationResultFor (which
    // reads results[0].log) sees the rich entries, incl. matchingIssuers.
    results: [
      {
        verified,
        log,
        credential: core.verifiableCredential as IVerifiableCredential
      }
    ],
    ...(hasStatusError ? { hasStatusError } : {})
  }
}

/**
 * Pulls the rich `matchingIssuers` array off the issuer-details check payload.
 */
function matchingIssuersFrom(check: CheckResult | undefined): any[] {
  if (!check || check.outcome.status !== 'success') {
    return []
  }
  const payload = check.outcome.payload as
    | { matchingIssuers?: any[] }
    | undefined
  return payload?.matchingIssuers ?? []
}

/**
 * Builds a legacy `{ id, valid, error? }` log entry from a verifier-core check
 * result (success -> valid; failure -> invalid + first problem message).
 */
function legacyEntryFromCheck(id: string, check: CheckResult): ResultLog {
  if (check.outcome.status === 'success') {
    return { id, valid: true }
  }
  const message = problemDetail(check)
  return {
    id,
    valid: false,
    ...(message ? { error: { message } } : {})
  }
}

/**
 * Returns the human-readable text of a failed check's first problem (detail,
 * falling back to title), or undefined for non-failure outcomes.
 */
function problemDetail(check: CheckResult): string | undefined {
  if (check.outcome.status !== 'failure') {
    return undefined
  }
  const problem = check.outcome.problems[0]
  if (!problem) {
    return undefined
  }
  return problem.detail || problem.title
}

function createFatalErrorResult(
  credential: IVerifiableCredential,
  message: string
): VerifyResponse {
  return {
    verified: false,
    credential,
    log: [],
    results: [
      {
        verified: false,
        credential,
        log: [],
        error: {
          message,
          name: 'Error',
          isFatal: true
        }
      }
    ]
  }
}

function removeStackReplacer(key: string, value: unknown) {
  return key === 'stack' ? '...' : value
}

export function isVerifiableCredential(
  obj: VerifiableObject
): obj is IVerifiableCredential {
  return obj.type?.includes('VerifiableCredential')
}

export function isVerifiablePresentation(
  obj: VerifiableObject
): obj is IVerifiablePresentation {
  return obj.type?.includes('VerifiablePresentation')
}

export async function verifyVerifiableObject(
  obj: VerifiableObject
): Promise<boolean> {
  try {
    if (isVerifiableCredential(obj)) {
      return (await verifyCredential(obj)).verified
    }
    if (isVerifiablePresentation(obj)) {
      return (await verifyPresentation(obj)).verified
    }
  } catch (err) {
    console.warn('Error while verifying:', err)
  }

  return false
}
