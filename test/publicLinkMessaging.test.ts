import {
  CONFIRM_CREATE_BODY,
  exportPdfBody,
  FaqAnchor,
  linkedinBody,
  publicLinkInstructions,
  publicLinkScreenTitle,
  UNSHARE_BODY
} from '../app/lib/publicLinkMessaging'
import { PublicLinkScreenMode } from '../app/screens/PublicLinkScreen/PublicLinkScreen.types'

describe('publicLinkMessaging', () => {
  describe('publicLinkScreenTitle', () => {
    it('returns "Public Link" in Default mode', () => {
      expect(publicLinkScreenTitle(PublicLinkScreenMode.Default)).toBe(
        'Public Link'
      )
    })

    it('returns "Share Credential" in ShareCredential mode', () => {
      expect(publicLinkScreenTitle(PublicLinkScreenMode.ShareCredential)).toBe(
        'Share Credential'
      )
    })

    it('falls back to "Public Link" for an unknown mode', () => {
      expect(publicLinkScreenTitle(99 as PublicLinkScreenMode)).toBe(
        'Public Link'
      )
    })
  })

  describe('publicLinkInstructions', () => {
    it('Default mode ignores link state', () => {
      const text = 'Copy the link to share, or add to your LinkedIn profile.'
      expect(
        publicLinkInstructions(PublicLinkScreenMode.Default, {
          hasLink: false,
          justCreated: false
        })
      ).toBe(text)
      expect(
        publicLinkInstructions(PublicLinkScreenMode.Default, {
          hasLink: true,
          justCreated: true
        })
      ).toBe(text)
    })

    it('ShareCredential without a link prompts to create one', () => {
      expect(
        publicLinkInstructions(PublicLinkScreenMode.ShareCredential, {
          hasLink: false,
          justCreated: false
        })
      ).toMatch(/^Create a public link/)
    })

    it('ShareCredential just-created link', () => {
      expect(
        publicLinkInstructions(PublicLinkScreenMode.ShareCredential, {
          hasLink: true,
          justCreated: true
        })
      ).toMatch(/^Public link created\./)
    })

    it('ShareCredential pre-existing link', () => {
      expect(
        publicLinkInstructions(PublicLinkScreenMode.ShareCredential, {
          hasLink: true,
          justCreated: false
        })
      ).toMatch(/^Public link already created\./)
    })
  })

  describe('FaqAnchor', () => {
    it('exposes the expected anchors', () => {
      expect(FaqAnchor).toEqual({
        publicLink: 'public-link',
        publicLinkUnshare: 'public-link-unshare',
        exportToPdf: 'export-to-pdf',
        addToLinkedin: 'add-to-linkedin'
      })
    })
  })

  describe('body copy', () => {
    it('static bodies are non-empty', () => {
      expect(CONFIRM_CREATE_BODY.length).toBeGreaterThan(0)
      expect(UNSHARE_BODY.length).toBeGreaterThan(0)
    })

    it('exportPdfBody branches on hasLink', () => {
      expect(exportPdfBody(true)).toBe('This will export your credential to PDF.')
      expect(exportPdfBody(false)).toMatch(/^You can only export/)
    })

    it('linkedinBody branches on hasLink', () => {
      expect(linkedinBody(true)).toBe(
        'This will add the credential to your LinkedIn profile.'
      )
      expect(linkedinBody(false)).toMatch(/after creating a public link/)
    })
  })
})
