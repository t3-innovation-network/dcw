import { IVerifiableCredential } from '@digitalcredentials/ssi'

export const bachelorDegree: IVerifiableCredential = {
  type: ['VerifiableCredential', 'OpenBadgeCredential'],
  name: 'Taylor Tuna - Mock Bachelor of Science Degree in Biology',
  issuer: {
    url: 'https://web.mit.edu/',
    type: 'Profile',
    name: 'Massachusetts Institute of Technology',
    image: {
      id: 'https://github.com/digitalcredentials/test-files/assets/206059/01eca9f5-a508-40ac-9dd5-c12d11308894',
      type: 'Image'
    },
    id: 'did:web:digitalcredentials.github.io:vc-test-fixtures:dids:oidf'
  },
  '@context': [
    'https://www.w3.org/2018/credentials/v1',
    'https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.1.json',
    'https://www.w3.org/ns/credentials/status/v1',
    'https://w3id.org/security/suites/ed25519-2020/v1',
    'https://w3id.org/security/data-integrity/v2'
  ],
  credentialSubject: {
    type: ['AchievementSubject'],
    name: 'Taylor Tuna',
    achievement: {
      id: 'urn:uuid:951b475e-b795-43bc-ba8f-a2d01efd2eb1',
      type: ['Achievement'],
      name: 'Mock Bachelor of Science in Biology',
      criteria: {
        type: 'Criteria',
        narrative:
          'In Recognition of proficiency in the general and the special studies and exercises prescribed by said institution for such mock degree given this day under the seal of the Institute at Cambridge in the Commonwealth of Massachusetts'
      },
      description:
        'Massachusetts Institute of Technology Mock Bachelor of Science in Computer Science',
      fieldOfStudy: 'Biology',
      achievementType: 'BachelorDegree'
    }
  },
  id: 'urn:uuid:677fe54fcacf98774d482bcc',
  credentialStatus: {
    id: 'https://digitalcredentials.github.io/vc-test-fixtures/statusLists/didkey-ed25519Signature2020/e5WK8CbZ1GjycuPombrj#7',
    type: 'BitstringStatusListEntry',
    statusPurpose: 'revocation',
    statusListCredential:
      'https://digitalcredentials.github.io/vc-test-fixtures/statusLists/didkey-ed25519Signature2020/e5WK8CbZ1GjycuPombrj',
    statusListIndex: '7'
  },
  issuanceDate: '2025-01-09T15:06:31Z',
  proof: {
    type: 'DataIntegrityProof',
    created: '2025-05-08T17:45:32Z',
    verificationMethod:
      'did:web:digitalcredentials.github.io:vc-test-fixtures:dids:oidf#z6MkjXe1vZvPRqFuc9nRBtZ3e1Y9XKDFSbjFAfzLfW2bD6cZ',
    cryptosuite: 'eddsa-rdfc-2022',
    proofPurpose: 'assertionMethod',
    proofValue:
      'z4tkb4J2hB1omQuJ1FK5SPutKaYQRsWE87hWZjh6NNEnpUYtKmJUe3BjhgpdstWnvMDkxayCxmB441K18zDQNBKpS'
  }
}
