/**
 * Baseline characterization tests for VerificationStatusCard.
 *
 * Pins how the component renders each verification `log` id
 * (valid_signature / registered_issuer / revocation_status / expiration /
 * supported_format) plus the loading / error / no-expiration states, BEFORE
 * the verifier-core migration. The migration rebuilds the same legacy
 * `VerifyPayload` shape via an adapter, so these assertions should survive.
 */
import React from 'react'
import { render } from '@testing-library/react-native'
import type { VerifyPayload } from '../app/lib/verifiableObject'

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  StyleSheet: {
    create: jest.fn((styles: unknown) => styles),
    flatten: jest.fn((styles: unknown) => styles)
  }
}))

jest.mock('../app/hooks', () => ({
  useDynamicStyles: () => ({
    styles: new Proxy({}, { get: () => ({}) }),
    theme: {},
    mixins: {}
  })
}))

jest.mock('../app/lib/credentialValidityPeriod', () => ({
  getExpirationDate: jest.fn()
}))

import VerificationStatusCard from '../app/components/VerificationStatusCard/VerificationStatusCard'
import { getExpirationDate } from '../app/lib/credentialValidityPeriod'

const makePayload = (
  log: Array<{ id: string; valid: boolean; error?: unknown }>,
  overrides: Partial<VerifyPayload> = {}
): VerifyPayload => ({
  loading: false,
  error: null,
  result: { timestamp: 1700000000000, log, verified: true },
  ...overrides
})

const okCredential = { type: ['OpenBadgeCredential'] } as never

describe('VerificationStatusCard', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getExpirationDate as jest.Mock).mockReturnValue('2030-01-01T00:00:00Z')
  })

  it('renders positive rows for a fully verified credential', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([
          { id: 'valid_signature', valid: true },
          { id: 'registered_issuer', valid: true },
          { id: 'revocation_status', valid: true },
          { id: 'expiration', valid: true }
        ])}
      />
    )

    expect(getByText('is in a supported credential format')).toBeTruthy()
    expect(getByText('has a valid signature')).toBeTruthy()
    expect(getByText('has been issued by a known issuer')).toBeTruthy()
    expect(getByText('has not been revoked')).toBeTruthy()
    expect(getByText('has not expired')).toBeTruthy()
  })

  it('renders a revoked credential', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([
          { id: 'valid_signature', valid: true },
          { id: 'revocation_status', valid: false }
        ])}
      />
    )

    expect(getByText('has been revoked')).toBeTruthy()
  })

  it('renders an expired credential', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([
          { id: 'valid_signature', valid: true },
          { id: 'expiration', valid: false }
        ])}
      />
    )

    expect(getByText('has expired')).toBeTruthy()
  })

  it('renders an unrecognized issuer as a warning', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([
          { id: 'valid_signature', valid: true },
          { id: 'registered_issuer', valid: false }
        ])}
      />
    )

    expect(getByText("isn't in a known issuer registry")).toBeTruthy()
  })

  it('renders an invalid signature as negative', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([{ id: 'valid_signature', valid: false }])}
      />
    )

    expect(getByText('has an invalid signature')).toBeTruthy()
  })

  it('renders an unsupported credential type', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={{ type: ['FooCredential'] } as never}
        verifyPayload={makePayload([{ id: 'valid_signature', valid: true }])}
      />
    )

    expect(getByText('is not a recognized credential type')).toBeTruthy()
  })

  it('renders "no expiration date set" when the credential has none', () => {
    ;(getExpirationDate as jest.Mock).mockReturnValue(undefined)

    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([{ id: 'valid_signature', valid: true }])}
      />
    )

    expect(getByText('has no expiration date set')).toBeTruthy()
  })

  it('renders the loading state', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([], { loading: true })}
      />
    )

    expect(getByText('Verifying credential...')).toBeTruthy()
  })

  it('renders the error state', () => {
    const { getByText } = render(
      <VerificationStatusCard
        credential={okCredential}
        verifyPayload={makePayload([], { error: 'Boom' })}
      />
    )

    expect(getByText('Error: Boom')).toBeTruthy()
  })
})
