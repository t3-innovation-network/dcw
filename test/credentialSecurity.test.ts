import { shouldDisableUrls } from '../app/lib/credentialSecurity'

describe('credentialSecurity', () => {
  describe('shouldDisableUrls', () => {
    it('disables URLs when there is no verification result', () => {
      expect(shouldDisableUrls()).toBe(true)
      expect(shouldDisableUrls(null)).toBe(true)
      expect(shouldDisableUrls({})).toBe(true)
    })

    it('disables URLs when the log has no registered_issuer entry', () => {
      const result = { log: [{ id: 'valid_signature', valid: true }] }

      expect(shouldDisableUrls(result as never)).toBe(true)
    })

    it('enables URLs when verification confirms a registered issuer', () => {
      const result = {
        log: [{ id: 'registered_issuer', valid: true, matchingIssuers: [{}] }]
      }

      expect(shouldDisableUrls(result as never)).toBe(false)
    })

    it('disables URLs when the registered_issuer entry has no matches', () => {
      const result = {
        log: [{ id: 'registered_issuer', valid: false, matchingIssuers: [] }]
      }

      expect(shouldDisableUrls(result as never)).toBe(true)
    })

    it('disables URLs when the registered_issuer entry is valid but empty', () => {
      const result = {
        log: [{ id: 'registered_issuer', valid: true, matchingIssuers: [] }]
      }

      expect(shouldDisableUrls(result as never)).toBe(true)
    })
  })
})
