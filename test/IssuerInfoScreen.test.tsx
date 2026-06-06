/**
 * Baseline characterization tests for IssuerInfoScreen (the "issuer details"
 * screen).
 *
 * Pins the CURRENT behavior before the verifier-core / issuer-registry-client
 * migration:
 *  - a recognized issuer (the `registered_issuer` log carries `matchingIssuers`
 *    with `federation_entity` metadata) renders the rich registry block and
 *    leaves links enabled;
 *  - an unrecognized issuer disables links (shows the warning) and falls back
 *    to the credential's own issuer block.
 *
 * The migration preserves the `matchingIssuers` payload shape and keeps
 * `shouldDisableUrls` verification-driven, so these assertions should survive.
 */
import React from 'react'
import { render } from '@testing-library/react-native'

jest.mock('react-native', () => ({
  View: 'View',
  Text: 'Text',
  Image: 'Image',
  Linking: { openURL: jest.fn() },
  StyleSheet: {
    create: jest.fn((styles: unknown) => styles),
    flatten: jest.fn((styles: unknown) => styles)
  }
}))

jest.mock('react-native-gesture-handler', () => ({
  ScrollView: 'ScrollView'
}))

jest.mock('../app/hooks', () => ({
  useDynamicStyles: () => ({
    styles: new Proxy({}, { get: () => ({}) }),
    theme: {},
    mixins: {}
  }),
  useVerifyCredential: jest.fn()
}))

jest.mock('../app/components', () => {
  const mockReact = require('react')
  return {
    NavHeader: ({ title }: { title: string }) =>
      mockReact.createElement('Text', null, title)
  }
}, { virtual: true })

jest.mock('../app/init/registries', () => {
  const mockReact = require('react')
  return {
    DidRegistryContext: mockReact.createContext({ didEntry: () => undefined })
  }
})

import IssuerInfoScreen from '../app/screens/IssuerInfoScreen/IssuerInfoScreen'
import { useVerifyCredential } from '../app/hooks'

const renderScreen = (issuer: unknown) =>
  render(
    <IssuerInfoScreen
      navigation={{ goBack: jest.fn() } as never}
      route={
        {
          params: {
            rawCredentialRecord: {
              credential: { issuer, type: ['VerifiableCredential'] }
            }
          }
        } as never
      }
    />
  )

describe('IssuerInfoScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders the rich registry block and keeps links enabled for a recognized issuer', () => {
    ;(useVerifyCredential as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      result: {
        timestamp: Date.now(),
        verified: true,
        log: [
          {
            id: 'registered_issuer',
            valid: true,
            matchingIssuers: [
              {
                issuer: {
                  federation_entity: {
                    organization_name: 'MIT',
                    homepage_uri: 'https://mit.edu',
                    logo_uri: 'https://mit.edu/logo.png'
                  },
                  institution_additional_information: {
                    legal_name: 'Massachusetts Institute of Technology'
                  }
                },
                registry: {
                  federation_entity: {
                    organization_name: 'DCC Pilot Registry',
                    policy_uri: 'https://dcc.org/gov'
                  }
                }
              }
            ]
          }
        ]
      }
    })

    const { getByText, queryByText } = renderScreen({
      id: 'did:web:mit.edu',
      name: 'MIT'
    })

    expect(getByText('Information from Known Registries')).toBeTruthy()
    expect(getByText('Massachusetts Institute of Technology')).toBeTruthy()
    expect(getByText('(More info on governance)')).toBeTruthy()
    expect(getByText('https://mit.edu')).toBeTruthy()
    expect(queryByText(/Links disabled/)).toBeNull()
  })

  it('disables links and shows the credential fallback for an unrecognized issuer', () => {
    ;(useVerifyCredential as jest.Mock).mockReturnValue({
      loading: false,
      error: null,
      result: {
        timestamp: Date.now(),
        verified: false,
        log: [{ id: 'registered_issuer', valid: false, matchingIssuers: [] }]
      }
    })

    const { getByText, queryByText } = renderScreen({
      id: 'did:web:evil',
      name: 'Sketchy Co',
      url: 'https://evil.example'
    })

    expect(queryByText(/Links disabled/)).toBeTruthy()
    expect(getByText('Issuer (from Credential)')).toBeTruthy()
    expect(getByText('Sketchy Co')).toBeTruthy()
  })
})
