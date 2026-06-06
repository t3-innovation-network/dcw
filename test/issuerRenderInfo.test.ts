/**
 * Baseline characterization tests for the issuer-details rendering logic
 * (`app/lib/credentialDisplay/shared/utils/issuer.ts`).
 *
 * These pin the CURRENT behavior of how the `registered_issuer` verification
 * log entry (its `matchingIssuers[].issuer.federation_entity` shape) is turned
 * into display fields, BEFORE the verifier-core / issuer-registry-client
 * migration. The migration preserves this `matchingIssuers` contract, so these
 * tests should keep passing unchanged afterward.
 */
import {
  issuerRenderInfoWithVerification,
  issuerRenderInfoFrom,
  personNameFromCredential
} from '../app/lib/credentialDisplay/shared/utils/issuer'

const registeredIssuerLog = (matchingIssuers: unknown[]) => ({
  log: [{ id: 'registered_issuer', matchingIssuers }]
})

describe('issuerRenderInfoWithVerification', () => {
  it('uses federation_entity registry metadata when the issuer matches', () => {
    const verifyResult = registeredIssuerLog([
      {
        issuer: {
          federation_entity: {
            organization_name: 'MIT',
            homepage_uri: 'https://mit.edu'
          }
        }
      }
    ])

    const info = issuerRenderInfoWithVerification('did:key:zABC', verifyResult)

    expect(info).toEqual({
      issuerName: 'MIT',
      issuerUrl: 'https://mit.edu',
      issuerId: null,
      issuerImage: null
    })
  })

  it('reads issuerId and issuerImage from an object issuer in the match branch', () => {
    const verifyResult = registeredIssuerLog([
      {
        issuer: {
          federation_entity: {
            organization_name: 'MIT',
            homepage_uri: 'https://mit.edu'
          }
        }
      }
    ])
    const issuer = {
      id: 'did:web:mit.edu',
      name: 'MIT',
      image: 'https://mit.edu/img.png'
    }

    const info = issuerRenderInfoWithVerification(issuer as never, verifyResult)

    expect(info.issuerName).toBe('MIT')
    expect(info.issuerId).toBe('did:web:mit.edu')
    expect(info.issuerImage).toBe('https://mit.edu/img.png')
  })

  it('falls back to the credential issuer when there is no verification match', () => {
    const issuer = {
      id: 'did:web:acme',
      name: 'Acme',
      url: 'https://acme.com',
      image: 'https://acme.com/logo.png'
    }

    const info = issuerRenderInfoWithVerification(issuer as never)

    expect(info).toEqual({
      issuerName: 'Acme',
      issuerUrl: 'https://acme.com',
      issuerId: 'did:web:acme',
      issuerImage: 'https://acme.com/logo.png'
    })
  })

  it('overrides issuerName with the person name for a SkillClaimCredential and uses logo_uri', () => {
    const credential = {
      type: ['VerifiableCredential', 'SkillClaimCredential'],
      credentialSubject: { person: { name: 'Jane Doe' } }
    }
    const verifyResult = registeredIssuerLog([
      {
        issuer: {
          federation_entity: {
            organization_name: 'MIT',
            homepage_uri: 'https://mit.edu',
            logo_uri: 'https://mit.edu/logo.png'
          }
        }
      }
    ])

    const info = issuerRenderInfoWithVerification(
      'did:key:z',
      verifyResult,
      credential as never
    )

    expect(info.issuerName).toBe('Jane Doe')
    expect(info.issuerImage).toBe('https://mit.edu/logo.png')
  })
})

describe('issuerRenderInfoFrom', () => {
  it('returns the DID string as the name for a string issuer', () => {
    expect(issuerRenderInfoFrom('did:key:zXYZ')).toEqual({
      issuerName: 'did:key:zXYZ',
      issuerUrl: null,
      issuerId: null,
      issuerImage: null
    })
  })

  it('reads name/url/id/image from an object issuer', () => {
    const issuer = {
      id: 'did:web:acme',
      name: 'Acme',
      url: 'https://acme.com',
      image: 'https://acme.com/logo.png'
    }
    expect(issuerRenderInfoFrom(issuer as never)).toEqual({
      issuerName: 'Acme',
      issuerUrl: 'https://acme.com',
      issuerId: 'did:web:acme',
      issuerImage: 'https://acme.com/logo.png'
    })
  })
})

describe('personNameFromCredential', () => {
  it('returns the credentialSubject.person.name', () => {
    expect(
      personNameFromCredential({
        type: ['SkillClaimCredential'],
        credentialSubject: { person: { name: 'Bob' } }
      } as never)
    ).toBe('Bob')
  })

  it('returns null when there is no person name', () => {
    expect(
      personNameFromCredential({
        type: ['VerifiableCredential'],
        credentialSubject: {}
      } as never)
    ).toBeNull()
  })

  it('returns null when no credential is provided', () => {
    expect(personNameFromCredential()).toBeNull()
  })
})
