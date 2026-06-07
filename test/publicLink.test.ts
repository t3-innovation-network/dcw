jest.mock('react-native-get-random-values', () => ({}))

// Heavy / native-touching deps pulled in by publicLink.ts. Stub them so the
// module loads under jest; the functions under test don't exercise these.
jest.mock('../app/lib/decode', () => ({
  credentialIdFor: jest.fn(() => 'cred-123')
}))
jest.mock('../app/lib/verifierInstance', () => ({
  postCredential: jest.fn(),
  deleteCredential: jest.fn()
}))
jest.mock('../app/lib/walletAttachedStorage', () => ({
  getStorageClient: jest.fn()
}))
jest.mock('../app/lib/getWasController', () => ({
  getWasController: jest.fn()
}))
jest.mock('../app/lib/credentialName', () => ({
  getCredentialName: jest.fn(() => 'My Credential')
}))
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn()
}))
jest.mock('../app.config', () => ({
  WAS: {
    enabled: false,
    BASE_URL: 'https://was.example',
    KEYS: { SPACE_ID: 'was_space_id' }
  },
  VERIFIER_INSTANCE_URL: 'https://verifier.example'
}))

const mockLoad = jest.fn()
jest.mock('../app/lib/cache', () => ({
  CacheKey: { PublicLinks: 'publiclinks' },
  Cache: {
    getInstance: jest.fn(() => ({ load: mockLoad }))
  }
}))

import { getPublicViewLink, linkedinUrlFrom } from '../app/lib/publicLink'

const recordWith = (credential: Record<string, unknown>) =>
  ({ credential, profileRecordId: 'p1' }) as never

describe('publicLink', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPublicViewLink', () => {
    it('returns absolute view URLs unchanged (WAS links)', async () => {
      mockLoad.mockResolvedValue({
        server: 'https://was.example',
        url: { view: 'https://verifier.example/#verify?vc=abc' }
      })

      const link = await getPublicViewLink(recordWith({}))

      expect(link).toBe('https://verifier.example/#verify?vc=abc')
    })

    it('prepends the server for relative view paths (verifierInstance links)', async () => {
      mockLoad.mockResolvedValue({
        server: 'https://verifier.example/',
        url: { view: '/view/xyz' }
      })

      const link = await getPublicViewLink(recordWith({}))

      expect(link).toBe('https://verifier.example/view/xyz')
    })

    it('returns null when no link is cached (NotFoundError)', async () => {
      const notFound = new Error('not found')
      notFound.name = 'NotFoundError'
      mockLoad.mockRejectedValue(notFound)

      const link = await getPublicViewLink(recordWith({}))

      expect(link).toBeNull()
    })

    it('rethrows unexpected errors', async () => {
      mockLoad.mockRejectedValue(new Error('boom'))

      await expect(getPublicViewLink(recordWith({}))).rejects.toThrow('boom')
    })
  })

  describe('linkedinUrlFrom', () => {
    beforeEach(() => {
      mockLoad.mockResolvedValue({
        server: 'https://verifier.example',
        url: { view: 'https://verifier.example/#verify?vc=abc' }
      })
    })

    it('builds a LinkedIn add-to-profile URL with a string issuer and dates', async () => {
      const url = await linkedinUrlFrom(
        recordWith({
          issuer: 'https://issuer.example',
          issuanceDate: '2023-06-15T12:00:00Z',
          expirationDate: '2024-09-15T12:00:00Z'
        })
      )

      expect(url).toContain(
        'https://www.linkedin.com/profile/add?startTask=CERTIFICATION_NAME'
      )
      expect(url).toContain('name=My Credential')
      expect(url).toContain('organizationName=https://issuer.example')
      expect(url).toContain('issueYear=2023')
      expect(url).toContain('issueMonth=6')
      expect(url).toContain('expirationYear=2024')
      expect(url).toContain('expirationMonth=9')
      expect(url).toContain(
        'certUrl=https://verifier.example/#verify?vc=abc'
      )
    })

    it('uses issuer.name when the issuer is an object', async () => {
      const url = await linkedinUrlFrom(
        recordWith({ issuer: { name: 'Issuer Co' } })
      )

      expect(url).toContain('organizationName=Issuer Co')
    })

    it('omits issuance/expiration segments when no dates are present', async () => {
      const url = await linkedinUrlFrom(
        recordWith({ issuer: 'https://issuer.example' })
      )

      expect(url).not.toContain('issueYear=')
      expect(url).not.toContain('expirationYear=')
    })

    it('omits certUrl when there is no public link', async () => {
      const notFound = new Error('not found')
      notFound.name = 'NotFoundError'
      mockLoad.mockRejectedValue(notFound)

      const url = await linkedinUrlFrom(
        recordWith({ issuer: 'https://issuer.example' })
      )

      expect(url).not.toContain('certUrl=')
    })
  })
})
