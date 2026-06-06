// Mock the json-canonicalize module
jest.mock('json-canonicalize', () => ({
  canonicalize: jest.fn((obj) => obj)
}))

import {
  canonicalCredentialJson,
  credentialContentHash
} from '../app/lib/credentialHash'
import { mockCredential } from '../app/mock/credential'

describe('credentialHash', () => {
  describe('canonicalCredentialJson', () => {
    it('should return a canonical JSON string', () => {
      const result = canonicalCredentialJson(mockCredential)
      expect(typeof result).toBe('string')
      expect(result).toContain('@context')
    })

    it('should produce consistent output for the same credential', () => {
      const result1 = canonicalCredentialJson(mockCredential)
      const result2 = canonicalCredentialJson(mockCredential)
      expect(result1).toBe(result2)
    })

    it('should produce different output for different credentials', () => {
      const credential2 = { ...mockCredential, id: 'different-id' }
      const result1 = canonicalCredentialJson(mockCredential)
      const result2 = canonicalCredentialJson(credential2)
      expect(result1).not.toBe(result2)
    })
  })

  describe('credentialContentHash', () => {
    it('should return a SHA256 hash string', () => {
      const result = credentialContentHash(mockCredential)
      expect(typeof result).toBe('string')
      expect(result).toHaveLength(64) // SHA256 hex string length
      expect(result).toMatch(/^[0-9a-f]{64}$/) // lowercase hex
    })

    it('should produce consistent hash for the same credential', () => {
      const hash1 = credentialContentHash(mockCredential)
      const hash2 = credentialContentHash(mockCredential)
      expect(hash1).toBe(hash2)
    })

    it('should produce different hashes for different credentials', () => {
      const credential2 = { ...mockCredential, id: 'different-id' }
      const hash1 = credentialContentHash(mockCredential)
      const hash2 = credentialContentHash(credential2)
      expect(hash1).not.toBe(hash2)
    })
  })
})
