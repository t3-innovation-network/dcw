import { PublicLinkScreenMode } from '../screens/PublicLinkScreen/PublicLinkScreen.types'

/**
 * Pure UI-copy / messaging helpers for the Public Link screen. Kept free of any
 * React Native imports so the branching logic can be unit-tested in isolation.
 */

/** FAQ deep-link anchors (fragments appended to `LinkConfig.appWebsite.faq`). */
export const FaqAnchor = {
  publicLink: 'public-link',
  publicLinkUnshare: 'public-link-unshare',
  exportToPdf: 'export-to-pdf',
  addToLinkedin: 'add-to-linkedin'
} as const

export type FaqAnchorKey = keyof typeof FaqAnchor

export function publicLinkScreenTitle(
  screenMode: PublicLinkScreenMode
): string {
  return (
    {
      [PublicLinkScreenMode.Default]: 'Public Link',
      [PublicLinkScreenMode.ShareCredential]: 'Share Credential'
    }[screenMode] ?? 'Public Link'
  )
}

export function publicLinkInstructions(
  screenMode: PublicLinkScreenMode,
  { hasLink, justCreated }: { hasLink: boolean; justCreated: boolean }
): string {
  switch (screenMode) {
    case PublicLinkScreenMode.Default:
      return 'Copy the link to share, or add to your LinkedIn profile.'
    case PublicLinkScreenMode.ShareCredential:
      if (!hasLink)
        return 'Create a public link that anyone can use to view this credential, export to PDF, add to your LinkedIn profile, or send a json copy.'
      if (justCreated)
        return 'Public link created. Copy the link to share, export to PDF, add to your LinkedIn profile, or send a json copy.'
      return 'Public link already created. Copy the link to share, add to your LinkedIn profile, or send a json copy.'
    default:
      return 'Public link already created. Copy the link to share, add to your LinkedIn profile, or send a json copy.'
  }
}

export const CONFIRM_CREATE_BODY =
  'Creating a public link will allow anyone with the link to view the credential. The link will automatically expire 1 year after creation. A public link expiration date is not the same as the expiration date for your credential.'

export const UNSHARE_BODY =
  'Unsharing a public link will remove the ability of others to view the credential. If you share the same credential in the future it will have a different public link.'

export function exportPdfBody(hasLink: boolean): string {
  return hasLink
    ? 'This will export your credential to PDF.'
    : 'You can only export your credential as a PDF after creating a public link. The link will automatically expire 1 year after creation. Click "Export as PDF" to generate a public link first and then export to PDF.'
}

export function linkedinBody(hasLink: boolean): string {
  return hasLink
    ? 'This will add the credential to your LinkedIn profile.'
    : 'This will add the credential to your LinkedIn profile after creating a public link. The link will automatically expire 1 year after creation.'
}
