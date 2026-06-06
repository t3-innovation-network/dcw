/**
 * Unit tests for the custom issuer-details suite. The shared registryManager is
 * mocked (so loading the suite doesn't pull in the ESM issuer-registry-client),
 * and the check is exercised directly via `suite.checks[0].execute`.
 */
const mockLookupDid = jest.fn()

jest.mock('../app/lib/registry/registryManager', () => ({
  registryManager: { lookupDid: (...args: unknown[]) => mockLookupDid(...args) }
}))

import { issuerDetailsSuite } from '../app/lib/verifierSuites/issuerDetailsSuite'

const execute = issuerDetailsSuite.checks[0].execute
const context = {} as never

describe('issuerDetailsSuite', () => {
  beforeEach(() => jest.clearAllMocks())

  it('skips when there is no credential', async () => {
    const outcome = await execute({} as never, context)
    expect(outcome.status).toBe('skipped')
    expect(mockLookupDid).not.toHaveBeenCalled()
  })

  it('skips when the credential has no issuer DID', async () => {
    const outcome = await execute(
      { verifiableCredential: { type: ['VerifiableCredential'] } } as never,
      context
    )
    expect(outcome.status).toBe('skipped')
    expect(mockLookupDid).not.toHaveBeenCalled()
  })

  it('returns the matchingIssuers payload for a recognized issuer (string issuer)', async () => {
    const matchingIssuers = [
      { issuer: { federation_entity: { organization_name: 'MIT' } } }
    ]
    mockLookupDid.mockResolvedValue({
      matchingIssuers,
      uncheckedRegistries: []
    })

    const outcome = await execute(
      { verifiableCredential: { issuer: 'did:web:mit.edu' } } as never,
      context
    )

    expect(mockLookupDid).toHaveBeenCalledWith('did:web:mit.edu')
    expect(outcome.status).toBe('success')
    if (outcome.status === 'success') {
      expect(outcome.payload).toEqual({ matchingIssuers })
    }
  })

  it('resolves the issuer DID from the object { id } form', async () => {
    mockLookupDid.mockResolvedValue({
      matchingIssuers: [],
      uncheckedRegistries: []
    })

    const outcome = await execute(
      { verifiableCredential: { issuer: { id: 'did:web:obj.edu' } } } as never,
      context
    )

    expect(mockLookupDid).toHaveBeenCalledWith('did:web:obj.edu')
    expect(outcome.status).toBe('success')
    if (outcome.status === 'success') {
      expect(outcome.payload).toEqual({ matchingIssuers: [] })
    }
  })
})
