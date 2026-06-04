// Mock credential display components
import { IVerifiableCredential } from '@interop/data-integrity-core'

jest.mock('../app/lib/credentialDisplay/openBadgeCredential', () => ({
  openBadgeCredentialDisplayConfig: {
    credentialType: 'OpenBadgeCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Test Badge',
      subtitle: 'Test Issuer',
      image: 'test.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/studentId', () => ({
  studentIdDisplayConfig: {
    credentialType: 'StudentId',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Student ID',
      subtitle: 'School',
      image: 'id.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/universityDegreeCredential', () => ({
  universityDegreeCredentialDisplayConfig: {
    credentialType: 'UniversityDegreeCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Degree',
      subtitle: 'University',
      image: 'degree.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/verifiableCredential', () => ({
  verifiableCredentialDisplayConfig: {
    credentialType: 'VerifiableCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Credential',
      subtitle: 'Issuer',
      image: 'default.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/recommendationCredential', () => ({
  recommendationCredentialDisplayConfig: {
    credentialType: 'https://schema.org/RecommendationCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Recommendation From Someone',
      subtitle: 'Issuer',
      image: 'default.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/performanceReviewCredential', () => ({
  performanceReviewCredentialDisplayConfig: {
    credentialType: 'PerformanceReviewCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Performance Review: Omar Salah',
      subtitle: 'Issuer',
      image: 'default.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/employmentCredential', () => ({
  employmentCredentialDisplayConfig: {
    credentialType: 'EmploymentCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Employment: Omar @ testing company',
      subtitle: 'Issuer',
      image: 'default.png'
    }))
  }
}))

jest.mock('../app/lib/credentialDisplay/volunteerCredential', () => ({
  volunteerCredentialDisplayConfig: {
    credentialType: 'VolunteeringCredential',
    cardComponent: jest.fn(),
    itemPropsResolver: jest.fn(() => ({
      title: 'Volunteer: Omar @ Testing Organization',
      subtitle: 'Issuer',
      image: 'default.png'
    }))
  }
}))

import {
  credentialDisplayConfigFor,
  credentialItemPropsFor
} from '../app/lib/credentialDisplay'

describe('credentialDisplay', () => {
  const mockOpenBadgeCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-credential',
    type: ['VerifiableCredential', 'OpenBadgeCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' }
  }

  const mockAchievementCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-achievement',
    type: ['VerifiableCredential', 'AchievementCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' }
  }

  const mockGenericCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-generic',
    type: ['VerifiableCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject' }
  }

  const mockRecommendationCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-recommendation',
    type: [
      'VerifiableCredential',
      'https://schema.org/RecommendationCredential'
    ],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2023-01-01T00:00:00Z',
    credentialSubject: { id: 'test-subject', name: 'Ross Geller' } as any
  }

  const mockPerformanceReviewCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-performance-review',
    type: ['VerifiableCredential', 'PerformanceReviewCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2026-02-18T14:35:07.554Z',
    credentialSubject: { id: 'test-subject', employeeName: 'Omar Salah' } as any
  }

  const mockEmploymentCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-employment',
    type: ['VerifiableCredential', 'EmploymentCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2026-03-17T17:14:15.286Z',
    credentialSubject: { id: 'test-subject', fullName: 'Omar' } as any
  }

  const mockVolunteerCredential: IVerifiableCredential = {
    '@context': ['https://www.w3.org/2018/credentials/v1'],
    id: 'test-volunteer',
    type: ['VerifiableCredential', 'VolunteeringCredential'],
    issuer: { id: 'test-issuer' },
    issuanceDate: '2026-03-18T18:21:05.689Z',
    credentialSubject: {
      id: 'test-subject',
      fullName: 'Omar',
      volunteerOrg: 'Testing Organization'
    } as any
  }

  describe('credentialDisplayConfigFor', () => {
    it('should return OpenBadgeCredential config for OpenBadgeCredential type', () => {
      const config = credentialDisplayConfigFor(mockOpenBadgeCredential)
      expect(config.credentialType).toBe('OpenBadgeCredential')
      expect(config.cardComponent).toBeDefined()
      expect(config.itemPropsResolver).toBeDefined()
    })

    it('should return OpenBadgeCredential config for AchievementCredential type', () => {
      const config = credentialDisplayConfigFor(mockAchievementCredential)
      expect(config.credentialType).toBe('OpenBadgeCredential')
    })

    it('should return RecommendationCredential config for RecommendationCredential type', () => {
      const config = credentialDisplayConfigFor(mockRecommendationCredential)
      expect(config.credentialType).toBe(
        'https://schema.org/RecommendationCredential'
      )
    })

    it('should return PerformanceReviewCredential config for PerformanceReviewCredential type', () => {
      const config = credentialDisplayConfigFor(mockPerformanceReviewCredential)
      expect(config.credentialType).toBe('PerformanceReviewCredential')
    })

    it('should return fallback config for generic VerifiableCredential', () => {
      const config = credentialDisplayConfigFor(mockGenericCredential)
      expect(config.credentialType).toBe('VerifiableCredential')
    })

    it('should return EmploymentCredential config for EmploymentCredential type', () => {
      const config = credentialDisplayConfigFor(mockEmploymentCredential)
      expect(config.credentialType).toBe('EmploymentCredential')
    })

    it('should return VolunteeringCredential config for volunteer type', () => {
      const config = credentialDisplayConfigFor(mockVolunteerCredential)
      expect(config.credentialType).toBe('VolunteeringCredential')
    })
  })

  describe('credentialItemPropsFor', () => {
    it('should return item props for OpenBadgeCredential', () => {
      const props = credentialItemPropsFor(mockOpenBadgeCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Test Badge')
      expect(props.subtitle).toBe('Test Issuer')
      expect(props.image).toBe('test.png')
    })

    it('should return item props for AchievementCredential', () => {
      const props = credentialItemPropsFor(mockAchievementCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Test Badge')
    })

    it('should return item props for generic credential', () => {
      const props = credentialItemPropsFor(mockGenericCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Credential')
    })

    it('should return item props for recommendation credential', () => {
      const props = credentialItemPropsFor(mockRecommendationCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Recommendation From Someone')
    })

    it('should return item props for performance review credential', () => {
      const props = credentialItemPropsFor(mockPerformanceReviewCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Performance Review: Omar Salah')
    })

    it('should return item props for employment credential', () => {
      const props = credentialItemPropsFor(mockEmploymentCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Employment: Omar @ testing company')
    })

    it('should return item props for volunteer credential', () => {
      const props = credentialItemPropsFor(mockVolunteerCredential)
      expect(props).toBeDefined()
      expect(props.title).toBe('Volunteer: Omar @ Testing Organization')
    })
  })
})
