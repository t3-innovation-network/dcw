import type { ICredentialSubject } from '@digitalcredentials/ssi'

import { isResumeCredential } from '../app/lib/credentialTypes'

describe('isResumeCredential', () => {
  it('returns false when type is missing', () => {
    const subject = {} as ICredentialSubject
    expect(isResumeCredential(subject)).toBe(false)
  })

  it('returns true when type is exactly Resume', () => {
    const subject = { type: 'Resume' } as unknown as ICredentialSubject
    expect(isResumeCredential(subject)).toBe(true)
  })

  it('returns true when type array contains Resume', () => {
    const subject = {
      type: ['VerifiableCredential', 'Resume']
    } as unknown as ICredentialSubject
    expect(isResumeCredential(subject)).toBe(true)
  })

  it('returns true when type includes resume case-insensitively', () => {
    const subject1 = {
      type: 'ResumeCredential'
    } as unknown as ICredentialSubject
    const subject2 = {
      type: ['Something', 'RESUME']
    } as unknown as ICredentialSubject

    expect(isResumeCredential(subject1)).toBe(true)
    expect(isResumeCredential(subject2)).toBe(true)
  })

  it('returns false when no type matches resume', () => {
    const subject = {
      type: ['VerifiableCredential', 'EducationCredential']
    } as unknown as ICredentialSubject
    expect(isResumeCredential(subject)).toBe(false)
  })
})
