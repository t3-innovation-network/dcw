/**
 * Tests the verifier-core adapter in app/lib/validate.ts.
 *
 * The fork (`@interop/verifier-core`) is mocked so we can feed hand-built
 * `CheckResult[]` and assert the translation back into dcw's legacy `log[]`
 * shape (signature / revocation / expiry rows + matchingIssuers, the
 * status_list_not_found drop special case, and hasStatusError). The shared
 * registryManager is mocked too, so loading validate.ts doesn't pull in the
 * (ESM) issuer-registry-client.
 */
import type { IVerifiableCredential } from '@interop/data-integrity-core'

const STATUS_LIST_NOT_FOUND =
  'https://www.w3.org/TR/vc-data-model#STATUS_LIST_NOT_FOUND'

const mockCoreVerify = jest.fn()
const mockCoreVerifyPresentation = jest.fn()

jest.mock('@interop/verifier-core', () => ({
  verifyCredential: (...args: unknown[]) => mockCoreVerify(...args),
  verifyPresentation: (...args: unknown[]) =>
    mockCoreVerifyPresentation(...args),
  ProblemTypes: {
    STATUS_LIST_NOT_FOUND:
      'https://www.w3.org/TR/vc-data-model#STATUS_LIST_NOT_FOUND'
  }
}))

jest.mock('../app/lib/registry/registryManager', () => ({
  registryManager: { lookupDid: jest.fn(), peekDid: jest.fn() }
}))

import { verifyCredential, verifyPresentation } from '../app/lib/validate'

const credential = {
  type: ['VerifiableCredential'],
  issuer: 'did:web:example.edu'
} as unknown as IVerifiableCredential

type Outcome =
  | { status: 'success'; message: string; payload?: unknown }
  | { status: 'failure'; problems: Array<{ type: string; title: string }> }
  | { status: 'skipped'; reason: string }

const check = (checkId: string, outcome: Outcome) => ({
  check: checkId,
  suite: checkId.split('.')[0],
  outcome
})

const coreResult = (results: unknown[]) => ({
  verified: true,
  verifiableCredential: credential,
  results,
  summary: []
})

const success = (message = 'ok'): Outcome => ({ status: 'success', message })

describe('validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('verifyCredential', () => {
    it('translates a fully-verified credential into the legacy log shape', async () => {
      const matchingIssuers = [
        { issuer: { federation_entity: { organization_name: 'MIT' } } }
      ]
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('proof.signature', success()),
          check('status.bitstring', success()),
          check('validity.expiration', success()),
          check('trust.issuer-details', {
            status: 'success',
            message: 'found',
            payload: { matchingIssuers }
          })
        ])
      )

      const result = await verifyCredential(credential)

      expect(result.verified).toBe(true)
      const log = result.results[0].log
      expect(log).toEqual([
        { id: 'valid_signature', valid: true },
        { id: 'revocation_status', valid: true },
        { id: 'expiration', valid: true },
        { id: 'registered_issuer', valid: true, matchingIssuers }
      ])
    })

    it('drops the revocation row (not revoked) when the status list is not found', async () => {
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('proof.signature', success()),
          check('status.bitstring', {
            status: 'failure',
            problems: [{ type: STATUS_LIST_NOT_FOUND, title: 'not found' }]
          }),
          check('trust.issuer-details', {
            status: 'success',
            message: 'found',
            payload: { matchingIssuers: [{}] }
          })
        ])
      )

      const result = await verifyCredential(credential)

      const log = result.results[0].log
      expect(log.find((e) => e.id === 'revocation_status')).toBeUndefined()
      expect(result.hasStatusError).toBeUndefined()
      // signature + registered_issuer remain, both valid.
      expect(result.verified).toBe(true)
    })

    it('keeps a genuine revocation failure and flags hasStatusError', async () => {
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('proof.signature', success()),
          check('status.bitstring', {
            status: 'failure',
            problems: [
              {
                type: 'https://www.w3.org/TR/vc-data-model#CREDENTIAL_REVOKED_OR_SUSPENDED',
                title: 'revoked'
              }
            ]
          }),
          check('trust.issuer-details', {
            status: 'success',
            message: 'found',
            payload: { matchingIssuers: [{}] }
          })
        ])
      )

      const result = await verifyCredential(credential)

      const revocation = result.results[0].log.find(
        (e) => e.id === 'revocation_status'
      )
      expect(revocation?.valid).toBe(false)
      expect(result.hasStatusError).toBe(true)
      expect(result.verified).toBe(false)
    })

    it('marks an unrecognized issuer invalid with a registry error', async () => {
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('proof.signature', success()),
          check('trust.issuer-details', {
            status: 'success',
            message: 'none',
            payload: { matchingIssuers: [] }
          })
        ])
      )

      const result = await verifyCredential(credential)

      const registered = result.results[0].log.find(
        (e) => e.id === 'registered_issuer'
      )
      expect(registered?.valid).toBe(false)
      expect(registered?.matchingIssuers).toEqual([])
      expect(registered?.error?.message).toContain('registry')
      expect(result.verified).toBe(false)
    })

    it('omits the expiration row when the expiration check is skipped', async () => {
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('proof.signature', success()),
          check('validity.expiration', {
            status: 'skipped',
            reason: 'no expiry'
          }),
          check('trust.issuer-details', {
            status: 'success',
            message: 'found',
            payload: { matchingIssuers: [{}] }
          })
        ])
      )

      const result = await verifyCredential(credential)

      expect(
        result.results[0].log.find((e) => e.id === 'expiration')
      ).toBeUndefined()
    })

    it('returns a fatal error result on a parse failure', async () => {
      mockCoreVerify.mockResolvedValue(
        coreResult([
          check('parsing.envelope', {
            status: 'failure',
            problems: [{ type: 'PARSING_ERROR', title: 'bad json' }]
          })
        ])
      )

      const result = await verifyCredential(credential)

      expect(result.verified).toBe(false)
      expect(result.results[0].error?.isFatal).toBe(true)
    })

    it('throws CredentialError when the fork rejects', async () => {
      mockCoreVerify.mockRejectedValue(new Error('boom'))

      await expect(verifyCredential(credential)).rejects.toThrow(
        'Credential could not be checked for verification and may be malformed.'
      )
    })
  })

  describe('verifyPresentation', () => {
    it('passes through the top-level verified boolean', async () => {
      mockCoreVerifyPresentation.mockResolvedValue({
        verified: true,
        verifiablePresentation: {},
        presentationResults: [],
        credentialResults: [],
        summary: []
      })

      const result = await verifyPresentation({
        type: 'VerifiablePresentation'
      } as never)

      expect(result.verified).toBe(true)
    })

    it('throws PresentationError on exception', async () => {
      mockCoreVerifyPresentation.mockRejectedValue(new Error('boom'))

      await expect(
        verifyPresentation({ type: 'VerifiablePresentation' } as never)
      ).rejects.toThrow(
        'Presentation encoded could not be checked for verification and may be malformed.'
      )
    })
  })
})
