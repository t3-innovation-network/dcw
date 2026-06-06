/**
 * Unit tests for the custom expiration suite. The check is exercised directly
 * via `suite.checks[0].execute(subject, context)` with a hand-built context
 * carrying a deterministic `timeService` -- no network, no fork load (the suite
 * imports `@interop/verifier-core` for types only).
 */
import {
  expirationSuite,
  EXPIRED_PROBLEM_TYPE
} from '../app/lib/verifierSuites/expirationSuite'

const NOW = Date.parse('2026-06-05T00:00:00Z')

const execute = expirationSuite.checks[0].execute

const contextAt = (nowMs: number) =>
  ({
    timeService: { dateNowMs: () => nowMs, performanceNowMs: () => 0 }
  }) as never

describe('expirationSuite', () => {
  it('skips when there is no credential', async () => {
    const outcome = await execute({} as never, contextAt(NOW))
    expect(outcome.status).toBe('skipped')
  })

  it('skips when the credential has no expiry', async () => {
    const outcome = await execute(
      { verifiableCredential: { issuer: 'did:x' } } as never,
      contextAt(NOW)
    )
    expect(outcome.status).toBe('skipped')
  })

  it('skips when the expiry is not a valid date', async () => {
    const outcome = await execute(
      { verifiableCredential: { validUntil: 'not-a-date' } } as never,
      contextAt(NOW)
    )
    expect(outcome.status).toBe('skipped')
  })

  it('succeeds when the credential is within its validity period (validUntil)', async () => {
    const outcome = await execute(
      { verifiableCredential: { validUntil: '2030-01-01T00:00:00Z' } } as never,
      contextAt(NOW)
    )
    expect(outcome.status).toBe('success')
  })

  it('succeeds using the VC 1.x expirationDate fallback', async () => {
    const outcome = await execute(
      {
        verifiableCredential: { expirationDate: '2030-01-01T00:00:00Z' }
      } as never,
      contextAt(NOW)
    )
    expect(outcome.status).toBe('success')
  })

  it('fails with the EXPIRED problem type when the credential has expired', async () => {
    const outcome = await execute(
      { verifiableCredential: { validUntil: '2020-01-01T00:00:00Z' } } as never,
      contextAt(NOW)
    )
    expect(outcome.status).toBe('failure')
    if (outcome.status === 'failure') {
      expect(outcome.problems[0].type).toBe(EXPIRED_PROBLEM_TYPE)
    }
  })
})
